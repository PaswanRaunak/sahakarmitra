import React, { useState } from 'react';
import { makeT } from '../i18n.js';

export default function CitationCard({ source, index, language = 'en' }) {
  const [open, setOpen] = useState(false);
  const t = makeT(language);

  // Clean section title and remove any em dashes
  const cleanSection = (source.section || `Reference [${index + 1}]`).replace(/—/g, ':');
  const cleanFileName = (source.source_file || '').replace(/—/g, ':');
  const actName = source.act_name || 'Cooperative Societies Act';
  const state = source.state || 'Maharashtra';

  return (
    <div className="border border-stone-200/90 rounded-xl bg-stone-50 overflow-hidden text-xs transition duration-200 hover:border-stone-300 shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-3.5 py-2.5 font-semibold flex items-center justify-between hover:bg-stone-100/80 transition-colors text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <span className="text-[#a03612] font-bold flex-shrink-0">[{index + 1}]</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-[#a03612] font-bold text-[9px] flex-shrink-0">
            {state}
          </span>
          {source.isCrossState && (
            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[9px] flex-shrink-0">
              Cross-State
            </span>
          )}
          <span className="truncate max-w-sm">{cleanSection}</span>
        </span>
        <span className="text-stone-400 text-[10px] flex items-center gap-1 font-medium flex-shrink-0">
          <span>{open ? t('hideExcerpt') : t('viewExcerpt')}</span>
          <svg className={`w-3 h-3 transform transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      
      {open && (
        <div className="px-3.5 pb-3 pt-2 text-[11px] text-stone-600 border-t border-stone-200/80 bg-white space-y-2 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 text-stone-500 text-[10px]">
            <span className="font-bold text-[#a03612] bg-[#a03612]/5 px-2 py-0.5 rounded">
              {actName}
            </span>
            <span className="text-stone-300">•</span>
            <div className="flex items-center gap-1 font-mono">
              <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>{t('sourceFile')}</span>
              <span className="font-semibold text-stone-700">{cleanFileName}</span>
            </div>
          </div>
          <div className="italic leading-relaxed text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-100/80">
            "{source.excerpt}"
          </div>
        </div>
      )}
    </div>
  );
}
