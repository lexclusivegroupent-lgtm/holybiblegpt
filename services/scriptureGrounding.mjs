// Plans which public-domain verses to retrieve before the model answers,
// and writes the instruction that keeps a quotation separate from an explanation.
// Verse wording is never stored here. Callers fetch the text and pass it in.

export const CANNOT_ESTABLISH = "I cannot establish that from Scripture.";

export const BOOK_NAMES = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const BOOK_PATTERN = BOOK_NAMES
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/\s+/g, "\\s+"))
  .join("|");

const REF_PATTERN = new RegExp(
  `\\b(${BOOK_PATTERN})\\s+(\\d+)(?::(\\d+))?(?:\\s*[\\u2013-]\\s*(\\d+))?`,
  "gi"
);

// References only. The verse text is fetched from KJV or WEB at answer time.
const TOPIC_PASSAGES = [
  { terms: ["fear", "afraid", "anxiety", "worry", "anxious"], refs: ["Isaiah 41:10", "Philippians 4:6", "Psalm 56:3"] },
  { match: "fasting", terms: ["fasting", "fasted", "fastings"], refs: ["Matthew 6:16-18", "Isaiah 58:6", "Matthew 17:21", "Joel 2:12"] },
  { terms: ["love"], refs: ["John 3:16", "1 John 4:19", "Romans 5:8"] },
  { terms: ["faith", "believe"], refs: ["Hebrews 11:1", "Ephesians 2:8", "Romans 10:9"] },
  { terms: ["pray", "prayer"], refs: ["Philippians 4:6", "Matthew 6:9", "1 Thessalonians 5:17"] },
  { terms: ["salvation", "saved", "gospel"], refs: ["Ephesians 2:8", "Romans 10:9", "John 3:16"] },
  { terms: ["forgive", "forgiveness"], refs: ["1 John 1:9", "Ephesians 4:32", "Matthew 6:14"] },
  { terms: ["hope"], refs: ["Romans 15:13", "Jeremiah 29:11", "Hebrews 6:19"] },
  { terms: ["grace"], refs: ["Ephesians 2:8", "Romans 5:8", "2 Corinthians 12:9"] },
  { terms: ["peace"], refs: ["John 14:27", "Philippians 4:7", "Isaiah 26:3"] },
  { terms: ["anger", "angry", "wrath"], refs: ["Ephesians 4:26", "James 1:19", "Proverbs 15:1"] },
  { terms: ["temptation", "tempted"], refs: ["1 Corinthians 10:13", "Matthew 26:41", "James 1:12"] },
  { terms: ["humility", "humble"], refs: ["Philippians 2:3", "James 4:6", "Micah 6:8"] },
  { terms: ["patience", "patient"], refs: ["Romans 12:12", "James 1:3", "Galatians 5:22"] },
  { terms: ["comfort", "comforted"], refs: ["2 Corinthians 1:3", "Psalm 23:4", "Matthew 5:4"] },
  { terms: ["wisdom", "wise"], refs: ["James 1:5", "Proverbs 9:10", "Proverbs 3:5"] },
  { terms: ["thanks", "thankful", "thanksgiving"], refs: ["1 Thessalonians 5:18", "Psalm 100:4"] },
  { terms: ["pride", "proud"], refs: ["Proverbs 16:18", "James 4:6"] },
  { terms: ["rest", "weary"], refs: ["Matthew 11:28", "Psalm 23:2"] },
  { terms: ["healing", "healed"], refs: ["James 5:14", "Psalm 103:3", "Isaiah 53:5"] },
  { terms: ["suffering", "trial", "trials", "tribulation"], refs: ["Romans 5:3", "James 1:2", "2 Corinthians 4:17"] },
  { terms: ["lonely", "alone"], refs: ["Deuteronomy 31:6", "Hebrews 13:5", "Psalm 23:4"] },
  { terms: ["doubt", "doubting", "unbelief"], refs: ["Mark 9:24", "James 1:6", "John 20:27"] },
  { terms: ["repent", "repentance"], refs: ["Acts 3:19", "Luke 13:3", "2 Peter 3:9"] },
];

const MAX_VERSES = 8;
const MAX_TOPIC_REFS = 6;
const MAX_KEYWORD_VERSES = 5;

