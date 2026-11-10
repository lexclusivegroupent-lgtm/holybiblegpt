// Fails if a hardcoded public-domain quotation does not match the checked KJV text.
// The expected strings below were compared with bible-api.com?translation=kjv on 2026-11-10.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { CITED_VERSES } from "../data/citedVerses.mjs";
import { VERSE_OF_THE_DAY } from "../data/verseOfTheDay.mjs";

const LOCKED = {
  "John 3:16": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  "Philippians 4:7": "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.",
  "Philippians 4:13": "I can do all things through Christ which strengtheneth me.",
  "Joshua 1:9": "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
  "Romans 8:28": "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
  "Romans 8:38": "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come,",
  "Ephesians 2:8": "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:",
  "Joshua 10:13": "And the sun stood still, and the moon stayed, until the people had avenged themselves upon their enemies. Is not this written in the book of Jasher? So the sun stood still in the midst of heaven, and hasted not to go down about a whole day.",
  "Numbers 21:14": "Wherefore it is said in the book of the wars of the LORD, What he did in the Red sea, and in the brooks of Arnon,",
  "1 Chronicles 29:29": "Now the acts of David the king, first and last, behold, they are written in the book of Samuel the seer, and in the book of Nathan the prophet, and in the book of Gad the seer,",
  "1 Kings 11:41": "And the rest of the acts of Solomon, and all that he did, and his wisdom, are they not written in the book of the acts of Solomon?",
};

test("every verse of the day and cited quotation is a complete checked KJV verse", () => {
  assert.equal(VERSE_OF_THE_DAY.length, 31);
  const byRef = Object.fromEntries(VERSE_OF_THE_DAY.map((verse) => [verse.ref, verse.text]));
  for (const verse of VERSE_OF_THE_DAY) {
    assert.equal(verse.text.includes("…"), false, `${verse.ref} is truncated`);
    assert.equal(verse.text.includes("..."), false, `${verse.ref} is truncated`);
    assert.ok(verse.text.length > 20, verse.ref);
  }
  for (const [ref, text] of Object.entries(LOCKED)) {
    const actual = byRef[ref] ?? CITED_VERSES[ref];
    assert.equal(actual, text, ref);
  }
  const joined = [
    ...VERSE_OF_THE_DAY.map((verse) => verse.text),
    ...Object.values(CITED_VERSES),
  ].join("\n");
  const hash = createHash("sha256").update(joined).digest("hex");
  assert.equal(hash, "681065d54f3f41c226d1697d08b3cef3512adb295cc83617968446e96fe5bf23");
});
