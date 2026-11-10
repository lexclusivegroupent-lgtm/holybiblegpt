
import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import BibleReader from './components/BibleReader';

// Chat is the largest bundle chunk — lazy-load it so the home view is instant
const ChatInterface = lazy(() => import('./components/ChatInterface'));
import SideDrawer from './components/SideDrawer';
import Onboarding from './components/Onboarding';
import ReportForm from './components/ReportForm';
import HistoricalWarning from './components/HistoricalWarning';

// Critical Core Views (Eager)
import HomeView from './components/HomeView';

// Support & Utility Views (Lazy)
const SupportView = lazy(() => import('./components/SupportView'));
const LibraryView = lazy(() => import('./components/LibraryView'));
const LearningView = lazy(() => import('./components/LearningView'));
const ReferencedView = lazy(() => import('./components/ReferencedView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const PrayerJournal = lazy(() => import('./components/PrayerJournal'));
const PrivacyView = lazy(() => import('./components/PrivacyView'));
const AboutView = lazy(() => import('./components/AboutView'));
const TermsView = lazy(() => import('./components/TermsView'));
const InstructionsView = lazy(() => import('./components/InstructionsView'));
const SearchView = lazy(() => import('./components/SearchView'));
const ContactView = lazy(() => import('./components/ContactView'));
const FAQView = lazy(() => import('./components/FAQView'));
const ChangelogView = lazy(() => import('./components/ChangelogView'));
const FaithView = lazy(() => import('./components/FaithView'));
const AIDisclaimerView = lazy(() => import('./components/AIDisclaimerView'));
const TranslationNoteView = lazy(() => import('./components/TranslationNoteView'));
const GuidelinesView = lazy(() => import('./components/GuidelinesView'));
const RoadmapView = lazy(() => import('./components/RoadmapView'));
const ThankYouView = lazy(() => import('./components/ThankYouView'));
const KidsModeView = lazy(() => import('./components/KidsModeView'));
const StudyGroupsView = lazy(() => import('./components/StudyGroupsView'));
const TheologyView = lazy(() => import('./components/TheologyView'));
const GospelHarmonyView = lazy(() => import('./components/GospelHarmonyView'));
const NotFoundView = lazy(() => import('./components/NotFoundView'));
const NotesView = lazy(() => import('./components/NotesView'));
const MethodologyView = lazy(() => import('./components/MethodologyView'));
const LimitationsView = lazy(() => import('./components/LimitationsView'));
const CopyrightView = lazy(() => import('./components/CopyrightView'));
const CorrectionsView = lazy(() => import('./components/CorrectionsView'));

import { Translation, ReaderState, PassageLink, AppMode, AppTab } from './types';
import { storage } from './services/storageService';
import { initializeOfflineKJV, BIBLE_BOOKS, HISTORICAL_BOOKS } from './services/bibleService';
import { bookPath, bookToSlug as slugify, chapterPath } from './services/routes.mjs';
import BookIndexView from './components/BookIndexView';

// ── URL ↔ App-state utilities ───────────────────────────────────────────────

const ALL_BOOKS = [...BIBLE_BOOKS, ...HISTORICAL_BOOKS];
const bookToSlug = (name: string) => slugify(name);
const slugToBook = (slug: string): string | null =>
  ALL_BOOKS.find(b => bookToSlug(b.name) === slug)?.name ?? null;

// Tabs that get a real URL path (read gets /bible/book/chapter instead)
const TAB_ROUTES: Partial<Record<AppTab, string>> = {
  home: '/',
  about: '/about',
  faq: '/faq',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  search: '/search',
  library: '/library',
  prayer: '/prayer',
  settings: '/settings',
  learn: '/learn',
  references: '/references',
  harmony: '/harmony',
  kids: '/kids',
  faith: '/faith',
  disclaimer: '/disclaimer',
  translations: '/translations',
  guidelines: '/guidelines',
  instructions: '/instructions',
  changelog: '/changelog',
  groups: '/groups',
  theology: '/theology',
  notes: '/notes',
  support: '/support',
  methodology: '/methodology',
  limitations: '/limitations',
  copyrights: '/copyrights',
  corrections: '/corrections',
};
const ROUTE_TO_TAB: Record<string, AppTab> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([k, v]) => [v, k as AppTab])
);

