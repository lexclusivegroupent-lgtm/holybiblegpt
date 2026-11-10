import React from 'react';
import { SAVE_ACROSS_DEVICES } from '../services/authSession';

interface SaveAcrossDevicesNoteProps {
  onSignIn: () => void;
  busy?: boolean;
  error?: string | null;
  detail?: string;
}

const SaveAcrossDevicesNote: React.FC<SaveAcrossDevicesNoteProps> = ({
  onSignIn,
  busy = false,
  error = null,
  detail = 'Accounts are free. A copy stays on this device either way.',
}) => {
  return (
    <div role="note" className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-4 space-y-3">
      <p className="text-sm text-stone-100 leading-relaxed">{SAVE_ACROSS_DEVICES}</p>
      <p className="text-xs text-stone-400 leading-relaxed">{detail}</p>
      {error && (
        <p role="alert" className="text-sm text-red-300 leading-relaxed">{error}</p>
      )}
      <button
        type="button"
        onClick={onSignIn}
        disabled={busy}
        aria-label="Sign in to save this across your devices"
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#D4AF37] text-black text-xs font-bold tracking-wide hover:opacity-90 disabled:opacity-60"
      >
        {busy ? 'Opening sign-in…' : error ? 'Try again' : 'Sign in'}
      </button>
    </div>
  );
};

export default SaveAcrossDevicesNote;
