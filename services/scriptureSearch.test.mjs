import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  bundledBiblePath,
  chapterVerses,
  chooseVerseText,
  indexChapters,
  loadBundledIndex,
  parseSearchMentions,
  resolveTopicSearch,
  verseFromChapter,
} from "./scriptureSearch.mjs";

const JOHN_316 = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
const JOHN_317 = "For God sent not his Son into the world to condemn the world; but that the world through him might be saved.";
const JOHN_318 = "He that believeth on him is not condemned: but he that believeth not is condemned already, because he hath not believed in the name of the only begotten Son of God.";
const JOHN_319 = "And this is the condemnation, that light is come into the world, and men loved darkness rather than light, because their deeds were evil.";
const JOHN_320 = "For every one that doeth evil hateth the light, neither cometh to the light, lest his deeds should be reproved.";
const JOHN_321 = "But he that doeth truth cometh to the light, that his deeds may be made manifest, that they are wrought in God.";
const JOHN_336 = "He that believeth on the Son hath everlasting life: and he that believeth not the Son shall not see life; but the wrath of God abideth on him.";
const PSALM_23_1 = "The LORD is my shepherd; I shall not want.";
const SONG_1_1 = "The song of songs, which is Solomon\u2019s.";
const COR_13_4 = "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,";
const COR_13_5 = "Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil;";
const ROMANS_8_28 = "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.";
const NIV_JOHN_316 = "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.";

const index = indexChapters([
  {
    book: "John",
    chapter: "3",
    verses: [
      { number: 16, text: JOHN_316 },
      { number: 17, text: JOHN_317 },
      { number: 18, text: JOHN_318 },
      { number: 19, text: JOHN_319 },
      { number: 20, text: JOHN_320 },
      { number: 21, text: JOHN_321 },
      { number: 36, text: JOHN_336 },
    ],
  },
  { book: "Psalms", chapter: "23", verses: [{ number: 1, text: PSALM_23_1 }] },
  { book: "Song of Solomon", chapter: "1", verses: [{ number: 1, text: SONG_1_1 }] },
  {
    book: "1 Corinthians",
    chapter: "13",
    verses: [
      { number: 4, text: COR_13_4 },
      { number: 5, text: COR_13_5 },
    ],
  },
  { book: "Romans", chapter: "8", verses: [{ number: 28, text: ROMANS_8_28 }] },
]);

const lookup = (book, chapter, verse) => verseFromChapter(chapterVerses(index, book, chapter), verse);

function aiReply(lines) {
  return lines.join("\n");
}

test("a valid reference returns the stored verse", async () => {
  const result = await resolveTopicSearch(aiReply([
    "REF: John 3:16",
    `TEXT: ${NIV_JOHN_316}`,
  ]), lookup);
  assert.equal(result.verses.length, 1);
  assert.deepEqual(result.verses[0], {
    book: "John",
    chapter: "3",
    verse: "16",
    text: JOHN_316,
  });
});

test("an invalid reference is dropped and its model text is not shown", async () => {
  const invented = "This ninety-ninth verse was written by the model and is not Scripture.";
  const result = await resolveTopicSearch(aiReply([
    "REF: John 3:16",
    `TEXT: ${JOHN_316}`,
    "REF: John 3:99",
    `TEXT: ${invented}`,
    "REF: Hezekiah 1:1",
    "TEXT: Another invented book.",
  ]), lookup);
  assert.deepEqual(result.verses.map((verse) => `${verse.book} ${verse.chapter}:${verse.verse}`), ["John 3:16"]);
  assert.equal(JSON.stringify(result).includes(invented), false);
  assert.equal(JSON.stringify(result).includes("invented book"), false);
  assert.equal(result.commentary, null);
});

test("ranges keep stored verses and drop numbers the chapter does not contain", async () => {
  const hyphen = await resolveTopicSearch("REF: John 3:16-17", lookup);
  assert.deepEqual(hyphen.verses.map((verse) => verse.verse), ["16", "17"]);
  assert.equal(hyphen.verses[0].text, JOHN_316);
  assert.equal(hyphen.verses[1].text, JOHN_317);

  const enDash = await resolveTopicSearch("REF: John 3:16\u201317", lookup);
  assert.deepEqual(enDash.verses.map((verse) => verse.text), [JOHN_316, JOHN_317]);

  const comma = await resolveTopicSearch("1 Corinthians 13:4, 5", lookup);
  assert.deepEqual(comma.verses.map((verse) => `${verse.book} ${verse.chapter}:${verse.verse}`), [
    "1 Corinthians 13:4",
    "1 Corinthians 13:5",
  ]);

  const pastTheEnd = await resolveTopicSearch(`REF: John 3:36-99\nTEXT: ${NIV_JOHN_316}`, lookup);
  assert.deepEqual(pastTheEnd.verses.map((verse) => verse.verse), ["36"]);
  assert.equal(pastTheEnd.verses[0].text, JOHN_336);
  assert.equal(JSON.stringify(pastTheEnd).includes("one and only"), false);

  const capped = await resolveTopicSearch("John 3:16-21", lookup);
  assert.deepEqual(capped.verses.map((verse) => verse.verse), ["16", "17", "18", "19", "20"]);
});

