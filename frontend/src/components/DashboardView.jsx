import React, { useState } from 'react';
import { makeT } from '../i18n.js';

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

  return (
    <div className="flex-1 overflow-y-auto bg-[#faf8f5] p-6 space-y-8 animate-fade-in max-w-7xl mx-auto w-full">
      
      {/* ── 1. Top Greeting Banner (NyayGuru Style) ─────────────── */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background Accent Lines */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a03612]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#a03612] text-white flex items-center justify-center text-xl font-black shadow-md border border-white/10">
            {userName[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {greeting}, {userName}!
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
            className="flex-1 md:flex-none px-6 py-3 bg-[#a03612] hover:bg-[#882c0e] text-white rounded-full text-xs font-bold transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('newQuery')}</span>
          </button>

          <button
            onClick={onOpenWelcome}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 rounded-full text-xs font-semibold transition"
            title="Feature Overview"
          >
            {t('features')}
          </button>
        </div>
      </div>

      {/* ── 2. 4 Key Stats Cards (NyayGuru Style) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1 */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-soft hover:shadow-card transition duration-300 flex items-center justify-between group">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{t('statChats')}</p>
            <h3 className="text-2xl font-black text-stone-900 mt-1">{chats.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-[#a03612] group-hover:scale-110 transition">
            <svg className="w-6 h-6 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-soft hover:shadow-card transition duration-300 flex items-center justify-between group">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{t('statFiles')}</p>
            <h3 className="text-2xl font-black text-stone-900 mt-1">6 Files</h3>
          </div>
          <div className="p-3 rounded-xl bg-teal-50 text-[#2d6a68] group-hover:scale-110 transition">
            <svg className="w-6 h-6 text-[#2d6a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-soft hover:shadow-card transition duration-300 flex items-center justify-between group">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{t('statChunks')}</p>
            <h3 className="text-2xl font-black text-stone-900 mt-1">12 Chunks</h3>
          </div>
          <div className="p-3 rounded-xl bg-cyan-50 text-cyan-700 group-hover:scale-110 transition">
            <svg className="w-6 h-6 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-soft hover:shadow-card transition duration-300 flex items-center justify-between group">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{t('statQueries')}</p>
            <h3 className="text-2xl font-black text-stone-900 mt-1">100 / 100</h3>
          </div>
          <div className="p-3 rounded-xl bg-[#a03612]/10 text-[#a03612] group-hover:scale-110 transition">
            <svg className="w-6 h-6 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

      </div>

      {/* ── 3. Legal Tip of the Day Banner ──────────────────────── */}
      {showTip && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 shadow-soft animate-scale-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-[#a03612] text-white flex-shrink-0 mt-0.5 shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="text-amber-800/60 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100/60 transition"
            title="Dismiss Legal Tip"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── 4. Main Grid: Recent Chats + Favorite Guides ────────── */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Inquiries (NyayGuru Style) */}
        <div className="lg:col-span-7 bg-white border border-stone-200/80 rounded-3xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-base font-bold text-stone-900">{t('recentInquiries')}</h3>
            </div>
            <button
              onClick={onNewChat}
              className="text-xs font-bold text-[#a03612] hover:text-[#882c0e] transition"
            >
              {t('newInquiry')}
            </button>
          </div>

          <div className="space-y-3">
            {chats.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs font-normal">
                {t('noChats')}
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className="p-4 rounded-2xl bg-stone-50 hover:bg-amber-50/50 border border-stone-200/80 hover:border-amber-200 cursor-pointer transition flex items-center justify-between group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="p-2 rounded-xl bg-white border border-stone-200 text-[#a03612] group-hover:bg-[#a03612] group-hover:text-white transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 group-hover:text-[#a03612] truncate transition">
                        {chat.title || t('newConversation')}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-normal">
                        {chat.messages.length} {t('messagesExchanged')}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#a03612] group-hover:translate-x-1 transition flex items-center gap-1 flex-shrink-0">
                    <span>{t('open')}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Starred Legal Guidance */}
        <div className="lg:col-span-5 bg-white border border-stone-200/80 rounded-3xl p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <h3 className="text-base font-bold text-stone-900">{t('starredGuides')}</h3>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#a03612]"></span>
                <span>Society Registration (Section 5 and 6)</span>
              </h4>
              <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                Minimum 10 members required. Must submit 4 copies of proposed bylaws and promoter details to the Registrar.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2d6a68]"></span>
                <span>Election Disputes (Section 73C)</span>
              </h4>
              <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                Election petitions challenging committee election results must be presented within 30 days of result declaration.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span>Dispute Resolution (Section 91)</span>
              </h4>
              <p className="text-[11px] text-stone-600 leading-relaxed font-normal">
                Business disputes between members or committee members must be referred to the Co-operative Registrar for decision.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
