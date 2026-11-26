import { createElement, type ComponentType } from 'react';
import type { AppTab } from '../types';
import { renderToStaticMarkup } from 'react-dom/server';
import AboutView from '../components/AboutView';
import FAQView, { faqPageSchema } from '../components/FAQView';
import PrivacyView from '../components/PrivacyView';
import MethodologyView from '../components/MethodologyView';
import LimitationsView from '../components/LimitationsView';
import CopyrightView from '../components/CopyrightView';
import CorrectionsView from '../components/CorrectionsView';
import TermsView from '../components/TermsView';
import ContactView from '../components/ContactView';
import InstructionsView from '../components/InstructionsView';
import AIDisclaimerView from '../components/AIDisclaimerView';
import TranslationNoteView from '../components/TranslationNoteView';
import FaithView from '../components/FaithView';
import GospelHarmonyView from '../components/GospelHarmonyView';
import ChangelogView from '../components/ChangelogView';
import JournalView from '../components/JournalView';

const noopPassage = (_book: string, _chapter: string, _verse?: string) => {};
const noopTab = (_tab: AppTab) => {};

const PAGES = {
  '/about': AboutView,
  '/faq': FAQView,
  '/privacy': PrivacyView,
  '/methodology': MethodologyView,
  '/limitations': LimitationsView,
  '/copyrights': CopyrightView,
  '/corrections': CorrectionsView,
  '/terms': TermsView,
  '/contact': ContactView,
  '/instructions': InstructionsView,
  '/disclaimer': AIDisclaimerView,
  '/translations': TranslationNoteView,
  '/faith': FaithView,
  '/harmony': GospelHarmonyView,
  '/changelog': ChangelogView,
  '/journal': JournalView,
};

export function renderInfoBody(path: string): string {
  const View = PAGES[path as keyof typeof PAGES];
  if (!View) throw new Error(`No info page component for ${path}`);
  return renderToStaticMarkup(createElement(View as ComponentType<{ onOpenPassage: typeof noopPassage; onTabChange: typeof noopTab }>, {
    onOpenPassage: noopPassage,
    onTabChange: noopTab,
  }));
}

export function faqHead(): string {
  const json = JSON.stringify(faqPageSchema()).replace(/</g, '\\u003c');
  return `<script type="application/ld+json" id="faq-schema">${json}</script>`;
}
