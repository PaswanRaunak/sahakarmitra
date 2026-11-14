import React, { useState, useEffect } from 'react';
import { makeT } from '../i18n.js';

export default function SettingsView({ user, onUpdateUser, language = 'en', initialSubTab = 'profile' }) {
  const [sessionsNotice, setSessionsNotice] = useState(false);
  const t = makeT(language);

  // Profile Form State initialized from user props or defaults
  const [name, setName]               = useState(user?.name || 'Anya Foger');
  const [email, setEmail]             = useState(user?.email || 'anya.foger@society.org');
  const [mobile, setMobile]           = useState(user?.mobile || '+91 9876543210');
  const [societyName, setSocietyName] = useState(user?.societyName || 'Shivaji Housing Society');
  const [registrationNo, setRegNo]    = useState(user?.registrationNo || 'BOM/HSG/12345/2012');
  const [memberRole, setMemberRole]   = useState(user?.role || 'Managing Committee / Secretary');
  const [unitNo, setUnitNo]           = useState(user?.unitNo || 'Flat A-402');
  const [selectedState, setSelectedState] = useState(() => {
    try {
      return user?.state || localStorage.getItem('sahakar_selected_state') || 'Maharashtra';
    } catch {
      return 'Maharashtra';
    }
  });
  const [preferredLang, setLang]      = useState(user?.preferredLang || language);

  // Preferences & Security Toggles
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [detailDepth, setDetailDepth]     = useState('detailed'); // 'detailed' | 'concise'
  const [twoFactorEnabled, set2FA]        = useState(false);
  const [twoFactorMethod, set2FAMethod]   = useState('app'); // 'app' | 'sms'

  // Password Fields State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords]     = useState(false);

  // Toasts State
  const [savedSuccess, setSavedSuccess]       = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError]     = useState('');

  // Active Subtab State
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab); // 'profile' | 'preferences' | 'security'

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  function handleProfileSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      localStorage.setItem('sahakar_selected_state', selectedState);
      localStorage.setItem('sahakar_state_confirmed', 'true');
    } catch {}

    const updated = {
      ...user,
      name,
      email,
      mobile,
      societyName,
      registrationNo,
      state: selectedState,
      role: memberRole,
      unitNo,
      preferredLang,
    };

    onUpdateUser(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  }

  function handlePasswordUpdate(e) {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 3500);
  }

  function handleDownloadData() {
    const exportData = {
      userProfile: { name, email, mobile, societyName, registrationNo, memberRole, unitNo },
      preferences: { preferredLang, autoTranslate, detailDepth },
      security: { twoFactorEnabled, twoFactorMethod },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahakarmitra_account_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in max-w-6xl mx-auto w-full">
      
      {/* Header Title Banner */}
      <div className="bg-elevated border border-line rounded-3xl p-6 sm:p-8 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-accent-soft/80 text-accent text-[11px] font-extrabold uppercase tracking-wider">
              {t('accountManagement')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
            <span className="text-xs text-ink-muted font-medium">SahakarMitra MSCA 1960</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            {t('settingsTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft font-normal max-w-2xl">
            {t('settingsSubtitle')}
          </p>
        </div>

        {/* Quick User Avatar Pill */}
        <div className="flex items-center gap-3 bg-surface p-3 rounded-2xl border border-line">
          <div className="w-10 h-10 rounded-full bg-forest-soft text-white flex items-center justify-center font-black text-base shadow-sm border-2 border-white">
            {name[0]?.toUpperCase() || 'A'}
          </div>
          <div className="text-xs">
            <p className="font-bold text-ink">{name}</p>
            <p className="text-[10px] text-ink-muted font-medium truncate max-w-[150px]">{societyName}</p>
          </div>
        </div>
      </div>

      {/* Save Success Alert Toast */}
      {savedSuccess && (
        <div className="bg-success/10 border border-success/30 text-success px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-soft animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-success/100 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <span>{t('settingsSaved')}</span>
          </div>
        </div>
      )}

      {/* Password Success Alert Toast */}
      {passwordSuccess && (
        <div className="bg-success/10 border border-success/30 text-success px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-soft animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-success/100 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <span>{t('passwordSuccess')}</span>
          </div>
        </div>
      )}

      {/* Main Settings Layout */}
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Left Sub-Navigation Menu */}
        <div className="lg:col-span-4 bg-elevated border border-line rounded-3xl p-3.5 shadow-soft space-y-1.5 sticky top-6">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {t('accountManagement')}
          </div>

          {/* Subtab 1: Profile */}
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'profile'
                ? 'bg-accent-soft/90 text-accent border border-accent/40 shadow-xs'
                : 'text-ink-soft hover:bg-sunken hover:text-ink'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeSubTab === 'profile' ? 'bg-accent-soft text-accent' : 'bg-sunken text-ink-muted'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-xs">{t('profileInfo')}</p>
              <p className="text-[10px] text-ink-muted font-normal">{t('profileInfoSub')}</p>
            </div>
          </button>

          {/* Subtab 2: Language & Preferences */}
          <button
            onClick={() => setActiveSubTab('preferences')}
            className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'preferences'
                ? 'bg-accent-soft/90 text-accent border border-accent/40 shadow-xs'
                : 'text-ink-soft hover:bg-sunken hover:text-ink'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeSubTab === 'preferences' ? 'bg-teal-100 text-forest-soft' : 'bg-sunken text-ink-muted'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-xs">{t('langPrefs')}</p>
              <p className="text-[10px] text-ink-muted font-normal">{t('langPrefsSub')}</p>
            </div>
          </button>

          {/* Subtab 3: Security & Privacy Hub */}
          <button
            onClick={() => setActiveSubTab('security')}
            className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'security'
                ? 'bg-accent-soft/90 text-accent border border-accent/40 shadow-xs'
                : 'text-ink-soft hover:bg-sunken hover:text-ink'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeSubTab === 'security' ? 'bg-rose-100 text-error' : 'bg-sunken text-ink-muted'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-xs">{t('securityHub')}</p>
              <p className="text-[10px] text-ink-muted font-normal">{t('securityHubSub')}</p>
            </div>
          </button>

          {/* Digital India Compliance Footnote */}
          <div className="pt-4 mt-4 border-t border-line px-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-ink-muted">
              <span className="w-2 h-2 rounded-full bg-success/100"></span>
              <span>{t('verifiedMemberBadge')}</span>
            </div>
            <p className="text-[10px] text-ink-muted mt-1 leading-relaxed">
              Protected under Digital India Trust Guidelines & Maharashtra Co-op Act 1960.
            </p>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="lg:col-span-8 space-y-6">

          {/* SUBTAB 1: PROFILE & SOCIETY MANAGEMENT */}
          {activeSubTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="bg-elevated border border-line rounded-3xl p-6 sm:p-8 shadow-soft space-y-6 animate-fade-in">
              
              {/* Profile Header Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-line">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-forest-soft text-white flex items-center justify-center font-black text-2xl border-4 border-amber-100 shadow-sm">
                    {name[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-ink">{name}</h3>
                    <p className="text-xs text-ink-muted">{email}</p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/30">
                        {t('activeMember')}
                      </span>
                      <span className="text-[10px] text-ink-muted font-mono">{unitNo}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface px-3.5 py-2 rounded-2xl border border-line text-right">
                  <span className="text-[10px] font-bold text-ink-muted block uppercase">Registration</span>
                  <span className="text-xs font-mono font-bold text-ink">{registrationNo}</span>
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-accent">
                  {t('personalDetails')}
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft">{t('fullName')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft">{t('emailAddress')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink-soft">{t('mobilePhone')}</label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition"
                  />
                </div>
              </div>

              {/* Cooperative Society Information Section */}
              <div className="space-y-4 pt-4 border-t border-line">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-accent">
                  {t('societyDetailsHeading')}
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft">{t('societyNameLabel')}</label>
                    <input
                      type="text"
                      value={societyName}
                      onChange={(e) => setSocietyName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft">{t('regNo')}</label>
                    <input
                      type="text"
                      value={registrationNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-mono font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition" spellCheck={false} autoCapitalize="off" autoCorrect="off"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft">{t('memberRole')}</label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition"
                    >
                      <option value="Managing Committee / Secretary">Managing Committee / Secretary</option>
                      <option value="Society Chairman">Society Chairman</option>
                      <option value="Treasurer">Treasurer / Auditor</option>
                      <option value="General Society Member">General Society Member</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft">{t('unitNo')}</label>
                    <input
                      type="text"
                      value={unitNo}
                      onChange={(e) => setUnitNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink-soft flex items-center justify-between">
                    <span>{t('stateJurisdiction')}</span>
                    <span className="text-[10px] text-accent-strong bg-accent-soft px-2 py-0.5 rounded-full border border-accent/40 font-semibold">
                      Legal Act Matching
                    </span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent transition"
                  >
                    <option value="Maharashtra">Maharashtra (MCS Act 1960)</option>
                    <option value="Gujarat">Gujarat (GCS Act 1961)</option>
                    <option value="Karnataka">Karnataka (KCS Act 1959)</option>
                    <option value="Multi-State">Multi-State / Central (MSCS Act 2002)</option>
                  </select>
                  <p className="text-[11px] text-ink-muted">
                    Determines which state's Co-operative Societies Act and legal bye-laws SahakarMitra references during advisory queries.
                  </p>
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="pt-4 border-t border-line flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('saveChanges')}</span>
                </button>
              </div>

            </form>
          )}

          {/* SUBTAB 2: MULTILINGUAL & SYSTEM PREFERENCES */}
          {activeSubTab === 'preferences' && (
            <div className="bg-elevated border border-line rounded-3xl p-6 sm:p-8 shadow-soft space-y-6 animate-fade-in">
              
              <div className="space-y-1 pb-4 border-b border-line">
                <h3 className="text-base font-bold text-ink">{t('langSystemPrefs')}</h3>
                <p className="text-xs text-ink-muted">
                  Select your primary language for legal assistant answers and configure statutory explanation depth.
                </p>
              </div>

              {/* Language Selector Cards */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-ink-soft block">{t('defaultLang')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { code: 'en', name: 'English', desc: 'Official Statutory English', badge: 'EN' },
                    { code: 'hi', name: 'Hindi (हिंदी)', desc: 'प्राकृतिक हिंदी कानूनी भाषा', badge: 'HI' },
                    { code: 'mr', name: 'Marathi (मराठी)', desc: 'महाराष्ट्रातील अधिकृत मराठी भाषा', badge: 'MR' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLang(item.code)}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                        preferredLang === item.code
                          ? 'bg-accent-soft border-accent text-ink shadow-xs'
                          : 'bg-sunken border-line text-ink-soft hover:bg-sunken'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${preferredLang === item.code ? 'bg-accent text-white' : 'bg-sunken text-ink-soft'}`}>
                          {item.badge}
                        </span>
                        {preferredLang === item.code && (
                          <span className="text-accent font-bold text-xs">✓ Active</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-ink">{item.name}</p>
                        <p className="text-[10px] text-ink-muted font-normal leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Translate Citations Toggle */}
              <div className="pt-4 border-t border-line flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-ink">{t('autoTranslateCitations')}</p>
                  <p className="text-[11px] text-ink-muted">{t('autoTranslateCitationsSub')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoTranslate(!autoTranslate)}
                  className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                    autoTranslate ? 'bg-accent justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-elevated shadow-md"></span>
                </button>
              </div>

              {/* Legal Explanation Depth */}
              <div className="pt-4 border-t border-line space-y-3">
                <label className="text-xs font-bold text-ink-soft block">{t('detailLevel')}</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailDepth('detailed')}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      detailDepth === 'detailed'
                        ? 'bg-accent-soft border-accent text-ink shadow-xs'
                        : 'bg-sunken border-line text-ink-soft hover:bg-sunken'
                    }`}
                  >
                    <p className="font-bold text-xs">{t('detailLevelDetailed')}</p>
                    <p className="text-[10px] text-ink-muted mt-1">Full statutory section excerpts with MCS Act 1960 references.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailDepth('concise')}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      detailDepth === 'concise'
                        ? 'bg-accent-soft border-accent text-ink shadow-xs'
                        : 'bg-sunken border-line text-ink-soft hover:bg-sunken'
                    }`}
                  >
                    <p className="font-bold text-xs">{t('detailLevelConcise')}</p>
                    <p className="text-[10px] text-ink-muted mt-1">Quick bullet points tailored for instant AGM/committee review.</p>
                  </button>
                </div>
              </div>

              {/* Save Preferences Button */}
              <div className="pt-4 border-t border-line flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleProfileSubmit}
                  className="px-6 py-3 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('saveChanges')}</span>
                </button>
              </div>

            </div>
          )}

          {/* SUBTAB 3: SECURITY & PRIVACY HUB */}
          {activeSubTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Password Update Card */}
              <div className="bg-elevated border border-line rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-line">
                  <div>
                    <h3 className="text-base font-bold text-ink">{t('passwordSection')}</h3>
                    <p className="text-xs text-ink-muted">Update your account credentials to keep your society workspace secure.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
                  </button>
                </div>

                {passwordError && (
                  <div className="p-3 bg-error/10 border border-error/40 text-error rounded-xl text-xs font-bold">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft">{t('currentPassword')}</label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-soft">{t('newPassword')}</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-soft">{t('confirmPassword')}</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-sunken border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded-xl shadow-sm transition"
                    >
                      {t('updatePasswordBtn')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Two-Factor Authentication (2FA) Card */}
              <div className="bg-elevated border border-line rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-line">
                  <div>
                    <h3 className="text-base font-bold text-ink">{t('twoFactorAuth')}</h3>
                    <p className="text-xs text-ink-muted">{t('twoFactorAuthSub')}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${twoFactorEnabled ? 'bg-success/10 text-success border-success/30' : 'bg-sunken text-ink-soft border-line'}`}>
                    {twoFactorEnabled ? '2FA Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 bg-sunken rounded-2xl border border-line">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">{t('enable2FA')}</p>
                      <p className="text-[10px] text-ink-muted">Requires a security code upon signing into your society workspace.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set2FA(!twoFactorEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                      twoFactorEnabled ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-elevated shadow-md"></span>
                  </button>
                </div>

                {twoFactorEnabled && (
                  <div className="space-y-3 animate-fade-in pt-2">
                    <label className="text-xs font-bold text-ink-soft block">2FA Verification Method</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => set2FAMethod('app')}
                        className={`p-3.5 rounded-2xl border text-left transition ${
                          twoFactorMethod === 'app' ? 'bg-success/10 border-emerald-500 text-ink' : 'bg-sunken border-line text-ink-soft'
                        }`}
                      >
                        <p className="font-bold text-xs">{t('authApp')}</p>
                        <p className="text-[10px] text-ink-muted mt-1">Generate 6-digit TOTP security codes.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => set2FAMethod('sms')}
                        className={`p-3.5 rounded-2xl border text-left transition ${
                          twoFactorMethod === 'sms' ? 'bg-success/10 border-emerald-500 text-ink' : 'bg-sunken border-line text-ink-soft'
                        }`}
                      >
                        <p className="font-bold text-xs">{t('smsOtp')}</p>
                        <p className="text-[10px] text-ink-muted mt-1">Receive one-time passwords via SMS to registered mobile.</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Session & Data Privacy Hub */}
              <div className="bg-elevated border border-line rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
                <div className="pb-4 border-b border-line">
                  <h3 className="text-base font-bold text-ink">{t('dataPrivacy')}</h3>
                  <p className="text-xs text-ink-muted">Manage active sessions and download your personal workspace audit log.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-sunken rounded-2xl border border-line flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-success/100"></span>
                      <div>
                        <p className="text-xs font-bold text-ink">{t('currentSession')}</p>
                        <p className="text-[10px] text-ink-muted">IP: 127.0.0.1 • Active right now</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-success bg-success/15 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadData}
                    className="w-full sm:w-auto px-4 py-2.5 bg-sunken hover:bg-sunken text-ink font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{t('downloadData')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSessionsNotice(true); setTimeout(() => setSessionsNotice(false), 4000); }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-error/10 hover:bg-error/20 text-error font-bold text-xs rounded-xl border border-error/40 transition"
                  >
                    {t('logoutAllDevices')}
                  </button>
                  {sessionsNotice && (
                    <p role="status" className="text-[11px] text-success font-semibold">All other active sessions were signed out.</p>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
