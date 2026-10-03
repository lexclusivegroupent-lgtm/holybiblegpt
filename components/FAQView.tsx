
import React, { useEffect } from 'react';

const FAQView: React.FC = () => {
  const faqs = [
    { q: "Is this app free?", a: "Yes. The Bible reader and basic tools are free for everyone." },
    { q: "Can I use it offline?", a: "Yes. Use the Scriptorium Settings to download the full KJV for offline use." },
    { q: "Is my data private?", a: "Yes. Your notes and prayers stay on your device. We do not sell your data." },
    { q: "Who built this?", a: "Built by a small team dedicated to sharing the Word through modern technology." },
    { q: "Is the AI always right?", a: "No. AI is a tool for study. Always check everything against Scripture." }
  ];

  // Inject FAQPage structured data while this view is mounted so Google can
  // surface these as an expandable rich result directly in search.
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-schema';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(script);
    return () => { document.getElementById('faq-schema')?.remove(); };
  }, []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Common Questions</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-widest">FAQ</p>
      </header>

      <div className="space-y-6">
        {faqs.map((f, i) => (
          <div key={i} className="glass-dark border border-white/5 p-8 rounded-3xl space-y-3">
            <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Q: {f.q}</h3>
            <p className="text-stone-400 text-sm leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQView;
