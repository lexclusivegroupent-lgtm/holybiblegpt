// Crimson Pro (Jacques Le Bailly) and Inter (Rasmus Andersson).
// Both are bundled from @fontsource under the SIL Open Font License 1.1.
// Faces are registered before any card is drawn so the canvas does not
// fall back to a generic family.

import crimsonItalic from '@fontsource/crimson-pro/files/crimson-pro-latin-400-italic.woff2';
import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff2';
import interMedium from '@fontsource/inter/files/inter-latin-500-normal.woff2';

let pending: Promise<void> | null = null;

async function loadFaces(): Promise<void> {
  const faces = [
    new FontFace('Crimson Pro', `url(${crimsonItalic})`, { style: 'italic', weight: '400' }),
    new FontFace('Inter', `url(${interRegular})`, { style: 'normal', weight: '400' }),
    new FontFace('Inter', `url(${interMedium})`, { style: 'normal', weight: '500' }),
  ];
  const loaded = await Promise.all(faces.map((face) => face.load()));
  for (const face of loaded) document.fonts.add(face);
  await document.fonts.load('italic 64px "Crimson Pro"');
  await document.fonts.load('500 28px Inter');
  if (!document.fonts.check('italic 64px "Crimson Pro"')) {
    throw new Error('Crimson Pro did not load');
  }
  if (!document.fonts.check('500 28px Inter')) {
    throw new Error('Inter did not load');
  }
}

export function ensureCardFonts(): Promise<void> {
  if (!pending) {
    pending = loadFaces().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
