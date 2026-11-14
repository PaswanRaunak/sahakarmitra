import React, { useState, useEffect } from 'react';
import { makeT } from '../i18n.js';

export default function AuthModal({ initialMode = 'login', onClose, onSuccess, onGuest, language = 'en' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgotPassword'
  const [forgotSent, setForgotSent] = useState(false);
  const t = makeT(language);

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [agreed, setAgreed] = useState(true);

  // Feedback
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Escape closes the modal, baseline modal keyboard behaviour.
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

  // Helper to derive name dynamically from email
  const deriveNameFromEmail = (emailStr) => {
    if (!emailStr || !emailStr.includes('@')) return 'Cooperative Member';
    const prefix = emailStr.split('@')[0];
    const words = prefix.replace(/[._\-0-9]/g, ' ').trim().split(/\s+/);
    if (words.length > 0 && words[0]) {
      return words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    return 'Cooperative Member';
  };

  // Demo Login Handler
  const handleDemoLogin = (demoEmail, demoName, demoSociety) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess({
        name: demoName,
        email: demoEmail,
        societyName: demoSociety,
        role: 'Secretary',
        token: 'jwt-auth-' + Date.now()
      });
    }, 400);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('fillAll'));
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const cleanEmail = (email && email.includes('@')) ? email : 'member@society.org';
      const derivedName = name || deriveNameFromEmail(cleanEmail);
      onSuccess({
        name: derivedName,
        email: cleanEmail,
        societyName: societyName || 'Cooperative Housing Society',
        role: 'Member',
        token: 'jwt-auth-' + Date.now()
      });
    }, 600);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !societyName || !password) {
      setError(t('fillRegister'));
      return;
    }
    if (!agreed) {
      setError(t('mustAgree'));
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const cleanEmail = (email && email.includes('@')) ? email : 'member@society.org';
      onSuccess({
        name,
        email: cleanEmail,
        societyName,
        role: 'Member',
        token: 'jwt-auth-' + Date.now()
      });
    }, 700);
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError(t('enterEmail'));
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotSent(true);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >

      {/* Container Card */}
      <div className="bg-surface border border-line rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden grid lg:grid-cols-12 relative animate-scale-in">

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={t('closeAuth')}
          className="absolute top-4 right-4 z-20 p-2 text-ink-muted hover:text-ink-soft hover:bg-sunken/60 rounded-xl transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── LEFT PANEL: Brand Showcase (Dark Teal / Charcoal) ──────── */}
        <div className="lg:col-span-5 bg-banner text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden hidden sm:flex">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-forest/40 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

          {/* Top Brand Logo & Header */}
          <div className="space-y-6 z-10">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="SahakarMitra Logo"
                className="w-12 h-12 rounded-2xl shadow-md border-2 border-white/20 object-cover animate-float"
              />
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white leading-none">
                  Sahakar<span className="text-accent">Mitra</span>
                </h3>
                <p className="text-[10px] text-ink-muted font-mono mt-0.5 uppercase tracking-wider">
                  Cooperative Legal AI
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                Empowering Indian Cooperative Societies
              </h2>
              <p className="text-xs text-line leading-relaxed font-normal">
                Grounded in the Maharashtra Cooperative Societies Act, 1960. Get instant answers with verifiable section citations.
              </p>
            </div>

            {/* 3 Key Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 text-xs text-line">
                <div className="p-1.5 rounded-lg bg-accent/20 text-accent flex-shrink-0 mt-0.5 border border-accent/30">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Official MCS Act 1960, AGM & Election Rules</span>
              </div>

              <div className="flex items-start gap-3 text-xs text-line">
                <div className="p-1.5 rounded-lg bg-forest/100/20 text-teal-400 flex-shrink-0 mt-0.5 border border-forest/40">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Verifiable Legal Section & Excerpt Citations</span>
              </div>

              <div className="flex items-start gap-3 text-xs text-line">
                <div className="p-1.5 rounded-lg bg-accent-soft0/20 text-accent flex-shrink-0 mt-0.5 border border-accent/40">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Multilingual Support (English, Hindi, Marathi)</span>
              </div>
            </div>
          </div>

          {/* Bottom Trust Quote Badge */}
          <div className="z-10 pt-6 border-t border-white/10">
            <p className="text-[11px] text-ink-muted italic">
              "Trusted by cooperative housing societies, credit societies, and committee members across Maharashtra."
            </p>
          </div>

        </div>

        {/* ── RIGHT PANEL: Auth Form Workspace (Warm Cream) ────────── */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">

          {/* Segmented Mode Switcher Tab Bar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.jpg"
                  alt="SahakarMitra Logo"
                  className="w-7 h-7 rounded-lg shadow-xs border border-line object-cover sm:hidden"
                />
                <h3 className="text-lg font-black text-ink tracking-tight">
                  {mode === 'login' ? t('welcomeBack') : mode === 'register' ? t('createAccount') : t('resetPassword')}
                </h3>
              </div>

              <span className="text-xs font-bold text-accent bg-accent-soft px-2.5 py-1 rounded-full border border-accent/40">
                MCS Act 1960 AI
              </span>
            </div>

            {/* Tab Pills */}
            <div role="tablist" aria-label="Authentication mode" className="grid grid-cols-2 gap-2 bg-sunken/60 p-1.5 rounded-2xl text-xs font-bold">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => { setMode('login'); setError(''); }}
                className={`py-2 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  mode === 'login'
                    ? 'bg-elevated text-accent shadow-xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {t('signIn')}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => { setMode('register'); setError(''); }}
                className={`py-2 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  mode === 'register'
                    ? 'bg-elevated text-accent shadow-xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {t('createAccount')}
              </button>
            </div>

            {/* Demo-mode honesty note, the mock auth accepts anything, so say so. */}
            <p className="text-[11px] text-accent-strong bg-accent-soft border border-accent/40 rounded-xl px-3 py-2 font-semibold">
              {t('demoModeNote')}
            </p>
          </div>

          {/* Error Alert Toast */}
          {error && (
            <div role="alert" className="bg-error/10 border border-error/40 text-error px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-scale-in">
              <svg className="w-4 h-4 text-error flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── MODE 1: LOGIN FORM ─────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">

              <div className="space-y-1">
                <label htmlFor="auth-email" className="text-xs font-bold text-ink-soft">{t('emailOrMobile')}</label>
                <div className="relative">
                  <svg className="w-4 h-4 text-ink-muted absolute left-3.5 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <input
                    id="auth-email"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh.patil@society.org"
                    className="w-full pl-10 pr-4 py-2.5 bg-elevated border border-line rounded-xl text-xs text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="text-xs font-bold text-ink-soft">{t('password')}</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgotPassword')}
                    className="text-[11px] font-bold text-accent hover:underline"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <svg className="w-4 h-4 text-ink-muted absolute left-3.5 top-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('passwordHint')}
                    className="w-full pl-10 pr-10 py-2.5 bg-elevated border border-line rounded-xl text-xs text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-3 text-ink-muted hover:text-ink-soft"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{t('signInBtn')}</span>
                )}
              </button>

              {/* Guest path, removes the login wall for first-time users / judges */}
              {onGuest && (
                <button
                  type="button"
                  onClick={onGuest}
                  className="w-full py-2.5 bg-elevated border border-line hover:border-accent hover:text-accent text-ink-soft font-bold text-xs rounded-xl transition"
                >
                  {t('continueGuest')}
                </button>
              )}

              {/* One-Click Quick Demo Logins */}
              <div className="pt-3 border-t border-line space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted text-center">
                  {t('demoAccounts')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('anya.foger@society.org', 'Anya Foger', 'Shivaji Housing Society')}
                    className="p-2 bg-sunken hover:bg-accent-soft border border-line hover:border-accent/40 rounded-xl text-[11px] text-ink font-bold transition text-left truncate"
                  >
                    Anya Foger
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('ramesh.patil@society.org', 'Ramesh Patil', 'Sahakar Housing Society')}
                    className="p-2 bg-sunken hover:bg-accent-soft border border-line hover:border-accent/40 rounded-xl text-[11px] text-ink font-bold transition text-left truncate"
                  >
                    Ramesh Patil
                  </button>
                </div>
              </div>

            </form>
          )}

          {/* ── MODE 2: REGISTER FORM (Account Creation) ───────────── */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="reg-name" className="text-xs font-bold text-ink-soft">{t('fullNameLabel')}</label>
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2 bg-elevated border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-mobile" className="text-xs font-bold text-ink-soft">{t('mobileLabel')}</label>
                  <input
                    id="reg-mobile"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 bg-elevated border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="reg-email" className="text-xs font-bold text-ink-soft">{t('emailLabel')}</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. priya.sharma@society.org"
                  className="w-full px-3.5 py-2 bg-elevated border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="reg-society" className="text-xs font-bold text-ink-soft">{t('societyLabel')}</label>
                <input
                  id="reg-society"
                  type="text"
                  value={societyName}
                  onChange={(e) => setSocietyName(e.target.value)}
                  placeholder="e.g. Om Shanti Housing Society"
                  className="w-full px-3.5 py-2 bg-elevated border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="reg-password" className="text-xs font-bold text-ink-soft">{t('createPassword')}</label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordHint')}
                  className="w-full px-3.5 py-2 bg-elevated border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agreed"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent"
                />
                <label htmlFor="agreed" className="text-[11px] text-ink-soft">
                  {t('terms')}
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{t('createAccountBtn')}</span>
                )}
              </button>

            </form>
          )}

          {/* ── MODE 3: FORGOT PASSWORD ────────────────────────────── */}
          {mode === 'forgotPassword' && (
            <div className="space-y-4">
              {!forgotSent ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-ink-soft">
                    {t('forgotIntro')}
                  </p>

                  <div className="space-y-1">
                    <label htmlFor="forgot-email" className="text-xs font-bold text-ink-soft">{t('registeredEmail')}</label>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ramesh.patil@society.org"
                      className="w-full px-4 py-2.5 bg-elevated border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent shadow-xs"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{t('sendReset')}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="w-full text-center text-xs font-bold text-ink-soft hover:text-ink"
                  >
                    {t('backToSignIn')}
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4 animate-scale-in">
                  <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-ink">{t('resetSent')}</h4>
                  <p className="text-xs text-ink-soft">
                    {t('resetSentBody')} <span className="font-bold text-ink">{email}</span>. {t('resetSentDemo')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="px-6 py-2.5 bg-accent text-white text-xs font-bold rounded-xl shadow-sm hover:bg-accent-strong"
                  >
                    {t('returnSignIn')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Note */}
          <p className="text-[10px] text-ink-muted text-center pt-2 border-t border-line">
            Protected by SahakarMitra Cooperative AI Security & Privacy Policy.
          </p>

        </div>

      </div>

    </div>
  );
}
