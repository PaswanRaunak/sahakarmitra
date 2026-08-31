import React from 'react';
import { makeT } from '../i18n.js';

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onClose,
  currentUser,
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  language = 'en',
}) {
  const t = makeT(language);

  const getDerivedName = (u) => {
    if (u?.name && u.name.trim().length > 1) return u.name.trim();
    if (u?.email && u.email.includes('@')) {
      const prefix = u.email.split('@')[0];
      const words = prefix.replace(/[._\-0-9]/g, ' ').trim().split(/\s+/);
      if (words.length > 0 && words[0]) {
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }
    return t('fallbackUser');
  };

  const userName = getDerivedName(currentUser);
  const societyName = (currentUser?.societyName && currentUser.societyName.trim().length > 1) ? currentUser.societyName : t('fallbackSociety');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        />
      )}

      {/* Upgraded Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-[#f5f2ec] border-r border-stone-200/80 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-72 sm:w-80'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!isOpen ? 'md:hidden' : ''}`}
      >
        {/* Top Branding & New Chat Button */}
        <div className="p-4 space-y-3 border-b border-stone-200/80 bg-[#faf8f5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-stone-900 font-bold text-xs uppercase tracking-wider overflow-hidden">
              <img
                src="/logo.jpg"
                alt="SahakarMitra Logo"
                className="w-8 h-8 rounded-xl shadow-xs border border-stone-200 object-cover flex-shrink-0"
              />
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="text-sm font-bold text-stone-900 tracking-tight block">SahakarMitra</span>
                  <span className="text-[10px] text-stone-400 font-medium font-mono block -mt-0.5">MSCA 1960</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label={t('closeSidebar')}
              className="md:hidden text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-200/60 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => { onNewChat(); setActiveTab('chat'); }}
            className={`w-full py-2.5 px-3 bg-[#a03612] hover:bg-[#882c0e] text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 ${
              isCollapsed ? 'px-2' : ''
            }`}
            title={t('newQuery')}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {!isCollapsed && <span className="truncate">{t('newQuery')}</span>}
          </button>
        </div>

        {/* Main Navigation Items */}
        <div className="p-3 border-b border-stone-200/80 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-white text-[#a03612] shadow-soft border border-stone-200/80'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            {!isCollapsed && <span>{t('dashboardTab')}</span>}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'chat'
                ? 'bg-white text-[#a03612] shadow-soft border border-stone-200/80'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {!isCollapsed && <span>{t('chatTab')}</span>}
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {!isCollapsed && (
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {t('recentConversations')} ({chats.length})
            </div>
          )}

          {chats.map((chat, idx) => {
            const isActive = activeTab === 'chat' && chat.id === activeChatId;
            const displayTitle = (chat.title && chat.title !== 'New Legal Inquiry')
              ? chat.title
              : `Inquiry #${chats.length - idx}`;

            return (
              <div
                key={chat.id}
                onClick={() => { onSelectChat(chat.id); setActiveTab('chat'); }}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-white text-stone-900 font-bold shadow-soft border border-stone-200/80'
                    : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 font-medium'
                }`}
                title={displayTitle}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <svg className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#a03612]' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {!isCollapsed && (
                    <span className="truncate">
                      {displayTitle}
                    </span>
                  )}
                </div>

                {/* Delete button */}
                {!isCollapsed && chats.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    aria-label={t('deleteChat')}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 p-1 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Expand / Collapse Toggle & User Badge */}
        <div className="p-3 border-t border-stone-200/80 bg-stone-100/60 space-y-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 text-xs font-semibold transition"
            title={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
          >
            <svg className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!isCollapsed && <span>{t('collapseSidebar')}</span>}
          </button>

          {/* User Profile Badge */}
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-stone-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-[#2d6a68] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {userName[0]?.toUpperCase() || 'R'}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-stone-900 truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-stone-500 truncate">
                  {societyName}
                </p>
              </div>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
