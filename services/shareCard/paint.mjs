// Draws a share card onto a canvas context.
// The brand mark is stroked paths. Text is Crimson Pro and Inter.
// This module never draws emoji and never paints an image.

import { backgroundById } from './backgrounds.mjs';

export const CARD_FOOTER = 'HolyBibleGPT.com';
export const VERSE_FONT = 'Crimson Pro';
export const UI_FONT = 'Inter';

export const FORMATS = {
  story: {
    width: 1080,
    height: 1920,
    padX: 108,
    regionTop: 200,
    regionBottom: 280,
    footerInset: 168,
    maxFont: 86,
    minFont: 30,
    labelSize: 26,
    refSize: 32,
    footerSize: 24,
  },
  square: {
    width: 1080,
    height: 1080,
    padX: 120,
    regionTop: 108,
    regionBottom: 210,
    footerInset: 124,
    maxFont: 64,
    minFont: 26,
    labelSize: 20,
    refSize: 28,
    footerSize: 22,
  },
};

const STUDY_CHAR_LIMIT = 680;

export function curlyQuote(text) {
  let inner = String(text || '').replace(/\s+/g, ' ').trim();
  inner = inner.replace(/^[“"]+/, '').replace(/[”"]+$/, '');
  inner = inner.replace(/"([^"]*)"/g, '“$1”');
  return `“${inner}”`;
}

export function prepareQuote(quote, { truncate = false } = {}) {
  let text = String(quote || '').replace(/\s+/g, ' ').trim();
  if (truncate && text.length > STUDY_CHAR_LIMIT) {
    const sliced = text.slice(0, STUDY_CHAR_LIMIT).replace(/\s+\S*$/, '').trim();
    text = `${sliced}…`;
  }
  return curlyQuote(text);
}

function wrapLines(widthOf, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && widthOf(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function balanceLines(widthOf, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length < 3) return wrapLines(widthOf, text, maxWidth);
  let best = wrapLines(widthOf, text, maxWidth);
  let bestScore = scoreLines(best, widthOf);
  for (let width = maxWidth * 0.96; width >= maxWidth * 0.74; width -= maxWidth * 0.04) {
    const lines = wrapLines(widthOf, text, width);
    const score = scoreLines(lines, widthOf);
    if (score < bestScore) {
      best = lines;
      bestScore = score;
    }
  }
  return best;
}

function scoreLines(lines, widthOf) {
  if (!lines.length) return Number.POSITIVE_INFINITY;
  const widths = lines.map(widthOf);
  const widest = Math.max(...widths);
  const ragged = widths.reduce((sum, width) => sum + (widest - width), 0);
  const last = widths[widths.length - 1];
  const orphan = last < widest * 0.38 ? widest : 0;
  return lines.length * 80 + ragged * 0.15 + orphan;
}

function rgba(hex, alpha) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawMark(ctx, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.25, size * 0.09);
  ctx.lineCap = 'round';
  const cx = x + size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, y + size * 0.08);
  ctx.lineTo(cx, y + size * 0.92);
  ctx.moveTo(x + size * 0.18, y + size * 0.36);
  ctx.lineTo(x + size * 0.82, y + size * 0.36);
  ctx.stroke();
  ctx.restore();
}

function fillTracked(ctx, text, centerX, y, tracking) {
  const chars = [...text];
  if (!chars.length) return;
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * (chars.length - 1);
  let cursor = centerX - total / 2;
  const previous = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i += 1) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + tracking;
  }
  ctx.textAlign = previous;
}

function fitQuote(ctx, quote, maxWidth, budget, format) {
  let size = format.maxFont;
  let fitted = { lines: [quote], lh: Math.round(size * 1.38), size };
  while (size >= format.minFont) {
    ctx.font = `italic ${size}px "${VERSE_FONT}"`;
    const widthOf = (text) => ctx.measureText(text).width;
    const lines = balanceLines(widthOf, quote, maxWidth);
    const lh = Math.round(size * 1.38);
    fitted = { lines, lh, size };
    if (lines.length * lh <= budget) return fitted;
    size -= 2;
  }
  return fitted;
}

