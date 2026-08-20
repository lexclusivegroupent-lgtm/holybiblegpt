
import { Bookmark, Highlight, HistoryItem, PrayerEntry, AppSettings } from '../types';

const KEYS = {
  BOOKMARKS: 'hbgpt_bookmarks',
  NOTES: 'hbgpt_notes',
  HIGHLIGHTS: 'hbgpt_highlights',
  HISTORY: 'hbgpt_history',
  PROGRESS: 'hbgpt_progress',
  STREAK: 'hbgpt_streak',
  LAST_READ: 'hbgpt_last_read_date',
  PRAYERS: 'hbgpt_prayers',
  SETTINGS: 'hbgpt_settings',
  WARNING_ACCEPTED: 'hbgpt_warning_accepted',
};

export const storage = {
  getBookmarks: (): Bookmark[] => JSON.parse(localStorage.getItem(KEYS.BOOKMARKS) || '[]'),
  addBookmark: (b: Bookmark) => {
    const list = storage.getBookmarks().filter(x => !(x.book === b.book && x.chapter === b.chapter && x.verse === b.verse));
    localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify([b, ...list]));
  },

  getHighlights: (): Highlight[] => JSON.parse(localStorage.getItem(KEYS.HIGHLIGHTS) || '[]'),
  addHighlight: (h: Highlight) => {
    const list = storage.getHighlights().filter(x => !(x.book === h.book && x.chapter === h.chapter && x.verse === h.verse));
    localStorage.setItem(KEYS.HIGHLIGHTS, JSON.stringify([h, ...list]));
  },

  getHistory: (): HistoryItem[] => JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),
  addHistory: (item: HistoryItem) => {
    const list = storage.getHistory().filter(x => !(x.book === item.book && x.chapter === item.chapter));
    localStorage.setItem(KEYS.HISTORY, JSON.stringify([item, ...list].slice(0, 50)));
  },

  getSettings: (): AppSettings => {
    const defaults: AppSettings = {
      fontSize: 18,
      lineHeight: 1.6,
      nightMode: false,
      highContrast: false,
      historicalWarningAccepted: false,
      privacyAccepted: false,
      kidsMode: false
    };
    const stored = localStorage.getItem(KEYS.SETTINGS);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  },
  saveSettings: (s: AppSettings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(s)),

  saveLastRead: (book: string, chapter: string, verse: number) => {
    const settings = storage.getSettings();
    settings.lastRead = { book, chapter, verse, timestamp: Date.now() };
    storage.saveSettings(settings);
  },

  getNotes: (): Record<string, string> => JSON.parse(localStorage.getItem(KEYS.NOTES) || '{}'),
  saveNote: (ref: string, text: string) => {
    const notes = storage.getNotes();
    notes[ref] = text;
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
  },
  deleteNote: (ref: string) => {
    const notes = storage.getNotes();
    delete notes[ref];
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
  },

  getPrayers: (): PrayerEntry[] => JSON.parse(localStorage.getItem(KEYS.PRAYERS) || '[]'),
  savePrayer: (p: PrayerEntry) => {
    const list = storage.getPrayers();
    const index = list.findIndex(x => x.id === p.id);
    if (index > -1) {
      list[index] = p;
    } else {
      list.unshift(p);
    }
    localStorage.setItem(KEYS.PRAYERS, JSON.stringify(list));
  },

  deletePrayer: (id: string) => {
    const list = storage.getPrayers().filter(x => x.id !== id);
    localStorage.setItem(KEYS.PRAYERS, JSON.stringify(list));
  },

  getProgress: (): string[] => JSON.parse(localStorage.getItem(KEYS.PROGRESS) || '[]'),
  getStreak: (): number => {
    const progress = storage.getProgress();
    if (progress.length === 0) return 0;
    const dateSet = new Set(progress);
    const today = new Date();
    const todayStr = today.toLocaleDateString();
    // Start from today if already marked, otherwise from yesterday
    const offset = dateSet.has(todayStr) ? 0 : 1;
    let streak = 0;
    for (let i = offset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (dateSet.has(d.toLocaleDateString())) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },
  isWarningAccepted: (): boolean => localStorage.getItem(KEYS.WARNING_ACCEPTED) === 'true',
  acceptWarning: () => localStorage.setItem(KEYS.WARNING_ACCEPTED, 'true'),
  markDayComplete: (dateStr: string) => {
    const p = storage.getProgress();
    if (!p.includes(dateStr)) localStorage.setItem(KEYS.PROGRESS, JSON.stringify([...p, dateStr]));
  },

};
