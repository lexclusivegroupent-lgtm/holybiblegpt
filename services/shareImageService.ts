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
