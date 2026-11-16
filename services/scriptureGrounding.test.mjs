import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CANNOT_ESTABLISH,
  extractSearchTerms,
  formatRetrievedBlock,
  isRefusalOrFallback,
  keywordRetrieval,
  mentionsFasting,
  planRetrieval,
  translationGuidance,
} from "./scriptureGrounding.mjs";
import { indexChapters } from "./scriptureSearch.mjs";

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

test("fasting retrieves Scripture even when no verse is named", () => {
  const questions = [
    "What does the Bible say about fasting?",
    "I keep fasting but feel nothing, what does Scripture say?",
    "Should I fast?",
  ];
  for (const question of questions) {
    const plan = planRetrieval(question);
    assert.ok(plan.items.some((item) => item.book === "Matthew" && item.chapter === "6" && item.start === 16), question);
    assert.ok(plan.items.some((item) => item.book === "Isaiah" && item.chapter === "58" && item.start === 6), question);
    assert.match(plan.reason, /not an exhaustive list/);
  }
  assert.equal(mentionsFasting("hold fast that which is good"), false);
  assert.equal(mentionsFasting("Should I fast?"), true);
});

test("more than one topic can be retrieved together", () => {
  const plan = planRetrieval("What does the Bible say about prayer and fasting?");
  assert.ok(plan.items.some((item) => item.book === "Matthew" && item.chapter === "6" && item.start === 16));
  assert.ok(plan.items.some((item) => item.book === "Philippians" && item.start === 6) || plan.items.some((item) => item.book === "Matthew" && item.chapter === "6" && item.start === 9));
});

test("an unrelated question still retrieves nothing", () => {
  const none = planRetrieval("What is the weather today?");
  assert.equal(none.items.length, 0);
  assert.deepEqual(extractSearchTerms("What is the weather today?"), ["weather"]);
});

test("keyword search finds stored verses for a word not on the curated list", () => {
  const rows = JSON.parse(readFileSync(new URL("../public/bible/kjv.json", import.meta.url), "utf8"));
  const index = indexChapters(rows);
  assert.equal(keywordRetrieval("What is the weather today?", index).length, 0);
  const meek = keywordRetrieval("What does the Bible say about meekness?", index);
  assert.ok(meek.length > 0);
  assert.ok(meek.every((item) => item.book && item.chapter && item.start));
});

test("refusal replies are detected so prayer and share actions can be hidden", () => {
  assert.equal(isRefusalOrFallback('I cannot establish that from Scripture. Would you like to provide a specific passage related to this concern?'), true);
  assert.equal(isRefusalOrFallback('SCRIPTURE\n"Moreover when ye fast..."\n— Matthew 6:16 (KJV)'), false);
});

test("a retrieved block tells the model to teach from the verses it was given", () => {
  const block = formatRetrievedBlock("KJV", ['"Moreover when ye fast, be not, as the hypocrites, of a sad countenance."\n— Matthew 6:16 (KJV)'], "named");
  assert.match(block, /Teach from these retrieved lines/);
  assert.match(block, /Do not refuse merely/);
});

test("the study reply hides pray and share actions on a refusal", () => {
  const bubble = readFileSync(new URL("../components/MessageBubble.tsx", import.meta.url), "utf8");
  const chat = readFileSync(new URL("../components/ChatInterface.tsx", import.meta.url), "utf8");
  assert.match(bubble, /isRefusalOrFallback\(cleanText\)/);
  assert.match(bubble, /Pray about this/);
  assert.match(bubble, /Share as Image/);
  assert.match(chat, /if \(isRefusalOrFallback\(messageText\)\) return;/);
});
