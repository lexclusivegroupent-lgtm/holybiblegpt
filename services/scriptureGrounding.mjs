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
  { terms: ["love"], refs: ["John 3:16", "1 John 4:19", "Romans 5:8"] },
  { terms: ["faith", "believe"], refs: ["Hebrews 11:1", "Ephesians 2:8", "Romans 10:9"] },
  { terms: ["pray", "prayer"], refs: ["Philippians 4:6", "Matthew 6:9", "1 Thessalonians 5:17"] },
  { terms: ["salvation", "saved", "gospel"], refs: ["Ephesians 2:8", "Romans 10:9", "John 3:16"] },
  { terms: ["forgive", "forgiveness"], refs: ["1 John 1:9", "Ephesians 4:32", "Matthew 6:14"] },
  { terms: ["hope"], refs: ["Romans 15:13", "Jeremiah 29:11", "Hebrews 6:19"] },
  { terms: ["grace"], refs: ["Ephesians 2:8", "Romans 5:8", "2 Corinthians 12:9"] },
];

const MAX_VERSES = 8;

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
  const lower = message.toLowerCase();
  for (const topic of TOPIC_PASSAGES) {
    if (topic.terms.some((term) => new RegExp(`\\b${term}\\b`, "i").test(lower))) {
      return topic.refs.map(parseOne).filter(Boolean);
    }
  }
  return null;
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
    `If these lines do not establish the claim, say: ${CANNOT_ESTABLISH}`,
    "Do not invent Hebrew or Greek words, transliterations, Strong's numbers, definitions, or historical sources.",
    "",
    lines.join("\n\n"),
  ].join("\n");
}
