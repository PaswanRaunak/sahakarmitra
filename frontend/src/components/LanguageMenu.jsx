// ─────────────────────────────────────────────
// LanguageMenu: config-driven language selector.
//
// Reads the rollout config from GET /api/languages:
//   - enabled languages are selectable
//   - disabled ones are greyed out with a "Coming soon (pending
//     validation" tag, communicating the pan-India roadmap AND the
//     engineering honesty behind it
// Works for any language in the config, no per-language UI logic.
// ─────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';

// Native labels for the languages whose UI is already translated;
// everything else falls back to its English name from the config.
const NATIVE_LABELS = { en: 'English', hi: 'हिंदी', mr: 'मराठी' };

const labelFor = (l) => NATIVE_LABELS[l.code] || l.name || l.code.toUpperCase();

export default function LanguageMenu({ current = 'en', onChange, className = '', buttonClassName = '', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState(null); // null = still loading
  const ref = useRef(null);

  useEffect(() => {
    fetch('/api/languages')
      .then((r) => (r.ok ? r.json() : []))
      .then(setLanguages)
      .catch(() => setLanguages([]));
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const currentEntry = (languages || []).find((l) => l.code === current);
  const currentLabel = currentEntry ? labelFor(currentEntry) : (NATIVE_LABELS[current] || String(current).toUpperCase());

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className={buttonClassName}
      >
        {currentLabel}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Languages"
          className={`absolute top-full mt-2 w-56 max-h-96 overflow-y-auto bg-white border border-stone-200/90 rounded-2xl shadow-2xl py-2 z-50 animate-scale-in ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {!languages ? (
            <div className="px-4 py-2 text-xs text-stone-400">Loading…</div>
          ) : (
            languages.map((l) => {
              const isCurrent = l.code === current;
              if (l.enabled) {
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => { onChange(l.code); setOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] ${
                      isCurrent ? 'bg-amber-50 text-[#a03612]' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>{labelFor(l)}</span>
                    {isCurrent && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              }
              return (
                <div
                  key={l.code}
                  title="Coming soon (pending validation)"
                  className="px-4 py-2 text-xs text-stone-300 flex items-center justify-between cursor-not-allowed select-none"
                >
                  <span>{labelFor(l)}</span>
                  <span className="text-[9px] font-semibold text-stone-300 uppercase tracking-wide">Coming soon</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
