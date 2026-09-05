// ─────────────────────────────────────────────
// StateModal: jurisdiction selector driven by the state rollout config
// (GET /api/states, backed by data/state-config.json).
//
//   - enabled jurisdictions are selectable
//   - disabled ones are greyed with a "Coming soon" tag (their Act text
//     has not been sourced/validated yet, and placeholder law text is
//     is never generated, integrity rule)
//   - a live "Coverage: X / N jurisdictions" indicator turns
//     incompleteness into transparent progress
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { makeT } from '../i18n.js';

export default function StateModal({ isOpen, onClose, selectedState, onSelectState, language = 'en' }) {
  const [states, setStates] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const t = makeT(language);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    fetch('/api/states')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => setStates(data.states || []))
      .catch(() => {
        setError('Could not load the jurisdiction list. Is the server running?');
        setStates([]);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const enabledCount = (states || []).filter((s) => s.enabled).length;
  const totalCount = (states || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white border border-stone-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="state-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-100 text-[#a03612] text-sm" aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <h2 id="state-modal-title" className="text-lg font-bold text-stone-900">
                {t('selectState') || 'Select State / Jurisdiction'}
              </h2>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Choose your cooperative society's statutory jurisdiction to ground legal answers in the correct state legislation.
            </p>
            {totalCount > 0 && (
              <p className="text-[11px] font-bold text-[#a03612] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-block tabular-nums">
                Coverage: {enabledCount}/{totalCount} jurisdictions live
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* State option list */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {error && (
            <div role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
          )}

          {!states && !error && (
            <div className="space-y-2.5" role="status" aria-label="Loading jurisdictions">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border border-stone-200/80 rounded-2xl overflow-hidden">
                  <div className="h-14 shimmer-bg" />
                </div>
              ))}
            </div>
          )}

          {states && states.length === 0 && !error && (
            <div className="text-xs text-stone-400 text-center py-6">No jurisdictions configured.</div>
          )}

          {(states || []).map((item) => {
            const isSelected = selectedState === item.id;
            const label = item.name;

            if (!item.enabled) {
              return (
                <div
                  key={item.id}
                  title="Coming soon. This state's real Act text has not been sourced and validated yet"
                  className="w-full text-left p-4 rounded-2xl border border-stone-100 bg-stone-50/40 flex items-start gap-3.5 select-none"
                  aria-disabled="true"
                >
                  <span className="w-9 h-9 rounded-xl bg-stone-100 text-stone-300 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-stone-400">{label}</span>
                      <span className="text-[9px] font-bold text-stone-300 uppercase tracking-wider whitespace-nowrap">Coming soon</span>
                    </div>
                    <p className="text-[11px] text-stone-300 truncate">
                      {item.act_name || 'Act to be confirmed from the official source'}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectState(item.id)}
                aria-pressed={isSelected}
                className={`w-full text-left p-4 rounded-2xl border transition flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] ${
                  isSelected
                    ? 'bg-amber-50/90 border-[#a03612] text-stone-900 shadow-sm ring-1 ring-[#a03612]/30'
                    : 'bg-stone-50/70 border-stone-200/90 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <span
                  className="w-9 h-9 rounded-xl bg-amber-100 text-[#a03612] flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l9-4 9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-5.45-9-12V6z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-stone-900">{label}</span>
                    {isSelected && (
                      <span className="text-xs font-bold text-[#a03612] flex items-center gap-1">
                        ✓ {t('activeMember') || 'Selected'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-[#a03612] truncate">{item.act_name}</p>
                  {item.description && (
                    <p className="text-[10px] text-stone-500 leading-snug">{item.description}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 gap-3">
          <span>The Multi-State Act 2002 is always cross-referenced.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
