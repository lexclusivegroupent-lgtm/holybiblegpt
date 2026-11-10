import React, { useEffect, useState } from 'react';
import { BACKGROUNDS, rotatingBackgroundId } from '../services/shareCard/backgrounds.mjs';
import { downloadCard, renderShareCard, renderSwatch, shareCardFile, ShareFormat } from '../services/shareCard/render';

export interface ShareCardRequest {
  quote: string;
  reference: string;
  label?: string;
  filename: string;
  shareText?: string;
  truncate?: boolean;
  note?: string;
}

interface ShareCardSheetProps extends ShareCardRequest {
  onClose: () => void;
}

function storedChoice(key: string): string {
  try {
    return sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function remember(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode can reject storage. The in-memory choice still works.
  }
}

const ShareCardSheet: React.FC<ShareCardSheetProps> = ({
  quote,
  reference,
  label = '',
  filename,
  shareText,
  truncate = false,
  note = '',
  onClose,
}) => {
  const [format, setFormat] = useState<ShareFormat>(() => (
    storedChoice('hbgpt_share_format') === 'square' ? 'square' : 'story'
  ));
  const [backgroundId, setBackgroundId] = useState(() => {
    const saved = storedChoice('hbgpt_share_bg');
    return BACKGROUNDS.some((entry) => entry.id === saved) ? saved : rotatingBackgroundId();
  });
  const [preview, setPreview] = useState('');
  const [swatches, setSwatches] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const entry of BACKGROUNDS) next[entry.id] = renderSwatch(entry.id);
    setSwatches(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    renderShareCard({ quote, reference, label, backgroundId, format, truncate })
      .then((url) => {
        if (!cancelled) setPreview(url);
      })
      .catch(() => {
        if (!cancelled) setError('The card could not be drawn.');
      });
    return () => {
      cancelled = true;
    };
  }, [quote, reference, label, backgroundId, format, truncate]);

  const chooseFormat = (next: ShareFormat) => {
    setFormat(next);
    setStatus('');
    remember('hbgpt_share_format', next);
  };

  const chooseBackground = (id: string) => {
    setBackgroundId(id);
    setStatus('');
    remember('hbgpt_share_bg', id);
  };

  const text = shareText || (reference ? `“${quote}” — ${reference}` : quote);

  const onDownload = () => {
    if (!preview) return;
    downloadCard(preview, filename);
    setStatus('Downloaded.');
  };

  const onShare = async () => {
    if (!preview) return;
    const result = await shareCardFile(preview, filename, text);
    if (result === 'shared') setStatus('Shared.');
    else if (result === 'downloaded') {
      setStatus('Sharing is not available in this browser, so the image was downloaded.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-card-title"
        className="glass-dark border border-white/10 rounded-[1.75rem] w-full max-w-lg max-h-[94vh] overflow-y-auto p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 mb-4">
          <h2 id="share-card-title" className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
            Share
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] text-stone-500 hover:text-white rounded-lg"
          >
            ×
          </button>
        </header>

        <div className="flex justify-center items-center bg-black/40 rounded-2xl p-3 mb-4 min-h-[180px]">
          {preview ? (
            <img
              src={preview}
              alt={reference ? `${reference} share card preview` : 'Share card preview'}
              className="max-h-[46vh] w-auto max-w-full rounded-md shadow-lg"
            />
          ) : (
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
              {error || 'Preparing…'}
            </p>
          )}
        </div>

        {note && <p className="text-[11px] text-stone-500 text-center mb-3">{note}</p>}

        <div className="grid grid-cols-2 gap-2 mb-4" role="group" aria-label="Format">
          {(['story', 'square'] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={format === id}
              onClick={() => chooseFormat(id)}
              className={`min-h-[44px] rounded-xl text-[10px] font-bold uppercase tracking-[0.18em] border ${
                format === id
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'border-white/10 text-stone-400 hover:text-white'
              }`}
            >
              {id === 'story' ? 'Story' : 'Square'}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-500 mb-2">Background</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Background">
            {BACKGROUNDS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="option"
                aria-selected={backgroundId === entry.id}
                aria-label={entry.name}
                onClick={() => chooseBackground(entry.id)}
                className={`shrink-0 w-14 rounded-xl p-1 border ${
                  backgroundId === entry.id ? 'border-[#D4AF37]' : 'border-white/10'
                }`}
              >
                {swatches[entry.id] && (
                  <img src={swatches[entry.id]} alt="" className="w-full h-16 object-cover rounded-lg" />
                )}
                <span className="block text-[8px] text-stone-400 mt-1 truncate">{entry.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={!preview}
            className="min-h-[48px] rounded-xl border border-white/15 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-200 disabled:opacity-40"
          >
            Download
          </button>
          <button
            type="button"
            onClick={onShare}
            disabled={!preview}
            className="min-h-[48px] rounded-xl bg-[#D4AF37] text-black text-[10px] font-bold uppercase tracking-[0.18em] disabled:opacity-40"
          >
            Share
          </button>
        </div>
        <p className="min-h-[1.25rem] mt-3 text-center text-[11px] text-stone-400" role="status">
          {status}
        </p>
      </div>
    </div>
  );
};

export default ShareCardSheet;
