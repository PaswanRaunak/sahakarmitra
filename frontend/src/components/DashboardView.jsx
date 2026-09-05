import React, { useState } from 'react';
import { makeT } from '../i18n.js';

// Live knowledge-base figures for the currently ingested corpus
// (parents-*.json / legal_docs_v*). Keep in step with `npm run ingest`.
const CORPUS = { sections: 64, clauses: 95, languages: 3, states: 4 };

export default function DashboardView({
  user,
  chats,
  onSelectChat,
  onNewChat,
  onOpenDocs,
  onOpenWelcome,
  language = 'en'
}) {
  const [showTip, setShowTip] = useState(true);
  const t = makeT(language);

  // Time of day greeting
  const hour = new Date().getHours();
  const getDerivedName = (u) => {
    if (u?.name && u.name.trim().length > 1) return u.name.trim();
    if (u?.email && u.email.includes('@')) {
      const prefix = u.email.split('@')[0];
      const words = prefix.replace(/[._\-0-9]/g, ' ').trim().split(/\s+/);
      if (words.length > 0 && words[0]) {
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }
    return 'Cooperative Member';
  };

  const greeting = hour < 12 ? t('goodMorning') : hour < 17 ? t('goodAfternoon') : t('goodEvening');
  const userName = getDerivedName(user);

  const stats = [
    { label: t('statChats'), value: chats.length },
    { label: t('statSections') || 'Statute sections', value: CORPUS.sections },
    { label: t('statClauses') || 'Indexed clauses', value: CORPUS.clauses },
    { label: 'Jurisdictions', value: CORPUS.states },
  ];

  const GUIDES = [
    {
      dot: 'bg-[#a03612]',
      title: 'Society Registration (Section 5 and 6)',
      body: 'Minimum 10 members required. Must submit 4 copies of proposed bylaws and promoter details to the Registrar.',
    },
    {
      dot: 'bg-[#2d6a68]',
      title: 'Election Disputes (Section 73C)',
      body: 'Election petitions challenging committee election results must be presented within 30 days of result declaration.',
    },
    {
      dot: 'bg-amber-600',
      title: 'Dispute Resolution (Section 91)',
      body: 'Business disputes between members or committee members must be referred to the Co-operative Registrar for decision.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#faf8f5] p-6 space-y-8 animate-fade-in max-w-7xl mx-auto w-full">

      {/* ── 1. Greeting banner ─────────────────────────────────── */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-diffuse flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a03612]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" aria-hidden="true" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#a03612] text-white flex items-center justify-center text-xl font-black shadow-md border border-white/10">
            {userName[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white text-balance">
                {greeting}, {userName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                {t('memberBadge')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 font-normal mt-1">
              {t('dashboardWelcome')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 z-10 w-full md:w-auto">
          <button
            onClick={onNewChat}
            className="flex-1 md:flex-none px-6 py-3 bg-[#a03612] hover:bg-[#882c0e] text-white rounded-full text-xs font-bold transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('newQuery')}</span>
          </button>

          <button
            onClick={onOpenWelcome}
            aria-label="Feature overview"
            className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t('features')}
          </button>
        </div>
      </div>

      {/* ── 2. Knowledge-base figures: one ruled strip, no boxes ── */}
      <dl className="border-y border-stone-200/70 grid grid-cols-2 md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-5 ${i % 2 === 1 ? 'pl-5' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-stone-200/70' : ''} md:px-5 ${i === 0 ? 'md:pl-0' : ''} stagger`} style={{ '--i': i }}>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{s.label}</dt>
            <dd className="text-2xl font-black text-stone-900 mt-1 tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* ── 3. Legal tip of the day ────────────────────────────── */}
      {showTip && (
        <div role="status" className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 shadow-soft animate-scale-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-[#a03612] text-white flex-shrink-0 mt-0.5 shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#a03612] uppercase tracking-wider">
                {t('tipTitle')}
              </h4>
              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-normal">
                {t('tipBody')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTip(false)}
            aria-label="Dismiss legal tip"
            className="text-amber-800/60 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── 4. Main grid: recent inquiries + starred guides ────── */}
      <div className="grid lg:grid-cols-12 gap-8">

        {/* Left column: recent inquiries */}
        <div className="lg:col-span-7 bg-white border border-stone-200/80 rounded-3xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-base font-bold text-stone-900">{t('recentInquiries')}</h3>
            <button
              onClick={onNewChat}
              className="text-xs font-bold text-[#a03612] hover:text-[#882c0e] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] rounded"
            >
              {t('newInquiry')}
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {chats.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs font-normal">
                {t('noChats')}
              </div>
            ) : (
              chats.map((chat, idx) => (
                <div
                  key={chat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectChat(chat.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectChat(chat.id); } }}
                  className="stagger py-3.5 flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] rounded-xl px-2 -mx-2 hover:bg-amber-50/40"
                  style={{ '--i': Math.min(idx, 8) }}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <span className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-[#a03612] group-hover:bg-[#a03612] group-hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-[#a03612] truncate block transition-colors">
                        {chat.title || t('newConversation')}
                      </span>
                      <span className="text-[11px] text-stone-500 font-normal block tabular-nums">
                        {chat.messages.length} {t('messagesExchanged')}
                      </span>
                    </span>
                  </div>

                  <span className="text-xs font-bold text-[#a03612] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition flex items-center gap-1 flex-shrink-0">
                    <span>{t('open')}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: starred legal guidance */}
        <div className="lg:col-span-5 bg-white border border-stone-200/80 rounded-3xl p-6 shadow-soft space-y-4">
          <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">{t('starredGuides')}</h3>

          <div className="space-y-4">
            {GUIDES.map((g) => (
              <div key={g.title} className="space-y-1">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${g.dot}`} aria-hidden="true"></span>
                  <span>{g.title}</span>
                </h4>
                <p className="text-[11px] text-stone-600 leading-relaxed font-normal pl-3.5">
                  {g.body}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
