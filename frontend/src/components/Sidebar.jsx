import React, { useState, useEffect, useRef } from 'react';
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
  onLogout,
  onOpenHelp,
  onOpenSettingsTab,
}) {
  const t = makeT(language);
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const getDerivedName = (u) => {
    if (u?.name && u.name.trim().length > 1) return u.name.trim();
    if (u?.email && u.email.includes('@')) {
      const prefix = u.email.split('@')[0];
      const words = prefix.replace(/[._\-0-9]/g, ' ').trim().split(/\s+/);
      if (words.length > 0 && words[0]) {
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }
    return 'Anya Foger';
  };

  const userName = getDerivedName(currentUser);
  const societyName = (currentUser?.societyName && currentUser.societyName.trim().length > 1)
    ? currentUser.societyName
    : 'Shivaji Housing Society';
  const memberRole = currentUser?.role || 'Managing Committee';

  // Handle outside click to close user menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Handle navigation with mobile auto-close
  const handleNav = (tab, customAction) => {
    if (customAction) customAction();
    setActiveTab(tab);
    setShowUserMenu(false);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleOpenSubTab = (subTab) => {
    if (onOpenSettingsTab) {
      onOpenSettingsTab(subTab);
    } else {
      setActiveTab('settings');
    }
    setShowUserMenu(false);
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
          aria-hidden="true"
          className="md:hidden fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        />
      )}

      {/* Sidebar (Responsive: Original PC Design + ChatGPT-style Mobile Drawer) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-[#f5f2ec] border-r border-stone-200/80 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-[82vw] max-w-[320px] md:w-72 sm:md:w-80'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!isOpen ? 'md:hidden' : ''}`}
      >
        {/* Top Header */}
        <div className="p-4 space-y-3 border-b border-stone-200/80 bg-[#faf8f5] flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Branding */}
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

            {/* Mobile Header Actions (Search & Close) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                aria-label="Search conversations"
                className="md:hidden text-stone-500 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
                title="Search chats"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              <button
                onClick={onClose}
                aria-label={t('closeSidebar')}
                className="md:hidden text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* PC Desktop ONLY: Top "+ New Legal Query" Button */}
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

          {/* Mobile Collapsible Search Input */}
          {showSearch && (
            <div className="md:hidden pt-1">
              <input
                type="search"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations…"
                aria-label="Search conversations"
                className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#a03612]"
              />
            </div>
          )}
        </div>

        {/* Main Navigation Items */}
        <div className="p-3 border-b border-stone-200/80 space-y-1 flex-shrink-0">
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
          <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider flex-shrink-0">
            <span>{t('recentConversations')} ({filteredChats.length})</span>
          </div>
        )}

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 scrollbar-none pb-20 md:pb-2">
          {filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId && activeTab === 'chat';
            const displayTitle = (chat.title && chat.title.trim().length > 0)
              ? chat.title
              : (chat.messages && chat.messages.length > 0 && chat.messages[0]?.text)
              ? chat.messages[0].text.slice(0, 30) + '…'
              : t('newQuery');

            return (
              <div
                key={chat.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectChat(chat.id);
                  handleNav('chat');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectChat(chat.id);
                    handleNav('chat');
                  }
                }}
                aria-current={isActive ? 'true' : undefined}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] ${
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
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-stone-400 hover:text-rose-600 p-1 transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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

        {/* BOTTOM AREA & USER POPOVER MENU CONTAINER */}
        <div className="relative" ref={userMenuRef}>

          {/* SAHAKARMITRA FUNCTIONAL USER PROFILE POPOVER MENU */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white text-stone-900 border border-stone-200/90 rounded-2xl shadow-2xl p-2 z-50 animate-scale-in text-xs select-none">
              
              {/* Menu Top: User Profile Tile */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOpenSubTab('profile')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenSubTab('profile'); } }}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#faf8f5] cursor-pointer transition border border-stone-100 mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#2d6a68] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                    {userName[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 text-xs truncate leading-tight">{userName}</p>
                    <p className="text-[10px] text-stone-500 truncate leading-tight mt-0.5">{societyName}</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Functional Menu Options */}
              <div className="space-y-0.5 pt-1">
                {/* 1. Profile & Society Details */}
                <button
                  onClick={() => handleOpenSubTab('profile')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 hover:text-[#a03612] hover:bg-[#faf8f5] transition text-left"
                >
                  <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-semibold">{t('profile') || 'Profile & Society Details'}</span>
                </button>

                {/* 2. Preferences & Language */}
                <button
                  onClick={() => handleOpenSubTab('preferences')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 hover:text-[#a03612] hover:bg-[#faf8f5] transition text-left"
                >
                  <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="font-semibold">{t('preferences') || 'Preferences & Language'}</span>
                </button>

                {/* 3. Security & 2FA */}
                <button
                  onClick={() => handleOpenSubTab('security')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-700 hover:text-[#a03612] hover:bg-[#faf8f5] transition text-left"
                >
                  <svg className="w-4 h-4 text-[#a03612] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-semibold">{t('securityHub') || 'Security & Access'}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="my-1.5 border-t border-stone-100" />

              {/* Help & Logout */}
              <div className="space-y-0.5">
                <button
                  onClick={() => { if (onOpenHelp) onOpenHelp(); setShowUserMenu(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-stone-700 hover:text-[#a03612] hover:bg-[#faf8f5] transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-stone-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-semibold">Help & Legal Tour</span>
                  </div>
                  <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => { if (onLogout) onLogout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition text-left font-bold"
                >
                  <svg className="w-4 h-4 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{t('logout') || 'Log out'}</span>
                </button>
              </div>

            </div>
          )}

          {/* MOBILE ONLY: Floating Action Bar */}
          <div className="md:hidden p-3 bg-[#f5f2ec] border-t border-stone-200/80">
            <div className="flex items-center justify-between gap-3">
              {/* Terracotta Pill Button */}
              <button
                onClick={() => handleNav('chat', onNewChat)}
                className="flex-1 py-3 px-5 bg-[#a03612] active:bg-[#882c0e] text-white rounded-full font-bold text-xs shadow-md transition flex items-center justify-center gap-2 transform active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>{t('newQuery')}</span>
              </button>

              {/* Mobile User Avatar Circle (Toggles Popup Menu) */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label={`${userName}, open profile menu`}
                aria-expanded={showUserMenu}
                className="w-10 h-10 rounded-full bg-[#2d6a68] text-white flex items-center justify-center font-bold text-xs shadow-sm border-2 border-white flex-shrink-0 transition active:scale-95 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
                title={userName}
              >
                {userName[0]?.toUpperCase() || 'A'}
              </button>
            </div>
          </div>

          {/* PC DESKTOP ONLY: Collapse Toggle & Desktop User Profile Card */}
          <div className="hidden md:block p-3 border-t border-stone-200/80 bg-stone-100/60 space-y-2 flex-shrink-0">
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

            {/* Desktop User Profile Card (Clicking toggles the menu) */}
            {!isCollapsed && (
              <div
                role="button"
                tabIndex={0}
                aria-expanded={showUserMenu}
                onClick={() => setShowUserMenu(!showUserMenu)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowUserMenu(!showUserMenu); } }}
                className={`flex items-center gap-2.5 p-2 rounded-xl bg-white border border-stone-200/80 shadow-xs cursor-pointer hover:bg-stone-50 transition active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] ${
                  showUserMenu ? 'ring-2 ring-[#a03612]/30 border-[#a03612]' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#2d6a68] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                  {userName[0]?.toUpperCase() || 'A'}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-bold text-stone-900 truncate">
                    {userName}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {societyName}
                  </p>
                </div>
                <svg className={`w-3.5 h-3.5 text-stone-400 transform transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
              </div>
            )}
          </div>

        </div>

      </aside>
    </>
  );
}
