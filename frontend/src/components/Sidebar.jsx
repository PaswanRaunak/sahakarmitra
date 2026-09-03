import React, { useState } from 'react';
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
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);

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

  // Handle navigation with mobile drawer auto-close
  const handleNav = (tab, customAction) => {
    if (customAction) customAction();
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Filter conversations
  const filteredChats = searchFilter.trim()
    ? chats.filter((c) => (c.title || '').toLowerCase().includes(searchFilter.toLowerCase().trim()))
    : chats;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        />
      )}

      {/* Upgraded Sidebar / Mobile Drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-[#f5f2ec] border-r border-stone-200/80 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-[82vw] max-w-[320px] md:w-72'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!isOpen ? 'md:hidden' : ''}`}
      >
        {/* Top Drawer Header: Logo + Title + Quick Actions */}
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

            <div className="flex items-center gap-1">
              {!isCollapsed && (
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  aria-label="Search conversations"
                  className="text-stone-500 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
                  title="Search chats"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              <button
                onClick={onClose}
                aria-label={t('closeSidebar')}
                className="md:hidden text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop New Chat Button */}
          <button
            onClick={() => handleNav('chat', onNewChat)}
            className={`hidden md:flex w-full py-2.5 px-3 bg-[#a03612] hover:bg-[#882c0e] text-white rounded-xl font-bold text-xs shadow-sm transition items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 ${
              isCollapsed ? 'px-2' : ''
            }`}
            title={t('newQuery')}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {!isCollapsed && <span className="truncate">{t('newQuery')}</span>}
          </button>

          {/* Search Input (Collapsible) */}
          {showSearch && !isCollapsed && (
            <div className="pt-1">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter chats..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#a03612]"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Main Navigation Items */}
        <div className="p-3 border-b border-stone-200/80 space-y-1">
          <button
            onClick={() => handleNav('dashboard')}
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
            onClick={() => handleNav('chat')}
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

          <button
            onClick={() => handleNav('library', () => window.history.pushState({}, '', '/library'))}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'library'
                ? 'bg-white text-[#a03612] shadow-soft border border-stone-200/80'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {!isCollapsed && <span>{t('libraryTab') || 'Knowledge Repository'}</span>}
          </button>

          <button
            onClick={() => handleNav('bookmarks')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'bookmarks'
                ? 'bg-white text-[#a03612] shadow-soft border border-stone-200/80'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {!isCollapsed && <span>{t('bookmarksTab') || 'Saved Sections'}</span>}
          </button>

          <button
            onClick={() => handleNav('experts')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'experts'
                ? 'bg-white text-[#a03612] shadow-soft border border-stone-200/80'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {!isCollapsed && <span>{t('expertsTab')}</span>}
          </button>
        </div>

        {/* Section Header: Recent Conversations */}
        {!isCollapsed && (
          <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            <span>{t('recentConversations')} ({filteredChats.length})</span>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 scrollbar-none">
          {filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId && activeTab === 'chat';
            const displayTitle = (chat.title && chat.title.trim().length > 0)
              ? chat.title
              : (chat.messages && chat.messages.length > 0 && chat.messages[0]?.text)
              ? chat.messages[0].text.slice(0, 30) + '...'
              : t('newQuery');

            return (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  handleNav('chat');
                }}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  isActive
                    ? 'bg-white text-[#a03612] shadow-soft border border-stone-200/80 font-bold'
                    : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
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

        {/* ChatGPT-Style Mobile Action Bottom Bar */}
        <div className="p-3 border-t border-stone-200/80 bg-white/90 backdrop-blur-sm">
          {/* Mobile Bottom Bar: Pill Chat Button + Avatar */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <button
              onClick={() => handleNav('chat', onNewChat)}
              className="flex-1 py-2.5 px-4 bg-[#a03612] active:bg-[#882c0e] text-white rounded-full font-bold text-xs shadow-md transition flex items-center justify-center gap-2 transform active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>{t('chatTab') || 'Chat'}</span>
            </button>

            <button
              onClick={() => handleNav('settings')}
              className="w-9 h-9 rounded-full bg-[#2d6a68] text-white flex items-center justify-center font-bold text-xs shadow-sm border border-stone-200 flex-shrink-0"
              title={userName}
            >
              {userName[0]?.toUpperCase() || 'R'}
            </button>
          </div>

          {/* Desktop Collapse Toggle & User Badge */}
          <div className="hidden md:block space-y-2">
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

            {/* Desktop User Profile Badge */}
            {!isCollapsed && (
              <div
                onClick={() => handleNav('settings')}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-stone-200/80 shadow-xs cursor-pointer hover:bg-stone-50 transition"
              >
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
        </div>

      </aside>
    </>
  );
}
