import React, { useState, useEffect, useRef } from 'react';
import { makeT } from '../i18n.js';
import LanguageMenu from './LanguageMenu.jsx';

export default function DashboardHeader({
  language,
  setLanguage,
  theme = 'light',
  onToggleTheme,
  selectedState = 'Maharashtra',
  onOpenStatePicker,
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
  const profileMenuRef = useRef(null);
  const t = makeT(language);

  // Close the profile menu on outside click or Escape
  useEffect(() => {
    if (!showProfileMenu) return;
    const onPointer = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowProfileMenu(false); };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [showProfileMenu]);

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
    ? 'bg-success/100'
    : backendStatus === 'down'
    ? 'bg-error/100'
    : backendStatus === 'degraded'
    ? 'bg-accent-soft0'
    : 'bg-amber-400 animate-pulse';
  const statusText = backendStatus === 'ok'
    ? t('backendOnline')
    : backendStatus === 'down'
    ? t('backendOffline')
    : backendStatus === 'degraded'
    ? t('backendDegraded')
    : t('backendChecking');
  const statusTitle = `${statusText}, /api/health`;

  return (
    <header className="bg-header/95 backdrop-blur-md border-b border-line px-4 sm:px-6 py-3 flex-shrink-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Left Side: Sidebar Toggle + Dashboard Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            aria-label={t('menu')}
            className="p-2 text-ink-soft hover:text-accent bg-elevated border border-line rounded-xl shadow-xs transition hover:bg-sunken active:scale-95 flex items-center gap-2 text-xs font-bold"
            title={t('menu')}
          >
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">{t('menu')}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-ink-soft">
            <img src="/logo.jpg" alt="SahakarMitra Logo" className="w-6 h-6 rounded-lg shadow-xs border border-line object-cover" />
            <span className="text-accent">SahakarMitra</span>
            <span className="text-line">/</span>
            <span className="text-ink-muted font-medium">{t('workspaceTitle')}</span>
          </div>
        </div>

        {/* Center: Global Command Search Bar */}
        <div className="flex-1 max-w-md mx-2 relative">
          <svg className="w-4 h-4 text-ink-muted absolute left-3.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-full pl-10 pr-12 py-2 bg-elevated border border-line rounded-full text-xs text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-accent shadow-xs transition"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-2 text-[10px] font-mono text-ink-muted bg-sunken px-1.5 py-0.5 rounded border border-line">
            Ctrl+K
          </kbd>
        </div>

        {/* Right Side: Backend Status + Language Switcher + User Profile */}
        <div className="flex items-center gap-3">

          {/* Backend health indicator, surfaces a dead Chroma/Groq backend BEFORE the user types */}
          <div
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-elevated border border-line rounded-full text-xs font-semibold text-ink-soft shadow-xs"
            title={statusTitle}
          >
            <span className={`w-2 h-2 rounded-full ${statusColor}`} aria-hidden="true"></span>
            <span className="hidden lg:inline">{statusText}</span>
          </div>

          {/* State / Jurisdiction Selector */}
          <button
            onClick={onOpenStatePicker}
            aria-label={t('selectState') || 'Select State'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated border border-line rounded-full text-xs font-semibold text-ink-soft hover:bg-sunken hover:border-accent/40 transition shadow-xs active:scale-95"
            title={`${t('stateSelectorLabel') || 'State'}: ${selectedState}`}
          >
            <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-bold text-ink">{selectedState}</span>
            <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Theme Toggle (dark/light) */}
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex items-center justify-center w-8 h-8 bg-elevated border border-line rounded-full text-xs font-semibold text-ink-soft hover:bg-sunken transition shadow-xs active:scale-95"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : language === 'hi' ? 'mr' : 'en')}
            aria-label={t('switchLang')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated border border-line rounded-full text-xs font-semibold text-ink-soft hover:bg-sunken transition shadow-xs active:scale-95"
            title={t('switchLang')}
          >
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>{language.toUpperCase()}</span>
          </button>

          {/* User Profile Avatar with Clean Dropdown Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label={t('accountSettings')}
              aria-expanded={showProfileMenu}
              className="w-9 h-9 rounded-full bg-forest-soft text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition transform active:scale-95"
              title={t('accountSettings')}
            >
              {userName[0]?.toUpperCase() || 'R'}
            </button>

            {/* Clean Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-elevated border border-line rounded-2xl shadow-2xl py-3 z-50 animate-scale-in space-y-2">
                <div className="px-4 pb-2.5 border-b border-line space-y-1">
                  <p className="text-xs font-bold text-ink truncate">{userName}</p>
                  <p className="text-[11px] text-ink-muted truncate">{userEmail}</p>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success/100"></span>
                    <span className="text-[10px] text-ink-soft font-semibold truncate">{societyName}</span>
                  </div>
                </div>

                <div className="px-2 space-y-1 text-xs">
                  <button
                    onClick={() => { if (onOpenSettings) onOpenSettings(); setShowProfileMenu(false); }}
                    className="w-full text-left px-3 py-2 text-ink-soft hover:bg-surface hover:text-accent rounded-xl transition font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    <span>{t('accountSettings')}</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-error hover:bg-error/10 rounded-xl transition font-bold flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
