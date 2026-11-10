import { paintShareCard, FORMATS } from './paint.mjs';
import { backgroundById } from './backgrounds.mjs';
import { ensureCardFonts } from './fonts';

export type ShareFormat = 'story' | 'square';

export interface RenderShareCardOptions {
  quote: string;
  reference: string;
  label?: string;
  backgroundId: string;
  format: ShareFormat;
  truncate?: boolean;
}

export async function renderShareCard(options: RenderShareCardOptions): Promise<string> {
  await ensureCardFonts();
  const format = FORMATS[options.format] || FORMATS.story;
  const canvas = document.createElement('canvas');
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  paintShareCard(ctx, options);
  return canvas.toDataURL('image/png');
}

export function renderSwatch(backgroundId: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  backgroundById(backgroundId).paint(ctx, 72, 96);
  return canvas.toDataURL('image/png');
}

export function downloadCard(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareCardFile(
  dataUrl: string,
  filename: string,
  shareText: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'HolyBibleGPT.com', text: shareText });
        return 'shared';
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return 'cancelled';
      }
    }
  } catch {
    // The file share failed. The download below is the fallback.
  }
  downloadCard(dataUrl, filename);
  return 'downloaded';
}
