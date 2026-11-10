import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CANNOT_ESTABLISH,
  formatRetrievedBlock,
  planRetrieval,
  translationGuidance,
} from "./scriptureGrounding.mjs";

test("a named verse is retrieved and a chapter-only reference is capped", () => {
  const named = planRetrieval("What does John 3:16 mean?");
  assert.equal(named.items.length, 1);
  assert.deepEqual(
    { book: named.items[0].book, chapter: named.items[0].chapter, start: named.items[0].start, end: named.items[0].end },
    { book: "John", chapter: "3", start: 16, end: 16 }
  );

  const range = planRetrieval("Read 1 Corinthians 13:4-5");
  assert.equal(range.items[0].book, "1 Corinthians");
  assert.equal(range.items[0].start, 4);
  assert.equal(range.items[0].end, 5);

  const psalm = planRetrieval("Please open Psalm 23:1");
  assert.equal(psalm.items[0].book, "Psalms");

  const chapter = planRetrieval("Explain Genesis 1");
  assert.equal(chapter.items[0].book, "Genesis");
  assert.equal(chapter.items[0].start, 1);
  assert.equal(chapter.items[0].end, 8);
});

test("a topic retrieves references and an unrelated question retrieves nothing", () => {
  const fear = planRetrieval("How do I deal with fear?");
  assert.ok(fear.items.some((item) => item.book === "Isaiah" && item.start === 10));
  assert.match(fear.reason, /not an exhaustive list/);

  const none = planRetrieval("What is the weather today?");
  assert.equal(none.items.length, 0);

  const open = planRetrieval("What is happening here?", "John 3");
  assert.equal(open.items[0].book, "John");
  assert.equal(open.items[0].chapter, "3");
});

test("an empty retrieval tells the model it cannot establish the claim", () => {
  const block = formatRetrievedBlock("KJV", [], "No passage text was retrieved.");
  assert.match(block, new RegExp(CANNOT_ESTABLISH.replace(/[.]/g, "\\.")));
  assert.match(block, /RETRIEVED SCRIPTURE: none/);
  assert.match(block, /do not present them as Scripture/i);
});

test("a retrieved line is kept apart from explanation", () => {
  const block = formatRetrievedBlock("KJV", ['"In the beginning God created the heaven and the earth."\n— Genesis 1:1 (KJV)'], "named");
  assert.match(block, /SCRIPTURE section/);
  assert.match(block, /EXPLANATION section/);
  assert.match(block, /Genesis 1:1 \(KJV\)/);
  assert.match(block, /Do not invent Hebrew or Greek/);
});

test("WEB is not instructed as if it were ESV", () => {
  assert.match(translationGuidance("WEB"), /World English Bible/);
  assert.match(translationGuidance("WEB"), /Do not label it ESV/);
  assert.match(translationGuidance("ESV"), /not offered/);
  assert.match(translationGuidance("KJV"), /King James Version/);
});

test("the system prompt requires retrieval, separation, and the refusal sentence", () => {
  const prompt = readFileSync(new URL("../constants.ts", import.meta.url), "utf8");
  assert.match(prompt, /I cannot establish that from Scripture/);
  assert.match(prompt, /SCRIPTURE section/);
  assert.match(prompt, /EXPLANATION/);
  assert.match(prompt, /World English Bible/);
  assert.match(prompt, /Do not invent Hebrew or Greek/);
  assert.doesNotMatch(prompt, /ESV: use clear, accurate, word-for-word modern English/);
});
