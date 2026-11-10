import React from 'react';
import { PLUS_MONTHLY_LABEL, PLUS_YEARLY_LABEL } from '../services/billingAvailability.mjs';
import { BillingAvailability, BillingInterval } from '../services/syncService';
import SaveAcrossDevicesNote from './SaveAcrossDevicesNote';

interface PlusPlanProps {
  billing: BillingAvailability | 'checking';
  signedIn: boolean;
  active: boolean;
  busy: boolean;
  accountKnown?: boolean;
  message: string | null;
  onSignIn: () => void;
  onCheckout: (interval: BillingInterval) => void;
  onBackup?: () => void;
  onRestore?: () => void;
  onManage?: () => void;
  showSyncActions?: boolean;
}

const PlusPlan: React.FC<PlusPlanProps> = ({
  billing,
  signedIn,
  active,
  busy,
  accountKnown = true,
  message,
  onSignIn,
  onCheckout,
  onBackup,
  onRestore,
  onManage,
  showSyncActions = false,
}) => {
  const configured = billing === 'checking' ? null : billing;
  const month = Boolean(configured?.checkout && configured.intervals.month);
  const year = Boolean(configured?.checkout && configured.intervals.year);

  return (
    <div className="glass-dark border border-[#D4AF37]/30 p-8 rounded-[2rem] space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">Plus</h3>
        {active && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-950/30 px-3 py-1 rounded-full">Active</span>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs text-stone-300 leading-relaxed">
          Reading, search, and AI study are free forever. There is no question limit.
        </p>
        <p className="text-xs text-stone-400 leading-relaxed">
          Plus is optional. It adds cross-device sync and cloud backup for notes, highlights, bookmarks, prayers, chat history, and reading progress. It does not change access to Scripture or the study aid.
        </p>
        <p className="text-xs text-stone-300 leading-relaxed">
          {PLUS_MONTHLY_LABEL}, or {PLUS_YEARLY_LABEL}.
        </p>
      </div>

      {(billing === 'checking' || !accountKnown) && (
        <p className="text-xs text-stone-500">Checking status…</p>
      )}

      {configured && accountKnown && !configured.checkout && !active && (
        <p className="text-xs text-stone-400 leading-relaxed">
          Checkout is not available on this deployment yet. Reading, search, and AI study stay free.
        </p>
      )}

      {configured && accountKnown && !signedIn && !active && (
        <SaveAcrossDevicesNote
          onSignIn={onSignIn}
          busy={busy}
          error={message}
          detail="Accounts are free. Plus is optional and adds sync and backup. Reading, search, and AI stay open either way."
        />
      )}

      {configured && accountKnown && signedIn && !active && (month || year) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {month && (
            <button
              onClick={() => onCheckout('month')}
              disabled={busy}
              className="py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black disabled:opacity-50"
            >
              {busy ? 'Opening…' : 'Plus monthly · $4.99'}
            </button>
          )}
          {year && (
            <button
              onClick={() => onCheckout('year')}
              disabled={busy}
              className="py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest glass-dark border border-white/10 text-stone-200 disabled:opacity-50"
            >
              {busy ? 'Opening…' : 'Plus yearly · $39.99'}
            </button>
          )}
        </div>
      )}

      {active && (
        <div className="space-y-4">
          <p className="text-xs text-stone-400 leading-relaxed">
            Plus is active for this account. Cloud backup and cross-device sync are available. Reading, search, and AI study stay free for every account.
          </p>
          {showSyncActions && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onBackup}
                disabled={busy}
                className="py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black disabled:opacity-50"
              >
                Back Up
              </button>
              <button
                onClick={onRestore}
                disabled={busy}
                className="py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest glass-dark border border-white/10 text-stone-300 disabled:opacity-50"
              >
                Restore
              </button>
            </div>
          )}
          {showSyncActions && configured?.portal && (
            <button
              onClick={onManage}
              disabled={busy}
              className="w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-300 disabled:opacity-50"
            >
              Manage Subscription
            </button>
          )}
          {showSyncActions && configured && !configured.portal && (
            <p className="text-[10px] text-stone-500 text-center">The billing portal is not available on this site yet.</p>
          )}
          {!showSyncActions && (
            <p className="text-[10px] text-stone-500">Backup and restore are in Settings.</p>
          )}
        </div>
      )}

      {message && (signedIn || active || !configured || !accountKnown) && (
        <p className="text-[10px] text-stone-500 text-center">{message}</p>
      )}
    </div>
  );
};

export default PlusPlan;
