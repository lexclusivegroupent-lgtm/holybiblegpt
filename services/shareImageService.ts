// Generates branded share-card PNGs (gold-on-black, matches the site's
// visual identity) for verses and AI study answers, and hands the result to
// the Web Share API when available, falling back to a plain download.

export interface ShareCardOptions {
  quote: string;       // main text — a verse, or an AI answer excerpt
  reference: string;   // e.g. "John 3:16 (KJV)" or "Study Companion"
  maxChars?: number;   // truncate long AI answers before drawing
}

const W = 800;
const H = 450;
const SCALE = 2;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

let logoImagePromise: Promise<HTMLImageElement | null> | null = null;

/** Loads the app logo once and caches it for every subsequent share card. */
function loadLogo(): Promise<HTMLImageElement | null> {
  if (!logoImagePromise) {
    logoImagePromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // never block the share card on a missing asset
      img.src = '/icons/android-chrome-192x192.png';
    });
  }
  return logoImagePromise;
}

/** Draws the branded card and returns a PNG data URL. */
export async function generateShareCard({ quote, reference, maxChars = 320 }: ShareCardOptions): Promise<string> {
  let text = quote.trim().replace(/\s+/g, ' ');
  if (text.length > maxChars) text = `${text.slice(0, maxChars).trim()}…`;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#111111');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Gold border
  ctx.strokeStyle = 'rgba(212,175,55,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // Subtle cross watermark
  ctx.fillStyle = 'rgba(212,175,55,0.06)';
  ctx.font = '160px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✝', W / 2, H / 2);

  // Main text, word-wrapped, shrinking the font if it runs too long
  ctx.fillStyle = '#e7e5e4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const maxW = W - 120;

  let fontSize = 22;
  let lines: string[] = [];
  let lh = 36;
  do {
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    lines = wrapLines(ctx, text, maxW);
    lh = Math.round(fontSize * 1.65);
    fontSize -= 1;
  } while (lines.length * lh > H - 160 && fontSize > 13);

  if (lines.length > 0) {
    lines[0] = `“${lines[0]}`;
    lines[lines.length - 1] = `${lines[lines.length - 1]}”`;
  }

  const totalH = lines.length * lh;
  const startY = H / 2 - totalH / 2 + 10;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));

  // Reference / source line
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(`— ${reference}`, W / 2, startY + totalH + 28);

  // Branding — real logo mark + site name, since this card is the thing
  // that actually travels when someone shares it (the main growth surface).
  const logo = await loadLogo();
  const brandText = 'Holy Bible GPT · HolyBibleGPT.com';
  ctx.font = '11px sans-serif';
  const brandTextWidth = ctx.measureText(brandText).width;
  const logoSize = logo ? 18 : 0;
  const gap = logo ? 8 : 0;
  const brandBlockWidth = logoSize + gap + brandTextWidth;
  const brandStartX = W / 2 - brandBlockWidth / 2;
  const brandY = H - 28;

  if (logo) {
    ctx.drawImage(logo, brandStartX, brandY - logoSize / 2 - 7, logoSize, logoSize);
  }
  ctx.fillStyle = 'rgba(212,175,55,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText(brandText, brandStartX + logoSize + gap, brandY);

  return canvas.toDataURL('image/png');
}

export interface StoryCardOptions {
  quote: string;      // the verse text
  reference: string;  // e.g. "Matthew 6:33"
  label?: string;     // small eyebrow label, e.g. "Verse of the Day"
}

const SW = 1080;
const SH = 1920;
// Instagram overlays its own UI (profile chip, music/sticker tray) in a band
// at the very top and the reply bar + tray at the very bottom of a Story.
// Keeping content inside this safe zone means nothing we draw gets covered.
const SAFE_TOP = 260;
const SAFE_BOTTOM = 260;

/**
 * Draws a vertical 1080×1920 (9:16) card sized for Instagram/Facebook/Snap
 * Stories — same gold-on-black branding as generateShareCard, laid out so
 * the verse sits centered inside Instagram's safe zone.
 */
