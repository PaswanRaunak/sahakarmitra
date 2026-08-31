import React, { useState } from 'react';
import { makeT } from '../i18n.js';

export default function SettingsView({ user, onUpdateUser, language = 'en' }) {
  const t = makeT(language);

  // Profile Form State initialized from user props or defaults
  const [name, setName]               = useState(user?.name || 'Anya Foger');
  const [email, setEmail]             = useState(user?.email || 'anya.foger@society.org');
  const [mobile, setMobile]           = useState(user?.mobile || '+91 9876543210');
  const [societyName, setSocietyName] = useState(user?.societyName || 'Shivaji Housing Society');
  const [registrationNo, setRegNo]    = useState(user?.registrationNo || 'BOM/HSG/12345/2012');
  const [memberRole, setMemberRole]   = useState(user?.role || 'Managing Committee / Secretary');
  const [unitNo, setUnitNo]           = useState(user?.unitNo || 'Flat A-402');
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
  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'preferences' | 'security'

  function handleProfileSubmit(e) {
    e.preventDefault();
    const updated = {
      ...user,
      name,
      email,
      mobile,
      societyName,
      registrationNo,
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
    <div className="flex-1 overflow-y-auto bg-[#faf8f5] p-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in max-w-6xl mx-auto w-full">
      
      {/* Header Title Banner */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 text-[#a03612] text-[11px] font-extrabold uppercase tracking-wider">
              {t('accountManagement')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
            <span className="text-xs text-stone-500 font-medium">SahakarMitra MSCA 1960</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {t('settingsTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 font-normal max-w-2xl">
            {t('settingsSubtitle')}
          </p>
        </div>

        {/* Quick User Avatar Pill */}
        <div className="flex items-center gap-3 bg-[#faf8f5] p-3 rounded-2xl border border-stone-200/80">
          <div className="w-10 h-10 rounded-full bg-[#2d6a68] text-white flex items-center justify-center font-black text-base shadow-sm border-2 border-white">
            {name[0]?.toUpperCase() || 'A'}
          </div>
          <div className="text-xs">
            <p className="font-bold text-stone-900">{name}</p>
            <p className="text-[10px] text-stone-500 font-medium truncate max-w-[150px]">{societyName}</p>
          </div>
        </div>
      </div>

      {/* Save Success Alert Toast */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-soft animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <span>{t('settingsSaved')}</span>
          </div>
        </div>
      )}

      {/* Password Success Alert Toast */}
      {passwordSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-soft animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <span>{t('passwordSuccess')}</span>
          </div>
        </div>
      )}

      {/* Main Settings Layout */}
      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Left Sub-Navigation Menu */}
        <div className="lg:col-span-4 bg-white border border-stone-200/80 rounded-3xl p-3.5 shadow-soft space-y-1.5 sticky top-6">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {t('accountManagement')}
          </div>

          {/* Subtab 1: Profile */}
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'profile'
                ? 'bg-amber-50/90 text-[#a03612] border border-amber-200/90 shadow-xs'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeSubTab === 'profile' ? 'bg-amber-100 text-[#a03612]' : 'bg-stone-100 text-stone-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-xs">{t('profileInfo')}</p>
              <p className="text-[10px] text-stone-500 font-normal">{t('profileInfoSub')}</p>
            </div>
          </button>

          {/* Subtab 2: Language & Preferences */}
          <button
            onClick={() => setActiveSubTab('preferences')}
            className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'preferences'
                ? 'bg-amber-50/90 text-[#a03612] border border-amber-200/90 shadow-xs'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeSubTab === 'preferences' ? 'bg-teal-100 text-[#2d6a68]' : 'bg-stone-100 text-stone-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-xs">{t('langPrefs')}</p>
              <p className="text-[10px] text-stone-500 font-normal">{t('langPrefsSub')}</p>
            </div>
          </button>

          {/* Subtab 3: Security & Privacy Hub */}
          <button
            onClick={() => setActiveSubTab('security')}
            className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'security'
                ? 'bg-amber-50/90 text-[#a03612] border border-amber-200/90 shadow-xs'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeSubTab === 'security' ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-xs">{t('securityHub')}</p>
              <p className="text-[10px] text-stone-500 font-normal">{t('securityHubSub')}</p>
            </div>
          </button>

          {/* Digital India Compliance Footnote */}
          <div className="pt-4 mt-4 border-t border-stone-100 px-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{t('verifiedMemberBadge')}</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">
              Protected under Digital India Trust Guidelines & Maharashtra Co-op Act 1960.
            </p>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="lg:col-span-8 space-y-6">

          {/* SUBTAB 1: PROFILE & SOCIETY MANAGEMENT */}
          {activeSubTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-soft space-y-6 animate-fade-in">
              
              {/* Profile Header Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#2d6a68] text-white flex items-center justify-center font-black text-2xl border-4 border-amber-100 shadow-sm">
                    {name[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-stone-900">{name}</h3>
                    <p className="text-xs text-stone-500">{email}</p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        {t('activeMember')}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{unitNo}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#faf8f5] px-3.5 py-2 rounded-2xl border border-stone-200 text-right">
                  <span className="text-[10px] font-bold text-stone-400 block uppercase">Registration</span>
                  <span className="text-xs font-mono font-bold text-stone-800">{registrationNo}</span>
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#a03612]">
                  {t('personalDetails')}
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('fullName')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612] transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('emailAddress')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612] transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">{t('mobilePhone')}</label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612] transition"
                  />
                </div>
              </div>

              {/* Cooperative Society Information Section */}
              <div className="space-y-4 pt-4 border-t border-stone-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#a03612]">
                  {t('societyDetailsHeading')}
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('societyNameLabel')}</label>
                    <input
                      type="text"
                      value={societyName}
                      onChange={(e) => setSocietyName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612] transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('regNo')}</label>
                    <input
                      type="text"
                      value={registrationNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612] transition"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('memberRole')}</label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612] transition"
                    >
                      <option value="Managing Committee / Secretary">Managing Committee / Secretary</option>
                      <option value="Society Chairman">Society Chairman</option>
                      <option value="Treasurer">Treasurer / Auditor</option>
                      <option value="General Society Member">General Society Member</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('unitNo')}</label>
                    <input
                      type="text"
                      value={unitNo}
                      onChange={(e) => setUnitNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#a03612] hover:bg-[#882c0e] text-white font-bold text-xs rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('saveChanges')}</span>
                </button>
              </div>

            </form>
          )}

          {/* SUBTAB 2: MULTILINGUAL & SYSTEM PREFERENCES */}
          {activeSubTab === 'preferences' && (
            <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-soft space-y-6 animate-fade-in">
              
              <div className="space-y-1 pb-4 border-b border-stone-100">
                <h3 className="text-base font-bold text-stone-900">{t('langSystemPrefs')}</h3>
                <p className="text-xs text-stone-500">
                  Select your primary language for legal assistant answers and configure statutory explanation depth.
                </p>
              </div>

              {/* Language Selector Cards */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-700 block">{t('defaultLang')}</label>
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
                          ? 'bg-amber-50/80 border-[#a03612] text-stone-900 shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${preferredLang === item.code ? 'bg-[#a03612] text-white' : 'bg-stone-200 text-stone-700'}`}>
                          {item.badge}
                        </span>
                        {preferredLang === item.code && (
                          <span className="text-[#a03612] font-bold text-xs">✓ Active</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-stone-900">{item.name}</p>
                        <p className="text-[10px] text-stone-500 font-normal leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Translate Citations Toggle */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-stone-900">{t('autoTranslateCitations')}</p>
                  <p className="text-[11px] text-stone-500">{t('autoTranslateCitationsSub')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoTranslate(!autoTranslate)}
                  className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                    autoTranslate ? 'bg-[#a03612] justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                </button>
              </div>

              {/* Legal Explanation Depth */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <label className="text-xs font-bold text-stone-700 block">{t('detailLevel')}</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailDepth('detailed')}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      detailDepth === 'detailed'
                        ? 'bg-amber-50/80 border-[#a03612] text-stone-900 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <p className="font-bold text-xs">{t('detailLevelDetailed')}</p>
                    <p className="text-[10px] text-stone-500 mt-1">Full statutory section excerpts with MCS Act 1960 references.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailDepth('concise')}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      detailDepth === 'concise'
                        ? 'bg-amber-50/80 border-[#a03612] text-stone-900 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <p className="font-bold text-xs">{t('detailLevelConcise')}</p>
                    <p className="text-[10px] text-stone-500 mt-1">Quick bullet points tailored for instant AGM/committee review.</p>
                  </button>
                </div>
              </div>

              {/* Save Preferences Button */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleProfileSubmit}
                  className="px-6 py-3 bg-[#a03612] hover:bg-[#882c0e] text-white font-bold text-xs rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
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
              <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">{t('passwordSection')}</h3>
                    <p className="text-xs text-stone-500">Update your account credentials to keep your society workspace secure.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="text-xs font-bold text-[#a03612] hover:underline"
                  >
                    {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
                  </button>
                </div>

                {passwordError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('currentPassword')}</label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">{t('newPassword')}</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700">{t('confirmPassword')}</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#a03612] hover:bg-[#882c0e] text-white font-bold text-xs rounded-xl shadow-sm transition"
                    >
                      {t('updatePasswordBtn')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Two-Factor Authentication (2FA) Card */}
              <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">{t('twoFactorAuth')}</h3>
                    <p className="text-xs text-stone-500">{t('twoFactorAuthSub')}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${twoFactorEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                    {twoFactorEnabled ? '2FA Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-[#a03612] flex items-center justify-center font-bold">
                      🔐
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">{t('enable2FA')}</p>
                      <p className="text-[10px] text-stone-500">Requires a security code upon signing into your society workspace.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set2FA(!twoFactorEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                      twoFactorEnabled ? 'bg-emerald-600 justify-end' : 'bg-stone-300 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                  </button>
                </div>

                {twoFactorEnabled && (
                  <div className="space-y-3 animate-fade-in pt-2">
                    <label className="text-xs font-bold text-stone-700 block">2FA Verification Method</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => set2FAMethod('app')}
                        className={`p-3.5 rounded-2xl border text-left transition ${
                          twoFactorMethod === 'app' ? 'bg-emerald-50 border-emerald-500 text-stone-900' : 'bg-stone-50 border-stone-200 text-stone-600'
                        }`}
                      >
                        <p className="font-bold text-xs">{t('authApp')}</p>
                        <p className="text-[10px] text-stone-500 mt-1">Generate 6-digit TOTP security codes.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => set2FAMethod('sms')}
                        className={`p-3.5 rounded-2xl border text-left transition ${
                          twoFactorMethod === 'sms' ? 'bg-emerald-50 border-emerald-500 text-stone-900' : 'bg-stone-50 border-stone-200 text-stone-600'
                        }`}
                      >
                        <p className="font-bold text-xs">{t('smsOtp')}</p>
                        <p className="text-[10px] text-stone-500 mt-1">Receive one-time passwords via SMS to registered mobile.</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Session & Data Privacy Hub */}
              <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
                <div className="pb-4 border-b border-stone-100">
                  <h3 className="text-base font-bold text-stone-900">{t('dataPrivacy')}</h3>
                  <p className="text-xs text-stone-500">Manage active sessions and download your personal workspace audit log.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <div>
                        <p className="text-xs font-bold text-stone-900">{t('currentSession')}</p>
                        <p className="text-[10px] text-stone-500">IP: 127.0.0.1 • Active right now</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadData}
                    className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{t('downloadData')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('Logged out from all other active sessions.')}
                    className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition"
                  >
                    {t('logoutAllDevices')}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
