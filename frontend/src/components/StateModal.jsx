import React from 'react';
import { makeT } from '../i18n.js';

export const SUPPORTED_STATES = [
  { id: 'Maharashtra', name: 'Maharashtra', act: 'Maharashtra Cooperative Societies Act, 1960', icon: '🏛️', desc: 'Housing, urban banks, credit societies & district unions' },
  { id: 'Gujarat', name: 'Gujarat', act: 'Gujarat Co-operative Societies Act, 1961', icon: '🏢', desc: 'Urban co-ops, housing federations & sugar/credit societies' },
  { id: 'Karnataka', name: 'Karnataka', act: 'Karnataka Co-operative Societies Act, 1959', icon: '🏛️', desc: 'Housing co-ops, Apex banks & town credit societies' },
  { id: 'Multi-State', name: 'Multi-State', act: 'Multi-State Co-operative Societies Act, 2002', icon: '🇮🇳', desc: 'Central Act for societies operating across state borders' },
];

export default function StateModal({ isOpen, onClose, selectedState, onSelectState, language = 'en' }) {
  if (!isOpen) return null;
  const t = makeT(language);

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
              <span className="p-1.5 rounded-xl bg-amber-100 text-[#a03612] text-sm">📍</span>
              <h2 id="state-modal-title" className="text-lg font-bold text-stone-900">
                {t('selectState') || 'Select State / Jurisdiction'}
              </h2>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Choose your cooperative society's statutory jurisdiction to ground legal answers in the correct state legislation.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* State Option Cards */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {SUPPORTED_STATES.map((item) => {
            const isSelected = selectedState === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectState(item.id)}
                className={`w-full text-left p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-amber-50/90 border-[#a03612] text-stone-900 shadow-sm ring-1 ring-[#a03612]/30'
                    : 'bg-stone-50/70 border-stone-200/90 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <span className="text-2xl pt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-stone-900">{item.name}</span>
                    {isSelected && (
                      <span className="text-xs font-bold text-[#a03612] flex items-center gap-1">
                        ✓ {t('activeMember') || 'Selected'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-[#a03612] truncate">{item.act}</p>
                  <p className="text-[10px] text-stone-500 leading-snug">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <span>Multi-State Act 2002 is always cross-referenced</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
