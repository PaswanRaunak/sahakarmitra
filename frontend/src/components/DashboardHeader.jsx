import React, { useState } from 'react';
import { makeT } from '../i18n.js';

export default function DashboardHeader({
  language,
  setLanguage,
  user,
  onLogout,
  onGoHome,
  onOpenSettings,
  onToggleSidebar,
  isSidebarOpen,
  onNewChat,
  backendStatus = 'checking',
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const userName = getDerivedName(user);
  const userEmail = (user?.email && user.email.includes('@')) ? user.email : 'member@society.org';
  const societyName = (user?.societyName && user.societyName.trim().length > 1) ? user.societyName : t('fallbackSociety');

  // Backend / law-database connection indicator
  const statusColor = backendStatus === 'ok'
    ? 'bg-emerald-500'
    : backendStatus === 'down'
    ? 'bg-rose-500'
    : backendStatus === 'degraded'
    ? 'bg-amber-500'
    : 'bg-amber-400 animate-pulse';
  const statusText = backendStatus === 'ok'
    ? t('backendOnline')
    : backendStatus === 'down'
    ? t('backendOffline')
    : backendStatus === 'degraded'
    ? t('backendDegraded')
    : t('backendChecking');
  const statusTitle = `${statusText} — /api/health`;

  return (
    <header className="bg-[#faf8f5]/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 py-3 flex-shrink-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Left Side: Sidebar Toggle + Dashboard Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            aria-label={t('menu')}
            className="p-2 text-stone-600 hover:text-[#a03612] bg-white border border-stone-200/80 rounded-xl shadow-xs transition hover:bg-stone-50 active:scale-95 flex items-center gap-2 text-xs font-bold"
            title={t('menu')}
          >
            <svg className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">{t('menu')}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-stone-700">
            <img src="/logo.jpg" alt="SahakarMitra Logo" className="w-6 h-6 rounded-lg shadow-xs border border-stone-200 object-cover" />
            <span className="text-[#a03612]">SahakarMitra</span>
            <span className="text-stone-300">/</span>
            <span className="text-stone-500 font-medium">{t('workspaceTitle')}</span>
          </div>
        </div>

        {/* Center: Global Command Search Bar */}
        <div className="flex-1 max-w-md mx-2 relative">
          <svg className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-full pl-10 pr-12 py-2 bg-white border border-stone-200/90 rounded-full text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a03612] shadow-xs transition"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-2 text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
            Ctrl+K
          </kbd>
        </div>

        {/* Right Side: Backend Status + Language Switcher + User Profile */}
        <div className="flex items-center gap-3">

          {/* Backend health indicator — surfaces a dead Chroma/Groq backend BEFORE the user types */}
          <div
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200/90 rounded-full text-xs font-semibold text-stone-600 shadow-xs"
            title={statusTitle}
          >
            <span className={`w-2 h-2 rounded-full ${statusColor}`} aria-hidden="true"></span>
            <span className="hidden lg:inline">{statusText}</span>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : language === 'hi' ? 'mr' : 'en')}
            aria-label={t('switchLang')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-xs active:scale-95"
            title={t('switchLang')}
          >
            <svg className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>{language.toUpperCase()}</span>
          </button>

          {/* User Profile Avatar with Clean Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label={t('accountSettings')}
              className="w-9 h-9 rounded-full bg-[#2d6a68] text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition transform active:scale-95"
              title={t('accountSettings')}
            >
              {userName[0]?.toUpperCase() || 'R'}
            </button>

            {/* Clean Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-stone-200/90 rounded-2xl shadow-2xl py-3 z-50 animate-scale-in space-y-2">
                <div className="px-4 pb-2.5 border-b border-stone-100 space-y-1">
                  <p className="text-xs font-bold text-stone-900 truncate">{userName}</p>
                  <p className="text-[11px] text-stone-500 truncate">{userEmail}</p>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-stone-600 font-semibold truncate">{societyName}</span>
                  </div>
                </div>

                <div className="px-2 space-y-1 text-xs">
                  <button
                    onClick={() => { if (onOpenSettings) onOpenSettings(); setShowProfileMenu(false); }}
                    className="w-full text-left px-3 py-2 text-stone-700 hover:bg-[#faf8f5] hover:text-[#a03612] rounded-xl transition font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    <span>{t('accountSettings')}</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition font-bold flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