// Short, ordinary words are never used to search the stored Bible.
const STOPWORDS = new Set([
  "about", "after", "again", "against", "almost", "along", "also", "always",
  "another", "answer", "anything", "around", "because", "before", "being",
  "bible", "chapter", "concern", "could", "doing", "during", "every",
  "everything", "explain", "feels", "feeling", "found", "going", "happen",
  "happening", "hello", "itself", "keep", "keeps", "keeping", "meaning",
  "means", "might", "nothing", "other", "passage", "passages", "please",
  "question", "really", "related", "saying", "scripture", "should",
  "something", "still", "thank", "thanks", "their", "there", "these",
  "thing", "things", "think", "those", "today", "tomorrow", "tonight",
  "under", "verse", "verses", "want", "wants", "where", "which", "while",
  "would", "your", "yourself",
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termInText(term, text) {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text || "");
}

// "fast" must not match "hold fast", "stand fast", or "fasten".
export function mentionsFasting(text) {
  const stripped = String(text || "").toLowerCase()
    .replace(/\b(?:hold|held|holding|stand|stood|standing|stedfast|steadfast)\s+fast(?:s|ed|ing)?\b/g, " ")
    .replace(/\bfasten(?:ed|ing|s)?\b/g, " ");
  return /\bfast(?:s|ed|ing|ings|est)?\b/.test(stripped);
}

function topicMatches(topic, lower) {
  if (topic.match === "fasting") return mentionsFasting(lower);
  return (topic.terms || []).some((term) => termInText(term, lower));
}

function uniqueItems(items, limit) {
  const found = [];
  const seen = new Set();
  for (const item of items) {
    if (!item) continue;
    const key = `${item.book} ${item.chapter}:${item.start}-${item.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(item);
    if (found.length >= limit) break;
  }
  return found;
}

export function isRefusalOrFallback(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.includes(CANNOT_ESTABLISH);
}

export function extractSearchTerms(message) {
  const words = String(message || "").toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
  const seen = new Set();
  const terms = [];
  for (const word of words) {
    if (word.length < 5 || STOPWORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    terms.push(word);
  }
  return terms;
}

// Fallback when no curated topic matched. Only exact words from the stored Bible
// are returned, so the model still cannot quote from memory.
const STUDY_CUE = /\b(?:bible|scripture|scriptures|kjv|verse|verses|passage|passages|god|lord|jesus|christ|gospel|psalm|psalms)\b/i;

export function keywordRetrieval(message, index, limit = MAX_KEYWORD_VERSES) {
  // Only search the stored Bible when the reader is clearly asking a study question.
  // Ordinary questions such as the weather can share a word with a verse and must not retrieve one.
  if (!STUDY_CUE.test(message || "")) return [];
  const terms = extractSearchTerms(message);
  if (!terms.length || !index || typeof index.entries !== "function") return [];

  const scored = [];
  for (const [key, verses] of index.entries()) {
    if (!key || !Array.isArray(verses)) continue;
    const split = String(key).split("|");
    const book = split[0];
    const chapter = split[1];
    if (!book || !chapter) continue;
    for (const verse of verses) {
      if (!verse || verse.isNotice || typeof verse.text !== "string") continue;
      const number = Number(verse.number);
      if (!Number.isInteger(number) || number < 1) continue;
      const hits = terms.filter((term) => termInText(term, verse.text));
      if (!hits.length) continue;
      scored.push({
        book,
        chapter: String(chapter),
        start: number,
        end: number,
        capped: false,
        score: hits.length,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.book.localeCompare(b.book) || Number(a.chapter) - Number(b.chapter) || a.start - b.start);

  const picked = [];
  const seenVerse = new Set();
  const seenChapter = new Set();
  const take = (requireNewChapter) => {
    for (const item of scored) {
      if (picked.length >= limit) return;
      const verseKey = `${item.book}|${item.chapter}|${item.start}`;
      if (seenVerse.has(verseKey)) continue;
      const chapterKey = `${item.book}|${item.chapter}`;
      if (requireNewChapter && seenChapter.has(chapterKey)) continue;
      seenVerse.add(verseKey);
      seenChapter.add(chapterKey);
      picked.push(item);
    }
  };
  take(true);
  if (picked.length < limit) take(false);
  return picked.map(({ book, chapter, start, end, capped }) => ({ book, chapter, start, end, capped }));
}

export const KEYWORD_REASON = "The question contained words found in these stored verses. They are not an exhaustive list, and they are not a statement that Scripture says nothing else.";

export function canonicalBook(name) {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (/^psalm$/i.test(cleaned)) return "Psalms";
  const found = BOOK_NAMES.find((book) => book.toLowerCase() === cleaned.toLowerCase());
  return found && found !== "Psalm" ? found : cleaned;
}

function parseOne(ref) {
  REF_PATTERN.lastIndex = 0;
  const match = REF_PATTERN.exec(ref.trim());
  if (!match) return null;
  return toItem(match);
}

function toItem(match) {
  const book = canonicalBook(match[1]);
  const chapter = match[2];
  const start = match[3] ? parseInt(match[3], 10) : 1;
  const requestedEnd = match[4] ? parseInt(match[4], 10) : (match[3] ? start : Math.min(start + MAX_VERSES - 1, start + 7));
  const end = Math.max(start, requestedEnd);
  const cappedEnd = Math.min(end, start + MAX_VERSES - 1);
  return {
    book,
    chapter,
    start,
    end: cappedEnd,
    capped: cappedEnd !== end || !match[3],
  };
}

export function parseReferences(message) {
  const found = [];
  const seen = new Set();
  REF_PATTERN.lastIndex = 0;
  for (const match of message.matchAll(REF_PATTERN)) {
    const item = toItem(match);
    const key = `${item.book} ${item.chapter}:${item.start}-${item.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(item);
    if (found.length >= 4) break;
  }
  return found;
}

function matchTopic(message) {
  const lower = (message || "").toLowerCase();
  const items = [];
  for (const topic of TOPIC_PASSAGES) {
    if (!topicMatches(topic, lower)) continue;
    for (const ref of topic.refs) items.push(parseOne(ref));
  }
  const unique = uniqueItems(items, MAX_TOPIC_REFS);
  return unique.length ? unique : null;
}

export function parseReadingContext(readingContext) {
  if (!readingContext) return null;
  const match = readingContext.trim().match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)$/);
  if (!match) return null;
  return {
    book: canonicalBook(match[1]),
    chapter: match[2],
    start: 1,
    end: MAX_VERSES,
    capped: true,
  };
}

