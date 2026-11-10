// Loads the committed King James file and extends an open sentence.
// Verse wording is never requested from a model or from the network.

import { buildScripture, completeThought, parseVerseRef, passageFilename } from './completeThought.mjs';

type Scripture = ReturnType<typeof buildScripture>;

let scripturePromise: Promise<Scripture> | null = null;

export function loadStoredKjv(fetchImpl: typeof fetch = fetch): Promise<Scripture> {
  if (!scripturePromise) {
    scripturePromise = fetchImpl('/bible/kjv.json')
      .then((response) => {
        if (!response.ok) throw new Error('Stored King James file missing');
        return response.json();
      })
      .then((chapters) => buildScripture(chapters))
      .catch((error) => {
        scripturePromise = null;
        throw error;
      });
  }
  return scripturePromise;
}

export async function resolveKjvPassage(book: string, chapter: string | number, verse: number) {
  const scripture = await loadStoredKjv();
  return completeThought(scripture, book, chapter, verse);
}

export async function resolveKjvPassageFromRef(ref: string) {
  const parsed = parseVerseRef(ref);
  if (!parsed) return null;
  return resolveKjvPassage(parsed.book, parsed.chapter, parsed.verse);
}

export { passageFilename };
