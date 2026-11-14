import React, { useEffect, useState } from 'react';
import {
  JOURNAL_DISMISS_KEY,
  JOURNAL_IMAGES,
  JOURNAL_PATH,
  journalPromoVisible,
} from '../services/journalOffer.mjs';

interface JournalPromoProps {
  onOpen: () => void;
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(JOURNAL_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

const JournalPromo: React.FC<JournalPromoProps> = ({ onOpen }) => {
  const [checkout, setCheckout] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/journal/offer', { cache: 'no-store' })
      .then(async (response) => {
        const type = response.headers.get('content-type') || '';
        if (!response.ok || !type.includes('application/json')) return { checkout: false };
        return response.json();
      })
      .then((body) => {
        if (!cancelled) setCheckout(body?.checkout === true);
      })
      .catch(() => {
        if (!cancelled) setCheckout(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!journalPromoVisible(checkout, dismissed)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(JOURNAL_DISMISS_KEY, '1');
    } catch {
      // The announcement still closes for this view.
    }
    setDismissed(true);
  };

  return (
    <section
      aria-labelledby="journal-promo-title"
      className="glass-dark border border-[#D4AF37]/25 rounded-[1.5rem] px-4 py-4 sm:px-5"
    >
      <div className="flex items-start gap-3">
        {imageOk && (
          <img
            src={JOURNAL_IMAGES.square}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-xl border border-white/10 object-cover"
            onError={() => setImageOk(false)}
          />
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <h2 id="journal-promo-title" className="text-sm leading-relaxed text-stone-100">
            New: 30 Days in the Word, a printable KJV study journal from The Christian's Deck. $9.
          </h2>
          <p className="text-sm leading-relaxed text-stone-300">
            Reading, search, and AI study on this site stay free.
          </p>
          <a
            href={JOURNAL_PATH}
            onClick={(event) => {
              event.preventDefault();
              onOpen();
            }}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          >
            Get the journal
          </a>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[44px] shrink-0 rounded-xl border border-white/15 px-3 text-xs font-bold text-stone-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        >
          Close
        </button>
      </div>
    </section>
  );
};

export default JournalPromo;
