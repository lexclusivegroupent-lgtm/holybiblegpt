import React, { useState } from 'react';
import { storage } from '../services/storageService';

const PrivacyView: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);

  const downloadData = () => {
    const blob = new Blob([JSON.stringify(storage.exportLocalData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'holybiblegpt-data.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Downloaded the copy stored in this browser.');
  };

  const deleteData = async () => {
    const confirmed = window.confirm('Delete notes, prayers, bookmarks, highlights, chat, and settings stored in this browser? This does not delete a Puter account or a Stripe subscription.');
    if (!confirmed) return;
    await storage.deleteLocalData();
    setMessage('Deleted the copy stored in this browser. Reload the page to start fresh.');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-8">
      <header className="text-center space-y-4">
        <h1 className="accent-font text-3xl font-bold gold-gradient-text uppercase tracking-widest">Privacy Policy</h1>
        <p className="text-[10px] text-stone-500 uppercase tracking-widest">Draft for the owner to approve · 10 Nov 2026</p>
      </header>

      <section className="glass-dark border border-[#D4AF37]/30 p-6 rounded-2xl text-sm text-stone-300 leading-relaxed space-y-3">
        <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">Owner review</p>
        <p>
          This page describes the data flows in the code. It is not a finished legal opinion. Before relying on it, fill in the bracketed items: the controller's legal name, postal address, and company number; Puter's contracting entity; the Stripe account name; and how long server copies are kept.
        </p>
      </section>

      <article className="space-y-8 text-sm text-stone-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Who is responsible</h2>
          <p>
            The site is published as Holy Bible GPT by The Christian's Deck. The public contact is thechristiansdeck@gmail.com. [Owner: legal name, postal address in Sweden, and organisation number.]
          </p>
          <p>
            An earlier version of this page said that questions went out with no account attached, and the page description said the site collected nothing. That was not accurate. The description below replaces it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">On this device</h2>
          <p>
            Reading progress, bookmarks, highlights, notes, prayers, settings, and the chat transcript are stored in this browser (local storage). Chapters you cache are stored in this browser's IndexedDB. They stay here unless you use Pro sync or ask the study aid for help.
          </p>
          <p>
            A prayer can reveal religious belief. That is special-category data. The prayer journal asks before the first prayer is saved.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Puter and the model</h2>
          <p>
            Sign-in and the study aid use Puter.js, loaded from js.puter.com. The app asks Puter for the gpt-4o-mini model. Puter receives the sign-in and the text of the question, including a prayer topic if you use "Help me write." Puter already holds the account identity, including the username this app uses as an id. [Owner: name Puter's legal entity and where it processes data, from Puter's own terms.]
          </p>
          <p>
            The model call happens in your browser. This site does not run a private model server.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Vercel KV, Stripe, and analytics</h2>
          <p>
            If Pro sync is used, the browser bundle (notes, prayers, highlights, bookmarks, settings, and chat) is stored in Vercel KV under the Puter username. Daily verse push, if you subscribe, stores the browser's push subscription there too. [Owner: set the retention period. Suggested starting point: keep the sync bundle until the person asks for deletion.]
          </p>
          <p>
            If you subscribe, card details are entered on Stripe's page. This app stores the Stripe customer id, not the card number. [Owner: Stripe account name.]
          </p>
          <p>
            The build loads Vercel Analytics. When that script runs, Vercel receives a page view. It does not receive the text of a prayer.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Scripture text and fonts</h2>
          <p>
            Chapter text that is not already on this site is requested from bible-api.com. That request includes the book and chapter. bible-api.com sees the network address of the request. It does not receive your name or your prayers.
          </p>
          <p>
            Inter, Crimson Pro, and Cinzel are served from this site's own files. The page does not ask Google Fonts for them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Your choices</h2>
          <p>
            You can download the browser copy below, and you can delete that copy. Deleting it does not close the Puter account and does not cancel Stripe. For a server copy, email thechristiansdeck@gmail.com. A signed-in delete button for the server copy is waiting on the authenticated API. This page does not offer deletion by typing a username, because that API is not a proof of identity.
          </p>
          <p>
            [Owner: lawful basis for each flow, whether you rely on consent, contract, or legitimate interests, and the international-transfer tool for Puter, Vercel, and Stripe. Also the supervisory authority you name for complaints. For Sweden that is commonly the IMY, which you should confirm with counsel.]
          </p>
        </section>
      </article>

      <div className="grid sm:grid-cols-2 gap-3">
        <button onClick={downloadData} className="min-h-[48px] rounded-2xl bg-[#D4AF37] text-black text-[10px] font-bold uppercase tracking-widest">
          Download my data
        </button>
        <button onClick={deleteData} className="min-h-[48px] rounded-2xl border border-white/10 text-stone-300 text-[10px] font-bold uppercase tracking-widest">
          Delete data on this device
        </button>
      </div>
      {message && <p className="text-xs text-stone-400 text-center">{message}</p>}
      <p className="text-center text-[10px] text-stone-500">
        Questions: <a className="text-[#D4AF37] underline" href="mailto:thechristiansdeck@gmail.com">thechristiansdeck@gmail.com</a>
      </p>
    </div>
  );
};

export default PrivacyView;
