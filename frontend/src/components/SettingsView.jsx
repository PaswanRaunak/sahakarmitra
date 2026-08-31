import React, { useState } from 'react';
import { makeT } from '../i18n.js';

export default function SettingsView({ user, onUpdateUser, language = 'en' }) {
  const t = makeT(language);
  // Form State initialized from user props or defaults
  const [name, setName]               = useState(user?.name || 'Ramesh Patil');
  const [email, setEmail]             = useState(user?.email || 'ramesh.patil@society.org');
  const [mobile, setMobile]           = useState(user?.mobile || '+91 9876543210');
  const [societyName, setSocietyName] = useState(user?.societyName || 'Shivaji Cooperative Housing Society');
  const [registrationNo, setRegNo]    = useState(user?.registrationNo || 'BOM/HSG/12345/2012');
  const [preferredLang, setLang]      = useState(user?.preferredLang || 'en');
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'preferences' | 'security'

  function handleSubmit(e) {
    e.preventDefault();
    const updated = {
      ...user,
      name,
      email,
      mobile,
      societyName,
      registrationNo,
      preferredLang,
    };

    onUpdateUser(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#faf8f5] p-6 sm:p-8 space-y-8 animate-fade-in max-w-5xl mx-auto w-full">
      
      {/* Header Title */}
      <div className="border-b border-stone-200/80 pb-4 space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {t('settingsTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 font-normal">
          {t('settingsSubtitle')}
        </p>
      </div>

      {/* Save Success Alert Toast */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-soft animate-scale-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('settingsSaved')}</span>
          </div>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Sub-Navigation Menu (NyayGuru Style - Image 1) */}
        <div className="lg:col-span-4 bg-white border border-stone-200/80 rounded-3xl p-4 shadow-soft space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {t('accountManagement')}
          </div>

          <button
            onClick={() => setActiveSubTab('profile')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'profile'
                ? 'bg-amber-50 text-[#a03612] border border-amber-200/80 shadow-xs'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <svg className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <p className="font-bold">{t('profileInfo')}</p>
              <p className="text-[10px] text-stone-500 font-normal">{t('profileInfoSub')}</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab('preferences')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition text-left ${
              activeSubTab === 'preferences'
                ? 'bg-amber-50 text-[#a03612] border border-amber-200/80 shadow-xs'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <svg className="w-4 h-4 text-[#2d6a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <div>
              <p className="font-bold">{t('langPrefs')}</p>
              <p className="text-[10px] text-stone-500 font-normal">{t('langPrefsSub')}</p>
            </div>
          </button>
        </div>

        {/* Right Content Form (NyayGuru Style - Image 1) */}
        <div className="lg:col-span-8 bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-soft space-y-6">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Top Profile Avatar Card */}
            <div className="flex items-center gap-4 pb-6 border-b border-stone-100">
              <div className="w-16 h-16 rounded-full bg-[#2d6a68] text-white flex items-center justify-center font-black text-2xl border-4 border-amber-100 shadow-sm">
                {name[0]?.toUpperCase() || 'R'}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">{name}</h3>
                <p className="text-xs text-stone-500">{email}</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  {t('activeMember')}
                </span>
              </div>
            </div>

            {/* Form Fields: Personal Info */}
            {activeSubTab === 'profile' && (
              <div className="space-y-5 animate-fade-in">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider text-[#a03612]">
                  {t('personalDetails')}
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('fullName')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('emailAddress')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('mobilePhone')}</label>
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">{t('societyNameLabel')}</label>
                    <input
                      type="text"
                      value={societyName}
                      onChange={(e) => setSocietyName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">{t('regNo')}</label>
                  <input
                    type="text"
                    value={registrationNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#a03612]"
                  />
                </div>
              </div>
            )}

            {/* Form Fields: Preferences */}
            {activeSubTab === 'preferences' && (
              <div className="space-y-5 animate-fade-in">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider text-[#a03612]">
                  {t('langSystemPrefs')}
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">{t('defaultLang')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { code: 'en', label: 'English' },
                      { code: 'hi', label: 'Hindi (हिंदी)' },
                      { code: 'mr', label: 'Marathi (मराठी)' },
                    ].map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setLang(item.code)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border transition ${
                          preferredLang === item.code
                            ? 'bg-[#a03612] text-white border-[#a03612] shadow-sm'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Submit Button */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
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

        </div>

      </div>

    </div>
  );
}
