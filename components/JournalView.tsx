import React, { useEffect, useState } from 'react';
import {
  JOURNAL_CONTACT_EMAIL,
  JOURNAL_IMAGES,
  JOURNAL_SESSION_RE,
  safeDownloadPath,
  safeStripeCheckoutUrl,
} from '../services/journalOffer.mjs';

type Download = { file: string; label: string; path: string };
type Offer = { enabled: boolean; checkout: boolean };

function JournalFigure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <figure className="space-y-3">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-2xl border border-white/10"
        onError={() => setHidden(true)}
      />
      <figcaption className="text-xs text-stone-400">{caption}</figcaption>
    </figure>
  );
}

const JournalView: React.FC = () => {
  const [offer, setOffer] = useState<Offer>({ enabled: true, checkout: false });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [downloads, setDownloads] = useState<Download[] | null>(null);
  const [coverOk, setCoverOk] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/journal/offer', { cache: 'no-store' })
      .then(async (response) => {
        const type = response.headers.get('content-type') || '';
        if (!response.ok || !type.includes('application/json')) return { enabled: true, checkout: false };
        return response.json();
      })
      .then((body) => {
        if (cancelled) return;
        setOffer({
          enabled: body?.enabled !== false,
          checkout: body?.checkout === true,
        });
      })
      .catch(() => {
        if (!cancelled) setOffer({ enabled: true, checkout: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';
    if (!JOURNAL_SESSION_RE.test(sessionId)) return;
    let cancelled = false;
    setNote('Confirming payment…');
    fetch(`/api/journal/session?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const type = response.headers.get('content-type') || '';
        if (!type.includes('application/json')) return null;
        return response.json();
      })
      .then((body) => {
        if (cancelled) return;
        if (body?.paid === true && Array.isArray(body.downloads) && body.downloads.length > 0) {
          const links = body.downloads
            .map((item: Download) => ({ ...item, path: safeDownloadPath(item?.path) }))
            .filter((item: Download) => item.path);
          setDownloads(links);
          setNote(links.length ? 'Your journal is ready.' : 'Your payment is confirmed. The file is not ready yet.');
          return;
        }
        if (body?.state === 'processing') {
          setNote('Payment is not complete yet. The download appears here after Stripe marks it paid. Reading, search, and study stay free.');
          return;
        }
        setNote('We could not confirm this payment.');
      })
      .catch(() => {
        if (!cancelled) setNote('We could not confirm this payment.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buy = async () => {
    if (!offer.checkout || busy) return;
    setBusy(true);
    setNote('');
    try {
      const response = await fetch('/api/journal/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const type = response.headers.get('content-type') || '';
      const body = type.includes('application/json') ? await response.json() : null;
      const url = safeStripeCheckoutUrl(body?.url);
      if (!response.ok || !url) {
        setNote('Checkout did not open. You can try again in a moment.');
        setBusy(false);
        return;
      }
      window.location.assign(url);
    } catch {
      setNote('Checkout did not open. You can try again in a moment.');
      setBusy(false);
    }
  };

  if (!offer.enabled) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-16 max-w-2xl mx-auto w-full">
        <p className="text-stone-300">This page is not available.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-8 lg:py-12 max-w-3xl mx-auto w-full space-y-8 pb-28">
      <header className="space-y-5">
        {coverOk && (
          <img
            src={JOURNAL_IMAGES.cover}
            alt="Cover of 30 Days in the Word, a KJV Bible study journal"
            width={1280}
            height={720}
            className="w-full rounded-[1.5rem] border border-white/10"
            onError={() => setCoverOk(false)}
          />
        )}
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">The Christian's Deck</p>
        <h1 className="accent-font text-3xl font-bold text-stone-100 uppercase tracking-widest">30 Days in the Word</h1>
        <p className="bible-font text-xl text-stone-200 leading-relaxed">
          One passage a day. Three questions. A place to pray. Printable, US Letter and A4. $9.
        </p>
        <p className="text-sm leading-relaxed text-stone-300">
          Reading, search, and AI study on Holy Bible GPT stay free. This journal is optional and does not unlock them.
        </p>
        {offer.checkout && (
          <button
            type="button"
            onClick={buy}
            disabled={busy}
            className="inline-flex min-h-[48px] items-center rounded-xl bg-[#D4AF37] px-6 text-sm font-bold text-black disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          >
            {busy ? 'Opening checkout…' : 'Get the journal ($9)'}
          </button>
        )}
        {note && (
          <p role="status" className="text-sm leading-relaxed text-stone-200">{note}</p>
        )}
        {downloads && downloads.length > 0 && (
          <ul className="space-y-3">
            {downloads.map((item) => (
              <li key={item.file}>
                <a
                  href={item.path}
                  className="inline-flex min-h-[44px] items-center text-sm font-bold text-[#D4AF37] underline underline-offset-4"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        {downloads && downloads.length === 0 && (
          <p className="text-sm text-stone-300">
            Email <a className="text-[#D4AF37] underline" href={`mailto:${JOURNAL_CONTACT_EMAIL}`}>{JOURNAL_CONTACT_EMAIL}</a> and we will get the file to you.
          </p>
        )}
      </header>

      <section className="glass-dark border border-white/10 rounded-[1.75rem] p-6 sm:p-8 space-y-4 text-sm leading-relaxed text-stone-200">
        <p>
          You want to read your Bible every day, but you open it and don't know where to start. This journal makes that decision for you.
        </p>
        <p>Every day for 30 days you get:</p>
        <ul className="list-disc space-y-2 pl-5 text-stone-300">
          <li>One short KJV passage to read, chosen to walk through the life of Jesus and the core of the faith</li>
          <li>Three questions: What does it say? What does it show me about God? What will I do today?</li>
          <li>Space to write a prayer, and one verse to carry with you</li>
          <li>An optional free companion: open that day's chapter here to read it and ask questions about it</li>
        </ul>
        <p>You receive two printable PDFs, US Letter and A4, together in one download. Print them, or use them in a PDF app.</p>
        <p>From the team behind The Christian's Deck.</p>
      </section>

      <section className="space-y-3" aria-labelledby="journal-how">
        <h2 id="journal-how" className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">How a day works</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-200">
          <li>Open today's page and read the passage in your Bible, or free on this site.</li>
          <li>Answer the three short questions.</li>
          <li>Write one line of prayer and carry one verse into your day.</li>
        </ol>
      </section>

      <JournalFigure
        src={JOURNAL_IMAGES.day}
        alt="Day 1 of the journal, shown in full"
        caption="Day 1, shown in full. The rest of the journal is in the download."
      />
      <JournalFigure
        src={JOURNAL_IMAGES.plan}
        alt="The 30-day reading plan"
        caption="The 30-day reading plan."
      />

      <section className="space-y-3 text-sm leading-relaxed text-stone-300">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">If it is not for you</h2>
        <p>
          If it doesn't help you build the habit, email <a className="text-[#D4AF37] underline" href={`mailto:${JOURNAL_CONTACT_EMAIL}`}>{JOURNAL_CONTACT_EMAIL}</a> within 30 days and you get your money back.
        </p>
      </section>

      <section className="space-y-4 text-sm leading-relaxed text-stone-300" aria-labelledby="journal-faq">
        <h2 id="journal-faq" className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Questions</h2>
        <p><span className="text-stone-100">Which translation?</span> King James Version. The journal names the passage. You read it in your own Bible or free here.</p>
        <p><span className="text-stone-100">Is it a physical book?</span> No. It is a PDF you can print or use on a tablet.</p>
        <p><span className="text-stone-100">Do I need Holy Bible GPT?</span> No. Reading, search, and AI study stay free whether or not you buy the journal.</p>
      </section>
    </div>
  );
};

export default JournalView;
