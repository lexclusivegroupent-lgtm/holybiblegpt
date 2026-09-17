
export enum Role {
  USER = 'user',
  BOT = 'bot'
}

export enum AppMode {
  CHAT = 'chat',
  SIMPLIFY = 'simplify',
  DEEP_STUDY = 'deep_study',
  CROSS_REFERENCE = 'cross_reference',
  WORD_STUDY = 'word_study',
  APPLY = 'apply',
  CONTEXT = 'context',
  DAILY_PLAN = 'daily_plan',
  KIDS = 'kids',
  PRAYER_HELP = 'prayer_help',
  THEOLOGIAN = 'theologian',
  CHAPTER_OVERVIEW = 'chapter_overview'
}

export enum Translation {
  KJV = 'KJV',
  ESV = 'ESV',
  WEB = 'WEB'
}

export interface Highlight {
  book: string;
  chapter: string;
  verse: number;
  color: string;
  timestamp: number;
}

export interface Bookmark {
  book: string;
  chapter: string;
  verse: number;
  timestamp: number;
}

export interface HistoryItem {
  book: string;
  chapter: string;
  timestamp: number;
}

export interface PassageLink {
  book: string;
  chapter: string;
  verses: string;
}

export interface ReaderState {
  isOpen: boolean;
  book: string;
  chapter: string;
  verses: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  mode?: AppMode;
  links?: PassageLink[];
  isJson?: boolean;
  isError?: boolean;
}

export type PrayerCategory = 'Family' | 'Health' | 'Church' | 'Growth' | 'Other';

export interface PrayerEntry {
  id: string;
  title: string;
  text: string;
  category: PrayerCategory;
  timestamp: number;
  isAnswered: boolean;
}

export interface AppSettings {
  fontSize: number;
  lineHeight: number;
  nightMode: boolean;
  highContrast: boolean;
  historicalWarningAccepted: boolean;
  privacyAccepted: boolean;
  kidsMode: boolean;
  lastRead?: {
    book: string;
    chapter: string;
    verse: number;
    timestamp: number;
  };
}


export type AppTab = 'home' | 'study' | 'read' | 'library' | 'learn' | 'references' | 'support' | 'prayer' | 'settings' | 'privacy' | 'about' | 'terms' | 'instructions' | 'search' | 'contact' | 'faq' | 'changelog' | 'faith' | 'disclaimer' | 'translations' | 'guidelines' | 'roadmap' | 'thanks' | 'kids' | 'groups' | 'theology' | 'harmony' | 'notes';
