import React, { useEffect } from 'react';
import { makeT } from '../i18n.js';

export default function WelcomeModal({ onClose, onStartChat, language = 'en' }) {
  const t = makeT(language);

  // Escape closes the modal.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Click on the dark backdrop (not the card) closes the modal.
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="bg-[#faf8f5] border border-stone-200/90 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative animate-scale-in">

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <img
            src="/logo.jpg"
            alt="SahakarMitra Logo"
            className="w-16 h-16 rounded-2xl shadow-md border border-amber-200 object-cover mx-auto"
          />
          <h2 id="welcome-title" className="text-2xl font-black text-stone-900 tracking-tight">
            {t('welcomeModalTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 font-normal">
            {t('welcomeModalSubtitle')}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="space-y-3">

          {/* Feature 1 */}
          <button
            type="button"
            onClick={() => { onStartChat(); onClose(); }}
            className="w-full text-left p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-[#a03612]/40 flex items-start gap-3.5 cursor-pointer transition shadow-xs hover:shadow-soft group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
          >
            <div className="p-2 rounded-xl bg-amber-50 text-[#a03612] group-hover:bg-[#a03612] group-hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 group-hover:text-[#a03612] transition block">
                {t('feature1Title')}
              </span>
              <p className="text-[11px] text-stone-500 leading-snug">
                {t('feature1Body')}
              </p>
            </div>
          </button>

          {/* Feature 2 */}
          <button
            type="button"
            onClick={() => { onStartChat(); onClose(); }}
            className="w-full text-left p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-[#2d6a68]/40 flex items-start gap-3.5 cursor-pointer transition shadow-xs hover:shadow-soft group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
          >
            <div className="p-2 rounded-xl bg-teal-50 text-[#2d6a68] group-hover:bg-[#2d6a68] group-hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 group-hover:text-[#2d6a68] transition block">
                {t('feature2Title')}
              </span>
              <p className="text-[11px] text-stone-500 leading-snug">
                {t('feature2Body')}
              </p>
            </div>
          </button>

          {/* Feature 3 */}
          <button
            type="button"
            onClick={() => { onStartChat(); onClose(); }}
            className="w-full text-left p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 flex items-start gap-3.5 cursor-pointer transition shadow-xs hover:shadow-soft group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
          >
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 group-hover:bg-cyan-700 group-hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 group-hover:text-cyan-800 transition block">
                {t('feature3Title')}
              </span>
              <p className="text-[11px] text-stone-500 leading-snug">
                {t('feature3Body')}
              </p>
            </div>
          </button>

        </div>

        {/* CTA Button */}
        <button
          onClick={() => { onStartChat(); onClose(); }}
          className="w-full py-3.5 bg-[#a03612] hover:bg-[#882c0e] text-white font-bold text-xs rounded-2xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>{t('getStarted')}</span>
        </button>

        {/* Disclaimer */}
        <p className="text-[10px] text-center text-stone-400 leading-tight">
          {t('welcomeDisclaimer')}
        </p>

      </div>
    </div>
  );
}