export function planRetrieval(message, readingContext) {
  const direct = parseReferences(message || "");
  if (direct.length) {
    return {
      reason: "The reader named these references. Quote only the verses that were actually retrieved.",
      items: direct,
    };
  }
  const topic = matchTopic(message || "");
  if (topic?.length) {
    return {
      reason: "The question mentioned a topic, so these passages were retrieved. They are not an exhaustive list, and they are not a statement that Scripture says nothing else.",
      items: topic,
    };
  }
  const openChapter = parseReadingContext(readingContext);
  if (openChapter) {
    return {
      reason: "The reader has this chapter open. Only the verses below were retrieved. Do not quote any verse that is not in the list.",
      items: [openChapter],
    };
  }
  return {
    reason: "No passage text was retrieved.",
    items: [],
  };
}

export function translationGuidance(translation) {
  if (translation === "KJV") {
    return "The reader is using the King James Version. Quote the retrieved KJV text exactly. Do not modernize thee, thou, saith, or hath. Label every quotation (KJV).";
  }
  if (translation === "WEB") {
    return "The reader is using the World English Bible. Quote the retrieved WEB text exactly. Do not label it ESV or KJV. Label every quotation (WEB).";
  }
  return "The English Standard Version is not offered on this site. Do not quote ESV wording from memory, and do not label KJV or WEB text as ESV.";
}

export function formatRetrievedBlock(translation, lines, reason) {
  const guidance = translationGuidance(translation);
  if (!lines.length) {
    return [
      "RETRIEVED SCRIPTURE: none.",
      reason,
      guidance,
      `Do not invent a quotation. Say: ${CANNOT_ESTABLISH}`,
      "You may ask which passage to open. Keep your own words out of quotation marks, and do not present them as Scripture.",
    ].join("\n");
  }
  return [
    `RETRIEVED SCRIPTURE (${translation})`,
    reason,
    guidance,
    "Put retrieved quotations only in a SCRIPTURE section, copied exactly and labeled with the reference and translation.",
    "Put your own words only in an EXPLANATION section, outside quotation marks.",
    "Do not present an explanation, a paraphrase, or one tradition's opinion as the words of the verse.",
    "Teach from these retrieved lines. Do not refuse merely because they do not repeat the reader's exact wording or personal experience.",
    `If the reader asks you to confirm a specific wording, fact, name, or source that these lines do not contain, say: ${CANNOT_ESTABLISH}`,
    "Do not invent Hebrew or Greek words, transliterations, Strong's numbers, definitions, or historical sources.",
    "",
    lines.join("\n\n"),
  ].join("\n");
}