// Per-page title + description used both for document.title and OG tags
const PAGE_META: Partial<Record<AppTab, [string, string]>> = {
  home:         ['Holy Bible GPT – Free Scripture-First Bible Study', "Free Scripture-first Bible study by The Christian's Deck. Read the Bible, ask questions, use cross-references, and pray from Scripture. The AI is a study aid — God's Word holds final authority."],
  study:        ['Scripture Study Companion – Holy Bible GPT', 'Ask Bible questions and receive Scripture-first answers. The study aid quotes retrieved KJV or WEB text and can say when a claim is not established.'],
  about:        ['About Holy Bible GPT – Scripture-First, Always Free', 'Learn how Holy Bible GPT works: a Scripture-first study tool that quotes the Word of God before everything else.'],
  faq:          ['FAQ – Holy Bible GPT', 'Frequently asked questions about Holy Bible GPT, free AI Bible study, and how to use the Scripture study tools.'],
  privacy:      ['Privacy Policy – Holy Bible GPT', 'How Holy Bible GPT uses Puter, the model provider, this browser, Vercel KV, Stripe, bible-api.com, and Vercel Analytics.'],
  terms:        ['Terms of Service – Holy Bible GPT', 'Terms of service for the Holy Bible GPT free Scripture study app.'],
  contact:      ['Contact – Holy Bible GPT', 'Get in touch with the Holy Bible GPT team. Send feedback, report an issue, or ask a question.'],
  search:       ['Search the Bible – Holy Bible GPT', 'Search Scripture by topic or verse reference. AI-powered verse discovery finds what you are looking for.'],
  library:      ['My Library – Holy Bible GPT', 'Your saved bookmarks, highlights, notes, and reading history — all stored privately on your device.'],
  prayer:       ['Prayer Journal – Holy Bible GPT', 'Record your prayers, track answered prayers, and grow in your prayer life with a personal prayer journal.'],
  learn:        ['Bible Timeline – Holy Bible GPT', 'Explore key events in Scripture from Creation to Revelation across the Biblical timeline.'],
  references:   ['Scripture References – Holy Bible GPT', 'Cross-reference Scripture and explore how passages connect across the whole Bible.'],
  harmony:      ['Gospel Harmony – Holy Bible GPT', 'See parallel accounts of the life of Christ across Matthew, Mark, Luke, and John — side by side.'],
  kids:         ['Kids Bible Mode – Holy Bible GPT', 'Child-friendly Bible study with simple, gentle language for young readers and families.'],
  faith:        ['What We Believe – Holy Bible GPT', 'The faith foundation behind Holy Bible GPT and our commitment to Scripture as the final authority.'],
  theology:     ['Theology Topics – Holy Bible GPT', 'Explore major theological themes and doctrines grounded in Scripture.'],
  instructions: ['How to Use – Holy Bible GPT', 'A quick guide to getting the most out of Holy Bible GPT for daily Bible study.'],
  disclaimer:   ['AI Disclaimer – Holy Bible GPT', 'Understanding the role and limits of AI in Holy Bible GPT.'],
  translations: ['About Bible Translations – Holy Bible GPT', 'The King James Version and the World English Bible are public domain. The English Standard Version is not offered, so the label always matches the text.'],
  changelog:    ["What's New – Holy Bible GPT Changelog", 'Latest updates and new features added to Holy Bible GPT: search tools, offline KJV, prayer journal, and more.'],
  methodology:  ['How answers are made – Holy Bible GPT', 'Scripture is retrieved before an explanation. A quotation and an explanation are kept apart.'],
  limitations:  ['Limits of the study aid – Holy Bible GPT', 'The study aid can be wrong. It is instructed to say when a claim is not established from Scripture.'],
  copyrights:   ['Translation copyright – Holy Bible GPT', 'The King James Version and the World English Bible are public domain. The English Standard Version is not offered.'],
  corrections:  ['Corrections – Holy Bible GPT', 'How to report a verse that does not match its label, or an answer that adds to the text.'],
};

