import React, { lazy, Suspense } from 'react';
import type { ShareCardRequest } from './ShareCardSheet';

const ShareCardSheet = lazy(() => import('./ShareCardSheet'));

function Preparing({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Preparing share card"
        className="glass-dark border border-white/10 rounded-2xl px-8 py-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Preparing the card…</p>
        <button type="button" onClick={onClose} className="mt-4 text-[10px] uppercase tracking-widest text-[#D4AF37]">
          Close
        </button>
      </div>
    </div>
  );
}

export function ShareCardDialog({
  request,
  onClose,
}: {
  request: ShareCardRequest | null;
  onClose: () => void;
}) {
  if (!request) return null;
  return (
    <Suspense fallback={<Preparing onClose={onClose} />}>
      <ShareCardSheet {...request} onClose={onClose} />
    </Suspense>
  );
}

export type { ShareCardRequest };
