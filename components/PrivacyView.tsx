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
        <p className="text-[10px] text-stone-500 uppercase tracking-widest">By The Christian's Deck · 10 Nov 2026</p>
      </header>

      <article className="space-y-8 text-sm text-stone-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Who is responsible</h2>
          <p>
            This policy is written for people in the United States. Holy Bible GPT is operated by The Christian's Deck. Privacy requests go to <a className="text-[#D4AF37] underline" href="mailto:thechristiansdeck@gmail.com">thechristiansdeck@gmail.com</a>.
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
            A prayer can show religious belief. The prayer journal asks before the first prayer is saved. Prayers and notes are kept on the basis of consent. Notes are the words you write. They are part of the browser copy you can download or delete below. There is no separate notes checkbox.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Puter and the model</h2>
          <p>
            Sign-in and the study aid use Puter.js, loaded from js.puter.com. The app asks Puter for the gpt-4o-mini model. Puter receives the sign-in and the text of the question, including a prayer topic if you use "Help me write." Puter already holds the account identity, including the username this app uses as an id. Puter's terms of service name the company as Puter Technologies Inc. Those terms, as relied on here, do not state a processing country, so this page does not add one.
          </p>
          <p>
            The Puter account is kept on the basis of the contract for that account. The model call happens in your browser. This site does not run a private model server.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Vercel KV, Stripe, and analytics</h2>
          <p>
            If Pro sync is used, the browser bundle (notes, prayers, highlights, bookmarks, settings, and chat) is stored in Vercel KV under the Puter username. That write sets no expiry. The server copy stays until a deletion request for that account is carried out. Pro sync is kept on the basis of the contract for that service. Daily verse push, if you subscribe, stores the browser's push subscription in Vercel KV, also with no expiry in the code.
          </p>
          <p>
            If you subscribe, card details are entered on Stripe's page. This app stores the Stripe customer id, not the card number. The Stripe account name is not set in this site's code, so it is not stated here.
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
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">California</h2>
          <p>
            If you live in California, the CCPA/CPRA gives you the rights below.
          </p>
          <p>
            Categories collected: identifiers (a Puter username, a Stripe customer id, and a push subscription if you turn daily verses on); commercial information (whether a Pro subscription is active; card numbers stay on Stripe's page); internet activity (a page view through Vercel Analytics, and the book and chapter sent to bible-api.com); and content you write (notes, prayers, highlights, bookmarks, settings, and chat). A prayer can show religious belief.
          </p>
          <p>
            We do not sell personal information. We do not share it for cross-context behavioral advertising.
          </p>
          <p>
            You can ask to know, delete, or correct the personal information we keep. Email <a className="text-[#D4AF37] underline" href="mailto:thechristiansdeck@gmail.com">thechristiansdeck@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Children</h2>
          <p>
            This site is not directed to children under 13. Kids Mode is opened by a parent and used with that parent. We do not knowingly collect personal information from a child under 13. A parent who thinks we have can email thechristiansdeck@gmail.com.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Your choices</h2>
          <p>
            You can download the browser copy below, and you can delete that copy. Deleting it does not close the Puter account and does not cancel Stripe. For a server copy, email thechristiansdeck@gmail.com. A signed-in delete button for the server copy is waiting on the authenticated API. This page does not offer deletion by typing a username, because that API is not a proof of identity.
          </p>
          <p>
            Prayers and notes are processed on the basis of consent. The Puter account and Pro sync are processed on the basis of contract.
          </p>
          <p>
            People outside the United States, including in the EU and the EEA, can use the same email. They may also complain to their local data protection authority. One example is Integritetsskyddsmyndigheten (IMY), <a className="text-[#D4AF37] underline" href="https://www.imy.se">imy.se</a>.
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