function readInitialRoute(): { tab: AppTab; book: string; chapter: string } {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const chapterMatch = path.match(/^\/bible\/([^/]+)\/(\d+)$/);
  const bookMatch = path.match(/^\/bible\/([^/]+)$/);
  if (chapterMatch) {
    const book = slugToBook(chapterMatch[1]);
    if (book) return { tab: 'read', book, chapter: chapterMatch[2] };
  }
  if (bookMatch) {
    const book = slugToBook(bookMatch[1]);
    if (book) return { tab: 'read', book, chapter: '' };
  }
  if (ROUTE_TO_TAB[path] && ROUTE_TO_TAB[path] !== 'home') {
    return { tab: ROUTE_TO_TAB[path], book: 'Genesis', chapter: '1' };
  }
  return { tab: 'home', book: 'Genesis', chapter: '1' };
}

function updateMeta(title: string, desc: string, path: string) {
  document.title = title;
  const sel = <T extends Element>(q: string) => document.querySelector<T>(q);
  sel<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', desc);
  sel<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
  sel<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', desc);
  sel<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', `https://holybiblegpt.com${path}`);
  sel<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title);
  sel<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', desc);
  const canonical = sel<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `https://holybiblegpt.com${path}`;
}

const App: React.FC = () => {
  const [currentTranslation, setCurrentTranslation] = useState<Translation>(Translation.KJV);
  const initialRoute = readInitialRoute();
  const [activeTab, setActiveTab] = useState<AppTab>(initialRoute.tab);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CHAT);
  const [pendingQuery, setPendingQuery] = useState<{ query: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHistoricalWarning, setShowHistoricalWarning] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(() => sessionStorage.getItem('hbgpt_menu_open') === 'true');

  const [readerState, setReaderState] = useState<ReaderState>({
    isOpen: true,
    book: initialRoute.book,
    chapter: initialRoute.chapter,
    verses: ''
  });

  const [isPreparing, setIsPreparing] = useState(false);
  const [prepMessage, setPrepMessage] = useState("");

  // ── URL-sync effect: runs whenever the active tab or reader position changes ──
  useEffect(() => {
    let path: string;
    let title: string;
    let desc: string;

    if (activeTab === 'read') {
      if (!readerState.chapter) {
        path = bookPath(readerState.book);
        title = `${readerState.book} – King James Version – Holy Bible GPT`;
        desc = `King James Version, public domain. Chapters of ${readerState.book} on Holy Bible GPT.`;
      } else {
        path = chapterPath(readerState.book, readerState.chapter);
        title = `${readerState.book} ${readerState.chapter} KJV – Holy Bible GPT`;
        desc = `King James Version, public domain. ${readerState.book} ${readerState.chapter} on Holy Bible GPT.`;
      }
    } else {
      path = TAB_ROUTES[activeTab] ?? '/';
      const [t, d] = PAGE_META[activeTab] ?? PAGE_META.home!;
      title = t;
      desc = d;
    }

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const targetPath = path.replace(/\/$/, '') || '/';
    if (currentPath !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    updateMeta(title, desc, path);
  }, [activeTab, readerState.book, readerState.chapter, currentTranslation]);

  useEffect(() => {
    // ── Parse initial URL so deep-links and shared links work ──
    const accepted = localStorage.getItem('hbgpt_onboarding_accepted');
    if (!accepted) setShowOnboarding(true);

    // KJV Offline Init
    initializeOfflineKJV((msg) => {
      setIsPreparing(true);
      setPrepMessage(msg);
    }).then(() => setIsPreparing(false));

    // Billing Status Check
    const params = new URLSearchParams(window.location.search);
    const billingStatus = params.get('billing_status');
    if (billingStatus === 'success') {
      setActiveTab('settings');
      setTimeout(() => alert("Upgrade Successful! Thank you for supporting the ministry."), 1000);
      window.history.replaceState({}, '', '/');
    } else if (billingStatus === 'cancel') {
      setActiveTab('settings');
      window.history.replaceState({}, '', '/');
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(e => console.error(e));
      });
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('hbgpt_menu_open', isMenuOpen.toString());
  }, [isMenuOpen]);

  const handleOpenReader = (link: PassageLink) => {
    setReaderState(prev => ({ ...prev, book: link.book, chapter: link.chapter, verses: link.verses }));
    setActiveTab('read');
    setIsMenuOpen(false);
  };

  const handleOpenPassage = (book: string, chapter: string, verse?: string) => {
    const isHistorical = ['Tobit', 'Judith', 'Wisdom', 'Sirach', 'Baruch', '1 Maccabees', '2 Maccabees'].includes(book);
    if (isHistorical && !storage.isWarningAccepted()) {
      setShowHistoricalWarning(true);
      return;
    }
    setReaderState(prev => ({ ...prev, book, chapter, verses: verse || '' }));
    setActiveTab('read');
    setIsMenuOpen(false);
    if (verse) storage.saveLastRead(book, chapter, parseInt(verse));
  };

  const handleNavigateReader = (book: string, chapter: string) => {
    setReaderState(prev => ({ ...prev, book, chapter, verses: '' }));
  };

  const handleStudyVerse = (mode: AppMode, verse: number) => {
    const modeVerb = mode === AppMode.PRAYER_HELP ? 'Write a prayer for' : 'Please analyze';
    const query = `${modeVerb} ${readerState.book} ${readerState.chapter}:${verse}`;
    setActiveTab('study');
    setCurrentMode(mode);
    setPendingQuery({ query });
    setReaderState(prev => ({ ...prev, verses: verse.toString() }));
    setIsMenuOpen(false);
  };

  const handleStudyChapter = (mode: AppMode) => {
    const query = `Give an overview and key themes of ${readerState.book} chapter ${readerState.chapter}`;
    setActiveTab('study');
    setCurrentMode(mode);
    setPendingQuery({ query });
    setIsMenuOpen(false);
  };

  const handleStudyEvent = (eventTitle: string, book: string, chapter: string) => {
    const query = `Explain this event in the Bible timeline: ${eventTitle} connected to ${book} ${chapter}.`;
    setActiveTab('study');
    setCurrentMode(AppMode.DEEP_STUDY);
    setPendingQuery({ query });
    setIsMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeView onOpenPassage={handleOpenPassage} onOpenBook={(book) => { setReaderState(prev => ({ ...prev, book, chapter: '' })); setActiveTab('read'); }} onTabChange={setActiveTab} translation={currentTranslation} />;
      case 'read':
        if (!readerState.chapter) {
          return (
            <BookIndexView
              book={readerState.book}
              onOpenChapter={(chapter) => handleNavigateReader(readerState.book, chapter)}
              onOpenBook={(book) => setReaderState(prev => ({ ...prev, book, chapter: '' }))}
              onHome={() => setActiveTab('home')}
            />
          );
        }
        return <BibleReader state={readerState} translation={currentTranslation} onClose={() => setActiveTab('home')} onNavigate={handleNavigateReader} onOpenBook={(book) => setReaderState(prev => ({ ...prev, book, chapter: '' }))} onStudyVerse={handleStudyVerse} onStudyChapter={handleStudyChapter} onReport={() => setShowReportForm(true)} />;
      case 'study':
        return (
          <ChatInterface
            currentTranslation={currentTranslation}
            onTranslationChange={setCurrentTranslation}
            onOpenReader={handleOpenReader}
            currentMode={currentMode}
            pendingQuery={pendingQuery?.query}
            onQueryProcessed={() => { setPendingQuery(null); setCurrentMode(AppMode.CHAT); }}
            onClose={() => setActiveTab('read')}
            onReport={() => setShowReportForm(true)}
            onTabChange={setActiveTab}
            readingContext={readerState.book !== 'Genesis' || readerState.chapter !== '1'
              ? `${readerState.book} ${readerState.chapter}`
              : undefined}
          />
        );
      case 'library': return <LibraryView onOpenPassage={handleOpenPassage} />;
      case 'learn': return <LearningView onOpenPassage={handleOpenPassage} onStudyEvent={handleStudyEvent} />;
      case 'references': return <ReferencedView onOpenPassage={handleOpenPassage} />;
      case 'support': return <SupportView onOpenTerms={() => setActiveTab('terms')} />;
      case 'prayer': return <PrayerJournal />;
      case 'settings': return <SettingsView onTabChange={setActiveTab} onReport={() => setShowReportForm(true)} />;
      case 'privacy': return <PrivacyView />;
      case 'about': return <AboutView />;
      case 'terms': return <TermsView />;
      case 'instructions': return <InstructionsView onTabChange={setActiveTab} />;
      case 'search': return <SearchView onOpenPassage={handleOpenPassage} translation={currentTranslation} />;
      case 'contact': return <ContactView />;
      case 'faq': return <FAQView />;
      case 'changelog': return <ChangelogView />;
      case 'faith': return <FaithView />;
      case 'disclaimer': return <AIDisclaimerView />;
      case 'translations': return <TranslationNoteView />;
      case 'guidelines': return <GuidelinesView />;
      case 'roadmap': return <RoadmapView />;
      case 'thanks': return <ThankYouView />;
      case 'kids': return <KidsModeView onOpenPassage={handleOpenPassage} />;
      case 'groups': return <StudyGroupsView />;
      case 'theology': return <TheologyView />;
      case 'harmony': return <GospelHarmonyView onOpenPassage={handleOpenPassage} />;
      case 'notes': return <NotesView onOpenPassage={handleOpenPassage} onTabChange={setActiveTab} />;
      case 'methodology': return <MethodologyView />;
      case 'limitations': return <LimitationsView />;
      case 'copyrights': return <CopyrightView />;
      case 'corrections': return <CorrectionsView />;
      default: return <NotFoundView onGoHome={() => setActiveTab('home')} />;
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-black overflow-hidden selection:bg-[#D4AF37] selection:text-black">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} onShowSearch={() => setActiveTab('search')} />
      <SideDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'study') { setActiveTab('study'); }
          else { setActiveTab(tab); }
          setIsMenuOpen(false);
        }}
        currentTranslation={currentTranslation}
        onTranslationChange={setCurrentTranslation}
      />
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col" role="main">
        <Suspense fallback={
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-t-2 border-[#D4AF37] rounded-full animate-spin"></div>
            <div className="text-stone-700 uppercase tracking-widest text-[10px] animate-pulse">Illuminating...</div>
          </div>
        }>
          {renderContent()}
        </Suspense>
      </main>
      {activeTab !== 'read' && activeTab !== 'study' && (
        <footer className="glass-dark border-t border-white/5 py-5 px-6 flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-widest text-stone-300">
            <a href="/privacy" onClick={(event) => { event.preventDefault(); setActiveTab('privacy'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">Privacy</a>
            <a href="/terms" onClick={(event) => { event.preventDefault(); setActiveTab('terms'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">Terms</a>
            <a href="/about" onClick={(event) => { event.preventDefault(); setActiveTab('about'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">About</a>
            <a href="/faq" onClick={(event) => { event.preventDefault(); setActiveTab('faq'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">FAQ</a>
            <a href="/contact" onClick={(event) => { event.preventDefault(); setActiveTab('contact'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">Contact</a>
            <a href="/methodology" onClick={(event) => { event.preventDefault(); setActiveTab('methodology'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">Method</a>
            <a href="/limitations" onClick={(event) => { event.preventDefault(); setActiveTab('limitations'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">Limits</a>
            <a href="/copyrights" onClick={(event) => { event.preventDefault(); setActiveTab('copyrights'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">Copyright</a>
            <a href="/corrections" onClick={(event) => { event.preventDefault(); setActiveTab('corrections'); }} className="hover:text-[#D4AF37] transition-colors min-h-[36px] inline-flex items-center">Corrections</a>
          </div>
          <a href="https://thechristiansdeck.com" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] hover:text-[#F9E3A5] transition-all">POWERED BY THE CHRISTIAN'S DECK</a>
        </footer>
      )}
      {showOnboarding && <Onboarding onAccept={() => setShowOnboarding(false)} />}
      {showHistoricalWarning && <HistoricalWarning onContinue={() => { storage.acceptWarning(); setShowHistoricalWarning(false); }} onGoBack={() => setShowHistoricalWarning(false)} />}
      {showReportForm && <ReportForm onClose={() => setShowReportForm(false)} />}

      {/* Offline Prep Overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-16 h-16 border-t-2 border-[#D4AF37] rounded-full animate-spin"></div>
          <div>
            <h3 className="text-xl font-bold text-[#D4AF37] uppercase tracking-widest">Setting up Bible</h3>
            <p className="text-stone-400 mt-2 text-xs uppercase tracking-wider">{prepMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
