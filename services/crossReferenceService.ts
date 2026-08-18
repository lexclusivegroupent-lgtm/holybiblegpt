
// Curated cross-reference pairs drawn from classical Bible study resources.
// Keys are "Book Chapter:Verse" — values are ordered by strength of connection.
// Extend by adding new keys; the lookup functions handle the rest.

const CROSS_REFS: Record<string, string[]> = {
  // ── Genesis ──────────────────────────────────────────────────────────────
  "Genesis 1:1":  ["John 1:1", "Hebrews 11:3", "Psalm 33:6", "Colossians 1:16"],
  "Genesis 1:26": ["Genesis 5:1", "Colossians 3:10", "James 3:9"],
  "Genesis 1:27": ["Matthew 19:4", "Psalm 139:14", "Genesis 5:1"],
  "Genesis 3:15": ["Romans 16:20", "Galatians 3:16", "Revelation 12:17"],
  "Genesis 12:3": ["Galatians 3:8", "Acts 3:25", "Matthew 1:1"],
  "Genesis 50:20":["Romans 8:28", "Jeremiah 29:11", "Acts 2:23"],

  // ── Exodus ───────────────────────────────────────────────────────────────
  "Exodus 14:14": ["Psalm 46:10", "Isaiah 30:15", "2 Chronicles 20:17"],
  "Exodus 20:3":  ["Deuteronomy 6:14", "Matthew 6:24", "1 John 5:21"],

  // ── Deuteronomy ──────────────────────────────────────────────────────────
  "Deuteronomy 6:5":  ["Matthew 22:37", "Mark 12:30", "Luke 10:27"],
  "Deuteronomy 31:8": ["Joshua 1:5", "Hebrews 13:5", "Isaiah 41:10"],

  // ── Joshua ───────────────────────────────────────────────────────────────
  "Joshua 1:8":  ["Psalm 1:2", "Psalm 119:97", "2 Timothy 2:15"],
  "Joshua 1:9":  ["Deuteronomy 31:8", "Isaiah 41:10", "Matthew 28:20"],

  // ── Psalms ───────────────────────────────────────────────────────────────
  "Psalm 1:1":    ["Matthew 5:3", "Proverbs 4:14", "Jeremiah 17:7"],
  "Psalm 1:2":    ["Joshua 1:8", "Psalm 119:97", "Romans 12:2"],
  "Psalm 19:1":   ["Romans 1:20", "Job 12:7-9", "Acts 14:17"],
  "Psalm 22:1":   ["Matthew 27:46", "Mark 15:34", "Isaiah 53:3"],
  "Psalm 23:1":   ["John 10:11", "Ezekiel 34:11", "Isaiah 40:11", "Hebrews 13:20"],
  "Psalm 23:4":   ["Isaiah 43:2", "Matthew 28:20", "Romans 8:38-39"],
  "Psalm 23:6":   ["Romans 8:31", "Ephesians 3:20", "Psalm 27:4"],
  "Psalm 27:1":   ["Isaiah 12:2", "Romans 8:31", "Hebrews 13:6"],
  "Psalm 32:5":   ["1 John 1:9", "Proverbs 28:13", "Psalm 51:3"],
  "Psalm 33:6":   ["Genesis 1:1", "John 1:3", "Hebrews 11:3"],
  "Psalm 37:4":   ["Matthew 6:33", "Psalm 20:4", "Philippians 4:6"],
  "Psalm 46:1":   ["Psalm 121:1", "Isaiah 41:10", "Romans 8:31"],
  "Psalm 46:10":  ["Exodus 14:14", "Isaiah 30:15", "Zephaniah 3:17"],
  "Psalm 51:10":  ["Ezekiel 36:26", "2 Corinthians 5:17", "Romans 12:2"],
  "Psalm 51:17":  ["Isaiah 57:15", "Psalm 34:18", "Romans 12:1"],
  "Psalm 91:1":   ["Deuteronomy 33:27", "Matthew 23:37", "Isaiah 26:3"],
  "Psalm 91:11":  ["Matthew 4:6", "Hebrews 1:14", "Psalm 34:7"],
  "Psalm 103:12": ["Isaiah 43:25", "Micah 7:19", "1 John 1:9"],
  "Psalm 119:105":["Proverbs 6:23", "2 Peter 1:19", "Hebrews 4:12"],
  "Psalm 121:1":  ["Psalm 46:1", "Isaiah 26:3", "Deuteronomy 33:27"],
  "Psalm 139:14": ["Genesis 1:27", "Psalm 8:3-5", "Job 10:11"],
  "Psalm 139:16": ["Jeremiah 29:11", "Ephesians 2:10", "Romans 8:29"],

  // ── Proverbs ─────────────────────────────────────────────────────────────
  "Proverbs 3:5":  ["Jeremiah 17:7", "Psalm 37:5", "Isaiah 26:3"],
  "Proverbs 3:6":  ["Isaiah 30:21", "Psalm 25:9", "Romans 8:28"],
  "Proverbs 4:23": ["Matthew 12:34", "Luke 6:45", "Philippians 4:8"],
  "Proverbs 22:6": ["Deuteronomy 6:7", "Ephesians 6:4", "2 Timothy 3:15"],
  "Proverbs 28:13":["1 John 1:9", "Psalm 32:5", "James 5:16"],

  // ── Isaiah ───────────────────────────────────────────────────────────────
  "Isaiah 40:29":  ["2 Corinthians 12:9", "Philippians 4:13", "Isaiah 40:31"],
  "Isaiah 40:31":  ["Psalm 103:5", "Philippians 4:13", "2 Corinthians 12:9"],
  "Isaiah 41:10":  ["Deuteronomy 31:8", "Joshua 1:9", "Matthew 28:20"],
  "Isaiah 43:2":   ["Psalm 23:4", "Daniel 3:17", "Matthew 28:20"],
  "Isaiah 53:5":   ["1 Peter 2:24", "Romans 4:25", "2 Corinthians 5:21"],
  "Isaiah 53:6":   ["Romans 3:23", "1 Peter 2:25", "Ezekiel 34:6"],
  "Isaiah 55:8":   ["Romans 11:33", "Job 38:4", "1 Corinthians 2:16"],

  // ── Jeremiah ─────────────────────────────────────────────────────────────
  "Jeremiah 17:7": ["Proverbs 3:5", "Psalm 37:5", "Isaiah 26:3"],
  "Jeremiah 29:11":["Romans 8:28", "Genesis 50:20", "Ephesians 2:10"],
  "Jeremiah 31:31":["Hebrews 8:8-12", "Luke 22:20", "2 Corinthians 3:6"],

  // ── Matthew ──────────────────────────────────────────────────────────────
  "Matthew 5:3":   ["Luke 6:20", "James 2:5", "Isaiah 57:15"],
  "Matthew 5:16":  ["1 Peter 2:12", "Philippians 2:15", "John 15:8"],
  "Matthew 6:9":   ["Luke 11:2", "Romans 8:15", "Galatians 4:6"],
  "Matthew 6:25":  ["Philippians 4:6", "1 Peter 5:7", "Luke 12:22"],
  "Matthew 6:33":  ["Luke 12:31", "Psalm 37:4", "Romans 14:17"],
  "Matthew 7:7":   ["Luke 11:9", "James 1:5", "John 14:13"],
  "Matthew 11:28": ["John 7:37", "Revelation 22:17", "Isaiah 55:1"],
  "Matthew 16:18": ["Ephesians 2:20", "1 Corinthians 3:11", "Revelation 21:14"],
  "Matthew 22:37": ["Deuteronomy 6:5", "Mark 12:30", "1 John 4:19"],
  "Matthew 22:39": ["Leviticus 19:18", "Romans 13:9", "Galatians 5:14"],
  "Matthew 28:19": ["Mark 16:15", "Luke 24:47", "Acts 1:8"],
  "Matthew 28:20": ["Joshua 1:5", "Hebrews 13:5", "Isaiah 41:10"],

  // ── Mark ─────────────────────────────────────────────────────────────────
  "Mark 12:30":    ["Deuteronomy 6:5", "Matthew 22:37", "Luke 10:27"],

  // ── Luke ─────────────────────────────────────────────────────────────────
  "Luke 1:37":     ["Genesis 18:14", "Job 42:2", "Matthew 19:26"],
  "Luke 15:7":     ["Matthew 18:12-13", "Ezekiel 18:23", "1 Timothy 2:4"],
  "Luke 15:24":    ["2 Corinthians 5:17", "Ephesians 2:1", "Romans 6:11"],

  // ── John ─────────────────────────────────────────────────────────────────
  "John 1:1":      ["Genesis 1:1", "Proverbs 8:22-23", "Colossians 1:17", "Revelation 19:13"],
  "John 1:12":     ["Romans 8:15", "Galatians 3:26", "1 John 3:1"],
  "John 1:14":     ["Philippians 2:7", "1 John 4:2", "Romans 8:3"],
  "John 3:3":      ["1 Peter 1:23", "Titus 3:5", "James 1:18"],
  "John 3:16":     ["Romans 5:8", "1 John 4:9", "John 1:14", "Ephesians 2:4-5"],
  "John 3:17":     ["John 12:47", "Luke 19:10", "1 Timothy 1:15"],
  "John 3:36":     ["John 5:24", "Romans 6:23", "1 John 5:12"],
  "John 5:24":     ["John 3:36", "1 John 3:14", "Romans 8:1"],
  "John 6:35":     ["John 4:14", "John 7:37", "Revelation 22:17"],
  "John 8:12":     ["John 9:5", "Matthew 5:14", "Isaiah 60:1"],
  "John 10:10":    ["John 6:33", "Colossians 2:10", "2 Corinthians 5:17"],
  "John 10:11":    ["Psalm 23:1", "Ezekiel 34:23", "Hebrews 13:20"],
  "John 10:28":    ["Romans 8:38-39", "John 6:39", "Philippians 1:6"],
  "John 11:25":    ["John 6:39-40", "1 Corinthians 15:22", "1 Thessalonians 4:16"],
  "John 13:35":    ["John 15:12", "1 John 4:11", "Romans 13:8"],
  "John 14:1":     ["Philippians 4:6-7", "Matthew 6:25-34", "Isaiah 26:3"],
  "John 14:6":     ["Acts 4:12", "1 Timothy 2:5", "Hebrews 10:19-20"],
  "John 14:15":    ["John 15:10", "1 John 5:3", "Deuteronomy 6:5"],
  "John 14:16":    ["John 16:7", "Acts 2:33", "Romans 8:9"],
  "John 14:27":    ["Philippians 4:7", "Isaiah 26:3", "Colossians 3:15"],
  "John 15:5":     ["Philippians 4:13", "Galatians 2:20", "Colossians 1:27"],
  "John 15:13":    ["Romans 5:8", "1 John 3:16", "John 10:11"],
  "John 16:33":    ["Romans 8:37", "1 John 5:4", "Revelation 12:11"],

  // ── Acts ─────────────────────────────────────────────────────────────────
  "Acts 1:8":      ["Matthew 28:19", "Luke 24:49", "Romans 1:16"],
  "Acts 2:38":     ["Luke 24:47", "Mark 16:16", "Romans 10:9"],
  "Acts 4:12":     ["John 14:6", "1 Timothy 2:5", "Acts 10:43"],

  // ── Romans ───────────────────────────────────────────────────────────────
  "Romans 1:16":   ["1 Corinthians 1:18", "Psalm 119:46", "Acts 1:8"],
  "Romans 1:20":   ["Psalm 19:1", "Job 12:7-9", "Acts 14:17"],
  "Romans 3:23":   ["Isaiah 53:6", "Ecclesiastes 7:20", "1 Kings 8:46"],
  "Romans 3:24":   ["Ephesians 2:8-9", "Titus 3:7", "Galatians 3:24"],
  "Romans 5:1":    ["Colossians 1:20", "Ephesians 2:14", "John 14:27"],
  "Romans 5:8":    ["John 3:16", "1 John 4:10", "John 15:13"],
  "Romans 6:23":   ["Ezekiel 18:4", "James 1:15", "John 3:16"],
  "Romans 8:1":    ["John 5:24", "John 3:18", "Galatians 5:1"],
  "Romans 8:28":   ["Jeremiah 29:11", "Genesis 50:20", "Philippians 1:6"],
  "Romans 8:31":   ["Psalm 118:6", "Isaiah 54:17", "1 John 4:4"],
  "Romans 8:38-39":["John 10:28", "Psalm 23:4", "Matthew 28:20"],
  "Romans 10:9":   ["Acts 2:21", "John 20:28", "1 Corinthians 12:3"],
  "Romans 10:13":  ["Acts 2:21", "Joel 2:32", "John 14:13-14"],
  "Romans 12:1":   ["1 Corinthians 6:20", "Psalm 51:17", "Hebrews 13:15-16"],
  "Romans 12:2":   ["Ephesians 4:23", "Colossians 3:10", "2 Corinthians 3:18"],

  // ── 1 Corinthians ────────────────────────────────────────────────────────
  "1 Corinthians 1:18":  ["Romans 1:16", "1 Corinthians 15:2", "2 Corinthians 2:15"],
  "1 Corinthians 10:13": ["James 1:13", "2 Peter 2:9", "Philippians 4:13"],
  "1 Corinthians 13:4":  ["Romans 12:9-10", "Galatians 5:22", "1 Peter 4:8"],
  "1 Corinthians 13:13": ["Romans 5:5", "Galatians 5:22", "Colossians 3:14"],
  "1 Corinthians 15:3":  ["Isaiah 53:5", "Luke 24:26", "1 Peter 3:18"],
  "1 Corinthians 15:20": ["Matthew 27:53", "Colossians 1:18", "Revelation 1:5"],

  // ── 2 Corinthians ────────────────────────────────────────────────────────
  "2 Corinthians 5:17":  ["Galatians 6:15", "Ezekiel 36:26", "Psalm 51:10"],
  "2 Corinthians 5:21":  ["Isaiah 53:6", "Romans 8:3", "1 Peter 2:24"],
  "2 Corinthians 12:9":  ["Romans 8:26", "Philippians 4:13", "Isaiah 40:29"],

  // ── Galatians ────────────────────────────────────────────────────────────
  "Galatians 2:20":  ["Romans 6:6", "Philippians 1:21", "Colossians 3:3"],
  "Galatians 5:22":  ["Romans 8:23", "Ephesians 5:9", "Colossians 3:12-14"],
  "Galatians 6:9":   ["1 Corinthians 15:58", "Hebrews 12:3", "James 1:4"],

  // ── Ephesians ────────────────────────────────────────────────────────────
  "Ephesians 2:8":   ["Romans 3:24", "Titus 3:5", "Acts 15:11"],
  "Ephesians 2:10":  ["Jeremiah 29:11", "Psalm 139:16", "Romans 8:29"],
  "Ephesians 4:32":  ["Colossians 3:13", "Matthew 6:14", "1 Peter 4:8"],
  "Ephesians 6:11":  ["Romans 13:12", "2 Corinthians 10:4", "1 Peter 5:8"],

  // ── Philippians ──────────────────────────────────────────────────────────
  "Philippians 4:6":  ["Matthew 6:25-34", "1 Peter 5:7", "Psalm 55:22"],
  "Philippians 4:7":  ["John 14:27", "Isaiah 26:3", "Colossians 3:15"],
  "Philippians 4:8":  ["Colossians 3:2", "Romans 12:2", "Psalm 1:2"],
  "Philippians 4:13": ["2 Corinthians 12:9", "Isaiah 40:31", "John 15:5"],

  // ── Colossians ───────────────────────────────────────────────────────────
  "Colossians 1:15": ["John 1:1", "Hebrews 1:3", "2 Corinthians 4:4"],
  "Colossians 3:2":  ["Philippians 4:8", "Romans 8:5", "Matthew 6:33"],

  // ── 1 Thessalonians ──────────────────────────────────────────────────────
  "1 Thessalonians 4:16": ["Matthew 24:31", "Revelation 1:7", "1 Corinthians 15:52"],
  "1 Thessalonians 5:16": ["Romans 12:12", "Philippians 4:4", "Psalm 118:24"],
  "1 Thessalonians 5:17": ["Luke 18:1", "Romans 12:12", "Colossians 4:2"],
  "1 Thessalonians 5:18": ["Ephesians 5:20", "Romans 8:28", "James 1:17"],

  // ── 2 Timothy ────────────────────────────────────────────────────────────
  "2 Timothy 3:16": ["Hebrews 4:12", "Psalm 119:105", "2 Peter 1:20-21"],
  "2 Timothy 4:7":  ["Hebrews 12:1", "1 Corinthians 9:24", "Philippians 3:14"],

  // ── Hebrews ──────────────────────────────────────────────────────────────
  "Hebrews 4:12":   ["Jeremiah 23:29", "Psalm 119:105", "2 Timothy 3:16"],
  "Hebrews 11:1":   ["Romans 8:24", "2 Corinthians 5:7", "Hebrews 11:6"],
  "Hebrews 11:6":   ["Romans 14:23", "Hebrews 11:1", "James 1:6"],
  "Hebrews 12:1":   ["1 Corinthians 9:24", "2 Timothy 4:7", "Philippians 3:14"],
  "Hebrews 13:5":   ["Joshua 1:5", "Matthew 28:20", "Psalm 37:25"],
  "Hebrews 13:8":   ["Malachi 3:6", "Psalm 102:27", "Revelation 1:8"],

  // ── James ────────────────────────────────────────────────────────────────
  "James 1:2":   ["Romans 5:3-4", "1 Peter 1:6-7", "2 Corinthians 4:17"],
  "James 1:5":   ["Proverbs 2:3-6", "Matthew 7:7-8", "1 Kings 3:9"],
  "James 1:22":  ["Matthew 7:21", "Luke 6:46", "Romans 2:13"],
  "James 2:17":  ["Matthew 7:21", "Galatians 5:6", "1 John 2:4"],
  "James 5:16":  ["1 John 1:9", "Proverbs 28:13", "Matthew 18:19"],

  // ── 1 Peter ──────────────────────────────────────────────────────────────
  "1 Peter 1:6-7":["James 1:2-3", "Romans 5:3-4", "2 Corinthians 4:17"],
  "1 Peter 2:24": ["Isaiah 53:5", "2 Corinthians 5:21", "Romans 6:11"],
  "1 Peter 5:7":  ["Psalm 55:22", "Matthew 6:25-34", "Philippians 4:6"],
  "1 Peter 5:8":  ["Ephesians 6:11", "2 Corinthians 10:4", "James 4:7"],

  // ── 1 John ───────────────────────────────────────────────────────────────
  "1 John 1:9":   ["Psalm 32:5", "Proverbs 28:13", "Micah 7:18-19"],
  "1 John 3:16":  ["John 15:13", "Romans 5:8", "Galatians 2:20"],
  "1 John 4:7":   ["John 13:35", "Romans 13:8", "1 Corinthians 13:4"],
  "1 John 4:8":   ["1 John 4:16", "John 3:16", "Romans 5:8"],
  "1 John 4:9":   ["John 3:16", "Romans 5:8", "John 1:14"],
  "1 John 4:19":  ["Romans 5:8", "Deuteronomy 7:8", "Matthew 22:37"],

  // ── Revelation ───────────────────────────────────────────────────────────
  "Revelation 3:20": ["John 14:23", "Song of Solomon 5:2", "Luke 19:5"],
  "Revelation 21:4": ["Isaiah 25:8", "Isaiah 35:10", "Revelation 7:17"],
  "Revelation 22:20":["1 Corinthians 16:22", "Philippians 4:5", "James 5:8"],

  // ── Messianic Prophecy ───────────────────────────────────────────────────
  "Isaiah 7:14":    ["Matthew 1:23", "Luke 1:31", "Isaiah 9:6"],
  "Isaiah 9:6":     ["Luke 2:11", "John 1:1", "Isaiah 7:14"],
  "Isaiah 53:3":    ["Matthew 8:17", "John 1:11", "Psalm 22:6"],
  "Isaiah 53:4":    ["Matthew 8:17", "1 Peter 2:24", "Isaiah 53:5"],
  "Isaiah 53:7":    ["John 1:29", "Acts 8:32-33", "1 Peter 2:23"],
  "Isaiah 53:11":   ["Romans 5:19", "Philippians 3:9", "2 Corinthians 5:21"],
  "Micah 5:2":      ["Matthew 2:1", "John 7:42", "Luke 2:4"],
  "Psalm 110:1":    ["Matthew 22:44", "Acts 2:34-35", "Hebrews 1:13"],
  "Zechariah 9:9":  ["Matthew 21:5", "John 12:15", "Luke 19:38"],
  "Genesis 22:8":   ["John 1:29", "Romans 8:32", "Hebrews 11:17-19"],
  "Psalm 16:10":    ["Acts 2:27", "Acts 13:35", "Luke 24:46"],
  "Psalm 22:16":    ["John 20:25", "Luke 24:39", "Zechariah 12:10"],
  "Zechariah 12:10":["John 19:37", "Revelation 1:7", "Psalm 22:16"],

  // ── Salvation / Gospel Chain ──────────────────────────────────────────────
  "John 1:29":      ["Isaiah 53:7", "Genesis 22:8", "1 Corinthians 5:7"],
  "Acts 16:31":     ["Romans 10:9", "John 3:16", "Acts 4:12"],
  "Titus 3:5":      ["John 3:3-5", "Ephesians 2:8-9", "Romans 8:14"],
  "Romans 10:17":   ["Hebrews 11:6", "Luke 8:21", "John 5:24"],
  "1 John 5:12":    ["John 3:36", "John 6:53", "Colossians 2:10"],

  // ── Repentance ───────────────────────────────────────────────────────────
  "Acts 3:19":      ["Luke 13:3", "Isaiah 55:7", "2 Chronicles 7:14"],
  "Luke 13:3":      ["Acts 3:19", "Ezekiel 18:30", "2 Corinthians 7:10"],
  "2 Chronicles 7:14":["Joel 2:12", "Hosea 6:1", "Acts 3:19"],
  "Joel 2:12":      ["2 Chronicles 7:14", "James 4:8", "Zechariah 1:3"],
  "2 Corinthians 7:10":["Luke 13:3", "Proverbs 28:13", "Acts 3:19"],

  // ── Forgiveness ──────────────────────────────────────────────────────────
  "Psalm 103:3":    ["Colossians 1:14", "Ephesians 1:7", "Micah 7:18"],
  "Colossians 1:14":["Ephesians 1:7", "Romans 3:24", "Acts 10:43"],
  "Matthew 6:14":   ["Mark 11:25", "Ephesians 4:32", "Colossians 3:13"],
  "Micah 7:18":     ["Exodus 34:6-7", "Psalm 103:3", "1 John 1:9"],

  // ── Prayer ───────────────────────────────────────────────────────────────
  "Jeremiah 33:3":  ["Matthew 7:7", "Psalm 50:15", "James 5:16"],
  "1 John 5:14":    ["Matthew 21:22", "Mark 11:24", "John 15:7"],
  "Psalm 145:18":   ["Romans 10:13", "James 4:8", "Hebrews 4:16"],
  "Luke 18:1":      ["1 Thessalonians 5:17", "Colossians 4:2", "Romans 12:12"],
  "Hebrews 4:16":   ["Psalm 145:18", "Ephesians 2:18", "Romans 5:2"],

  // ── Holy Spirit ──────────────────────────────────────────────────────────
  "Galatians 5:16": ["Romans 8:13", "1 Peter 2:11", "Galatians 5:25"],
  "1 Corinthians 3:16":["1 Corinthians 6:19", "2 Corinthians 6:16", "Romans 8:9"],
  "Ephesians 1:13": ["Acts 2:38", "2 Corinthians 1:22", "Ephesians 4:30"],
  "Romans 8:9":     ["John 14:16-17", "1 Corinthians 3:16", "Galatians 4:6"],
  "Romans 8:26":    ["John 14:16", "Zechariah 12:10", "2 Corinthians 12:9"],
  "John 16:13":     ["John 14:26", "1 Corinthians 2:10", "1 John 2:27"],

  // ── Comfort & Suffering ──────────────────────────────────────────────────
  "2 Corinthians 1:3":["Psalm 34:18", "Isaiah 51:12", "Romans 15:4"],
  "Psalm 34:18":    ["Isaiah 61:1", "Psalm 51:17", "2 Corinthians 1:3"],
  "Romans 5:3-4":   ["James 1:2-3", "1 Peter 1:6-7", "2 Corinthians 4:17"],
  "Lamentations 3:22":["Psalm 36:5", "Numbers 23:19", "Romans 8:38-39"],
  "Lamentations 3:23":["Psalm 30:5", "Isaiah 33:2", "Psalm 90:14"],
  "Psalm 34:4":     ["Isaiah 41:10", "Philippians 4:6-7", "Psalm 27:1"],
  "Isaiah 26:3":    ["Philippians 4:7", "John 14:27", "Psalm 119:165"],

  // ── Wisdom ───────────────────────────────────────────────────────────────
  "Proverbs 1:7":   ["Proverbs 9:10", "Psalm 111:10", "Job 28:28"],
  "Proverbs 9:10":  ["Proverbs 1:7", "Psalm 111:10", "Colossians 2:3"],
  "Colossians 2:3": ["Proverbs 2:3-6", "Isaiah 11:2", "1 Corinthians 1:30"],

  // ── Christ's Return ──────────────────────────────────────────────────────
  "John 14:3":      ["Acts 1:11", "1 Thessalonians 4:16-17", "Revelation 22:20"],
  "Acts 1:11":      ["John 14:3", "Matthew 24:30", "Revelation 1:7"],
  "Matthew 24:44":  ["Luke 12:40", "1 Thessalonians 5:2", "Revelation 22:20"],
  "Revelation 22:12":["Matthew 16:27", "Isaiah 40:10", "Luke 14:14"],

  // ── More Psalms ──────────────────────────────────────────────────────────
  "Psalm 8:1":      ["Psalm 19:1", "Romans 1:20", "Isaiah 40:26"],
  "Psalm 8:4":      ["Hebrews 2:6-7", "Job 7:17", "Psalm 144:3"],
  "Psalm 16:11":    ["John 15:11", "Psalm 21:6", "Jude 1:24"],
  "Psalm 27:4":     ["Psalm 23:6", "Philippians 1:23", "Psalm 84:10"],
  "Psalm 34:8":     ["1 Peter 2:3", "Hebrews 6:5", "Psalm 119:103"],
  "Psalm 37:7":     ["Psalm 46:10", "Lamentations 3:26", "Isaiah 30:15"],
  "Psalm 42:1":     ["John 7:37", "Psalm 63:1", "Isaiah 55:1"],
  "Psalm 84:10":    ["Psalm 27:4", "Revelation 21:22", "Psalm 16:11"],
  "Psalm 100:4":    ["Hebrews 13:15", "Ephesians 5:20", "1 Thessalonians 5:18"],
  "Psalm 118:24":   ["1 Thessalonians 5:18", "Philippians 4:4", "Acts 2:24"],
  "Psalm 147:3":    ["Isaiah 61:1", "Psalm 34:18", "Luke 4:18"],

  // ── More Romans ──────────────────────────────────────────────────────────
  "Romans 4:3":     ["Genesis 15:6", "Galatians 3:6", "James 2:23"],
  "Romans 4:25":    ["Isaiah 53:4-5", "1 Corinthians 15:17", "Romans 5:1"],
  "Romans 8:5":     ["Galatians 5:16", "Colossians 3:2", "Philippians 4:8"],
  "Romans 8:17":    ["John 1:12", "Galatians 3:29", "1 Peter 4:13"],
  "Romans 8:34":    ["Hebrews 7:25", "1 John 2:1", "Romans 8:26"],

  // ── More Ephesians ───────────────────────────────────────────────────────
  "Ephesians 1:4":  ["Romans 8:29", "2 Timothy 1:9", "1 Peter 1:2"],
  "Ephesians 1:7":  ["Colossians 1:14", "Hebrews 9:22", "Romans 3:24"],
  "Ephesians 2:4":  ["Romans 5:8", "John 3:16", "1 John 4:9-10"],
  "Ephesians 3:20": ["John 14:12", "1 Corinthians 2:9", "Psalm 37:4"],
  "Ephesians 4:2":  ["Colossians 3:12", "Romans 12:10", "Philippians 2:3"],
  "Ephesians 6:17": ["Hebrews 4:12", "Psalm 119:11", "Isaiah 49:2"],

  // ── More Colossians ──────────────────────────────────────────────────────
  "Colossians 1:16":["John 1:3", "Genesis 1:1", "Hebrews 1:2"],
  "Colossians 3:12":["Ephesians 4:2", "Galatians 5:22", "Romans 12:10"],
  "Colossians 3:16":["Ephesians 5:19", "Psalm 119:11", "James 1:21"],
  "Colossians 3:17":["1 Corinthians 10:31", "Romans 14:8", "Colossians 3:23"],

  // ── Church & Fellowship ──────────────────────────────────────────────────
  "Hebrews 10:25":  ["Acts 2:42", "Matthew 18:20", "1 Corinthians 12:27"],
  "Acts 2:42":      ["Hebrews 10:25", "Colossians 3:16", "1 Corinthians 11:26"],
  "Matthew 18:20":  ["John 14:23", "Hebrews 10:25", "Acts 2:42"],
};

// Look up cross-references for a specific verse
export const getCrossRefs = (
  book: string,
  chapter: string,
  verse?: string | number
): string[] => {
  if (verse !== undefined) {
    return CROSS_REFS[`${book} ${chapter}:${verse}`] ?? [];
  }
  // Chapter-level: union of all verse refs for that chapter (deduped, max 8)
  const prefix = `${book} ${chapter}:`;
  const seen = new Set<string>();
  for (const key of Object.keys(CROSS_REFS)) {
    if (key.startsWith(prefix)) {
      for (const ref of CROSS_REFS[key]) seen.add(ref);
    }
  }
  return [...seen].slice(0, 8);
};

// Parse "Book Chapter:Verse" (including ranges like "Romans 8:38-39")
export const parseRefString = (
  ref: string
): { book: string; chapter: string; verse: string } | null => {
  const m = ref.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+(?:-\d+)?)$/);
  if (!m) return null;
  return { book: m[1].trim(), chapter: m[2], verse: m[3] };
};