export async function generateStoryCard({ quote, reference, label = 'Verse of the Day' }: StoryCardOptions): Promise<string> {
  const text = quote.trim().replace(/\s+/g, ' ');

  const canvas = document.createElement('canvas');
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext('2d')!;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, SH);
  grad.addColorStop(0, '#111111');
  grad.addColorStop(0.5, '#0a0a0a');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SW, SH);

  // Gold border, inset from the edges but outside the safe zone bands
  ctx.strokeStyle = 'rgba(212,175,55,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, SW - 64, SH - 64);

  // Subtle cross watermark, centered in the safe zone
  const safeCenterY = SAFE_TOP + (SH - SAFE_TOP - SAFE_BOTTOM) / 2;
  ctx.fillStyle = 'rgba(212,175,55,0.07)';
  ctx.font = '340px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✝', SW / 2, safeCenterY);

  // Eyebrow label
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 30px sans-serif';
  ctx.textBaseline = 'alphabetic';
  const labelY = SAFE_TOP + 70;
  ctx.fillText(label.toUpperCase(), SW / 2, labelY);
  // letter-spacing isn't native to canvas — approximate with a manual draw
  ctx.font = 'bold 28px sans-serif';
  const spaced = label.toUpperCase().split('').join('  ');
  ctx.fillText(spaced, SW / 2, labelY);

  // Verse text, word-wrapped, shrinking font to fit the safe zone
  ctx.fillStyle = '#f5f5f4';
  ctx.textAlign = 'center';
  const maxW = SW - 160;
  const zoneTop = labelY + 90;
  const zoneBottom = SH - SAFE_BOTTOM - 140;
  const zoneHeight = zoneBottom - zoneTop;

  let fontSize = 64;
  let lines: string[] = [];
  let lh = 86;
  do {
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    lines = wrapLines(ctx, text, maxW);
    lh = Math.round(fontSize * 1.42);
    fontSize -= 2;
  } while (lines.length * lh > zoneHeight && fontSize > 28);

  if (lines.length > 0) {
    lines[0] = `“${lines[0]}`;
    lines[lines.length - 1] = `${lines[lines.length - 1]}”`;
  }

  const totalH = lines.length * lh;
  const startY = zoneTop + (zoneHeight - totalH) / 2 + fontSize;
  lines.forEach((l, i) => ctx.fillText(l, SW / 2, startY + i * lh));

  // Reference
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 32px Georgia, serif';
  ctx.fillText(`— ${reference}`, SW / 2, startY + totalH + 50);

  // Branding — logo + site name, centered just above the bottom safe zone
  const logo = await loadLogo();
  const brandText = 'Holy Bible GPT · HolyBibleGPT.com';
  ctx.font = '26px sans-serif';
  const brandTextWidth = ctx.measureText(brandText).width;
  const logoSize = logo ? 38 : 0;
  const gap = logo ? 14 : 0;
  const brandBlockWidth = logoSize + gap + brandTextWidth;
  const brandStartX = SW / 2 - brandBlockWidth / 2;
  const brandY = SH - SAFE_BOTTOM - 40;

  if (logo) {
    ctx.drawImage(logo, brandStartX, brandY - logoSize / 2 - 20, logoSize, logoSize);
  }
  ctx.fillStyle = 'rgba(212,175,55,0.65)';
  ctx.textAlign = 'left';
  ctx.fillText(brandText, brandStartX + logoSize + gap, brandY);

  return canvas.toDataURL('image/png');
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: 'image/png' });
}

/**
 * Shares a generated card via the native share sheet when the platform
 * supports sharing image files; otherwise falls back to a direct download.
 */
export async function shareOrDownloadCard(
  dataUrl: string,
  filename: string,
  shareTitle = 'Holy Bible GPT',
  shareText = ''
): Promise<'shared' | 'downloaded'> {
  try {
    const file = await dataUrlToFile(dataUrl, filename);
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: shareTitle, text: shareText });
      return 'shared';
    }
  } catch (err) {
    // User cancelling the share sheet throws AbortError — not a real failure.
    if ((err as any)?.name === 'AbortError') return 'shared';
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
  return 'downloaded';
}
