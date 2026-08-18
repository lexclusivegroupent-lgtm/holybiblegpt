
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

import { Translation, ReaderState, PassageLink, AppMode, AppTab } from './types';
import { storage } from './services/storageService';
import { initializeOfflineKJV } from './services/bibleService';

const App: React.FC = () => {
  const [currentTranslation, setCurrentTranslation] = useState<Translation>(Translation.KJV);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CHAT);
  const [pendingQuery, setPendingQuery] = useState<{ query: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHistoricalWarning, setShowHistoricalWarning] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(() => sessionStorage.getItem('hbgpt_menu_open') === 'true');

  const [readerState, setReaderState] = useState<ReaderState>({
    isOpen: true,
    book: 'Genesis',
    chapter: '1',
    verses: ''
  });

  const [isPreparing, setIsPreparing] = useState(false);
  const [prepMessage, setPrepMessage] = useState("");

  useEffect(() => {
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
      case 'home': return <HomeView onOpenPassage={handleOpenPassage} onTabChange={setActiveTab} translation={currentTranslation} />;
      case 'read':
        return <BibleReader state={readerState} translation={currentTranslation} onClose={() => setActiveTab('home')} onNavigate={handleNavigateReader} onStudyVerse={handleStudyVerse} onStudyChapter={handleStudyChapter} onReport={() => setShowReportForm(true)} />;
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
      case 'harmony': return <GospelHarmonyView />;
      default: return <NotFoundView onGoHome={() => setActiveTab('home')} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden selection:bg-[#D4AF37] selection:text-black">
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
      <main className="flex-1 overflow-hidden flex flex-col" role="main">
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
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[9px] font-bold uppercase tracking-widest text-stone-600">
            <button onClick={() => setActiveTab('privacy')} className="hover:text-[#D4AF37] transition-colors min-h-[36px]">Privacy</button>
            <button onClick={() => setActiveTab('terms')} className="hover:text-[#D4AF37] transition-colors min-h-[36px]">Terms</button>
            <button onClick={() => setActiveTab('about')} className="hover:text-[#D4AF37] transition-colors min-h-[36px]">About</button>
            <button onClick={() => setActiveTab('faq')} className="hover:text-[#D4AF37] transition-colors min-h-[36px]">FAQ</button>
            <button onClick={() => setActiveTab('contact')} className="hover:text-[#D4AF37] transition-colors min-h-[36px]">Contact</button>
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