test("book-name variants resolve to the stored book", async () => {
  const cases = [
    ["Psalm 23:1", "Psalms", "23", "1", PSALM_23_1],
    ["Psalms 23:1", "Psalms", "23", "1", PSALM_23_1],
    ["Ps. 23:1", "Psalms", "23", "1", PSALM_23_1],
    ["Song of Songs 1:1", "Song of Solomon", "1", "1", SONG_1_1],
    ["1 Cor 13:4", "1 Corinthians", "13", "4", COR_13_4],
    ["1 Cor. 13:4", "1 Corinthians", "13", "4", COR_13_4],
    ["I Corinthians 13:4", "1 Corinthians", "13", "4", COR_13_4],
    ["1st Corinthians 13:4", "1 Corinthians", "13", "4", COR_13_4],
    ["Jn 3:16", "John", "3", "16", JOHN_316],
  ];
  for (const [ref, book, chapter, verse, text] of cases) {
    const result = await resolveTopicSearch(`REF: ${ref}\nTEXT: not the stored wording`, lookup);
    assert.equal(result.verses.length, 1, ref);
    assert.equal(result.verses[0].book, book, ref);
    assert.equal(result.verses[0].chapter, chapter, ref);
    assert.equal(result.verses[0].verse, verse, ref);
    assert.equal(result.verses[0].text, text, ref);
    assert.equal(result.verses[0].text.includes("not the stored wording"), false, ref);
  }

  const repeated = await resolveTopicSearch("Psalm 23:1\nPsalms 23:1", lookup);
  assert.equal(repeated.verses.length, 1);

  assert.deepEqual(parseSearchMentions("I know John 3:16"), [{ book: "John", chapter: "3", verses: [16] }]);
  assert.deepEqual(parseSearchMentions("I John 1:1"), [{ book: "1 John", chapter: "1", verses: [1] }]);
  assert.deepEqual(parseSearchMentions("this is 3:16 in the text"), []);
});

test("stored wording wins when the model writes a different verse", async () => {
  const result = await resolveTopicSearch(aiReply([
    "REF: Romans 8:28",
    `TEXT: ${NIV_JOHN_316}`,
    "COMMENTARY: \"For God so loved the world that he gave his one and only Son.\" The topic is love, in the helper's own words.",
  ]), lookup);
  assert.equal(result.verses.length, 1);
  assert.equal(result.verses[0].text, ROMANS_8_28);
  assert.equal(JSON.stringify(result.verses).includes("one and only"), false);
  assert.equal(result.commentary, "The topic is love, in the helper's own words.");
  assert.equal(result.commentary.includes("one and only"), false);
});

test("nothing valid becomes an empty result rather than a guess", async () => {
  const result = await resolveTopicSearch(aiReply([
    "REF: John 3:99",
    "TEXT: A guess should not be displayed.",
    "COMMENTARY: No stored verse was found.",
  ]), lookup);
  assert.deepEqual(result.verses, []);
  assert.equal(JSON.stringify(result.verses).includes("guess"), false);
  assert.equal(result.commentary, "No stored verse was found.");
});

test("the checked-in KJV file supplies Genesis and rejects a missing verse", async () => {
  const chapters = JSON.parse(readFileSync(new URL("../public/bible/kjv.json", import.meta.url), "utf8"));
  const storedIndex = indexChapters(chapters);
  const storedLookup = (book, chapter, verse) => verseFromChapter(chapterVerses(storedIndex, book, chapter), verse);
  const storedText = storedLookup("Genesis", "1", 1);
  assert.match(storedText, /heaven and the earth/);

  const result = await resolveTopicSearch(aiReply([
    "REF: Genesis 1:1",
    "TEXT: In the beginning God created the universe.",
    "REF: Genesis 1:99",
    "TEXT: This verse number is not in Genesis 1.",
  ]), storedLookup);
  assert.equal(result.verses.length, 1);
  assert.equal(result.verses[0].text, storedText);
  assert.equal(result.verses[0].text.includes("universe"), false);
  assert.equal(JSON.stringify(result).includes("not in Genesis"), false);
});

test("a stored chapter wins over a different fetched chapter, including a made-up verse", () => {
  const stored = [{ number: 16, text: JOHN_316 }];
  const fetched = [
    { number: 16, text: NIV_JOHN_316 },
    { number: 99, text: "Invented by another source." },
  ];
  assert.equal(chooseVerseText(stored, fetched, 16), JOHN_316);
  assert.equal(chooseVerseText(stored, fetched, 99), null);
  assert.equal(chooseVerseText(null, [{ number: 16, text: JOHN_316 }], 16), JOHN_316);
  assert.equal(chooseVerseText(null, [{ number: 0, text: "Chapter unavailable.", isNotice: true }], 16), null);
  assert.equal(chooseVerseText([], fetched, 16), null);
});

test("ESV does not read the KJV file, and HTML is not Bible text", async () => {
  assert.equal(bundledBiblePath("KJV"), "/bible/kjv.json");
  assert.equal(bundledBiblePath("WEB"), "/bible/web.json");
  assert.equal(bundledBiblePath("ESV"), null);
  let called = false;
  const esv = await loadBundledIndex("ESV", async () => {
    called = true;
    throw new Error("should not fetch");
  });
  assert.equal(called, false);
  assert.equal(esv.size, 0);

  const html = await loadBundledIndex("WEB", async () => ({
    ok: true,
    headers: { get: () => "text/html; charset=utf-8" },
    json: async () => [{ book: "John", chapter: "3", verses: [{ number: 16, text: NIV_JOHN_316 }] }],
  }));
  assert.equal(html.size, 0);
});
