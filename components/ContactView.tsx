
import React from 'react';

const ContactView: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-12 max-w-2xl mx-auto w-full space-y-12">
      <header className="text-center space-y-4">
        <h2 className="accent-font text-2xl font-bold gold-gradient-text uppercase tracking-widest">Contact Support</h2>
        <p className="text-[10px] text-stone-600 uppercase tracking-widest">We are here to help you</p>
      </header>

      <div className="glass-dark border border-white/5 p-10 rounded-[2.5rem] space-y-8 text-center">
        <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center border border-white/10 mx-auto">
          <span className="text-2xl" aria-hidden="true">✉️</span>
        </div>
        
        <div className="space-y-4">
          <p className="text-stone-300 text-sm leading-relaxed">
            Have a question, feedback, or need help with the app? Send us an email.
          </p>
          <a 
            href="mailto:thechristiansdeck@gmail.com" 
            className="block text-xl font-bold text-[#D4AF37] hover:underline"
          >
            thechristiansdeck@gmail.com
          </a>
        </div>

        <div className="pt-8 border-t border-white/5">
          <p className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">
            Average response time: 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactView;