/**
 * Paints one card. `format` is "story" (1080×1920) or "square" (1080×1080).
 * Returns the strings it drew so callers can check the card without reading pixels.
 */
export function paintShareCard(ctx, options) {
  const format = FORMATS[options.format] || FORMATS.story;
  const theme = backgroundById(options.backgroundId);
  const width = format.width;
  const height = format.height;
  const quote = prepareQuote(options.quote, { truncate: options.truncate === true });
  const reference = String(options.reference || '').trim();
  const label = String(options.label || '').trim();
  const footer = CARD_FOOTER;

  theme.paint(ctx, width, height);

  const maxWidth = width - format.padX * 2;
  const labelBlock = label ? format.labelSize + Math.round(format.labelSize * 0.95) : 0;
  const refGap = reference ? Math.round(format.refSize * 1.15) : 0;
  const refBlock = reference ? format.refSize + refGap : 0;
  const regionTop = format.regionTop;
  const regionBottom = height - format.regionBottom;
  const quoteBudget = Math.max(format.minFont * 2, regionBottom - regionTop - labelBlock - refBlock);
  const fitted = fitQuote(ctx, quote, maxWidth, quoteBudget, format);
  const textHeight = fitted.lines.length * fitted.lh;
  const blockHeight = labelBlock + textHeight + refBlock;
  const regionHeight = regionBottom - regionTop;
  const blockTop = regionTop + Math.max(0, (regionHeight - blockHeight) / 2);
  const panelPadX = 28;
  const panelPadY = 36;
  ctx.save();
  ctx.fillStyle = rgba(theme.field, theme.veil);
  roundRect(
    ctx,
    format.padX - panelPadX,
    blockTop - panelPadY,
    maxWidth + panelPadX * 2,
    blockHeight + panelPadY * 2,
    40,
  );
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let y = blockTop;

  if (label) {
    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${format.labelSize}px ${UI_FONT}`;
    fillTracked(ctx, label.toUpperCase(), width / 2, y + format.labelSize / 2, format.labelSize * 0.18);
    y += labelBlock;
  }

  ctx.fillStyle = theme.ink;
  ctx.font = `italic ${fitted.size}px "${VERSE_FONT}"`;
  for (let i = 0; i < fitted.lines.length; i += 1) {
    ctx.fillText(fitted.lines[i], width / 2, y + fitted.lh * i + fitted.lh / 2);
  }
  y += textHeight;

  if (reference) {
    const ruleY = y + refGap * 0.38;
    ctx.save();
    ctx.strokeStyle = theme.reference;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1, width / 900);
    ctx.beginPath();
    ctx.moveTo(width / 2 - 26, ruleY);
    ctx.lineTo(width / 2 + 26, ruleY);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = theme.reference;
    ctx.font = `500 ${format.refSize}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(reference, width / 2, y + refGap + format.refSize / 2);
  }

  const footerY = height - format.footerInset;
  ctx.font = `400 ${format.footerSize}px ${UI_FONT}`;
  const footerWidth = ctx.measureText(footer).width;
  const mark = Math.round(format.footerSize * 1.15);
  const gap = Math.round(format.footerSize * 0.45);
  const lockup = mark + gap + footerWidth;
  const lockupX = (width - lockup) / 2;
  const padX = 16;
  const padY = 8;
  ctx.save();
  ctx.fillStyle = rgba(theme.field, 0.92);
  roundRect(ctx, lockupX - padX, footerY - mark / 2 - padY, lockup + padX * 2, mark + padY * 2, mark);
  ctx.fill();
  ctx.restore();
  drawMark(ctx, lockupX, footerY - mark / 2, mark, theme.muted);
  ctx.fillStyle = theme.muted;
  ctx.font = `400 ${format.footerSize}px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(footer, lockupX + mark + gap, footerY);

  return {
    lines: fitted.lines,
    reference,
    label,
    footer,
    format: options.format,
    backgroundId: theme.id,
  };
}
