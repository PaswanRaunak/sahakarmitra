import React from 'react';
import { makeT } from '../i18n.js';

export default function LandingPage({ onOpenAuth, onStartChatting, onToggleLanguage, language = 'en' }) {
  const t = makeT(language);
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] font-sans">
      
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#faf8f5]/90 backdrop-blur-md border-b border-stone-200/60 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="/logo.jpg" 
              alt="SahakarMitra Logo" 
              className="w-10 h-10 rounded-xl shadow-md border border-stone-200 object-cover" 
            />
            <span className="text-xl font-bold tracking-tight text-[#1c1917]">
              Sahakar<span className="text-[#a03612]">Mitra</span>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="#home" className="text-[#a03612] font-semibold hover:text-[#882c0e] transition">{t('navHome')}</a>
            <a href="#features" className="hover:text-[#a03612] transition">{t('navFeatures')}</a>
            <a href="#about" className="hover:text-[#a03612] transition">{t('navAbout')}</a>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleLanguage}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-full hover:bg-stone-50 transition shadow-xs active:scale-95"
            >
              <svg className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>{t('languageLabel')} ({language.toUpperCase()})</span>
            </button>

            <button
              onClick={() => onOpenAuth('login')}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#a03612] hover:bg-[#882c0e] rounded-full shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {t('loginSignup')}
            </button>
          </div>

        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────── */}
      <section id="home" className="pt-12 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-600 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
              <span>{t('trustedBadge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1c1917] tracking-tight leading-[1.15]">
              {t('heroTitle1')} <br />
              <span className="text-[#a03612]">{t('heroTitle2')}</span> <br />
              {t('heroTitle3')}
            </h1>

            <p className="text-sm sm:text-base text-stone-600 max-w-xl leading-relaxed font-normal">
              {t('heroSubtitle')}
            </p>

            <div className="pt-2">
              <button
                onClick={onStartChatting}
                className="px-8 py-4 bg-[#a03612] hover:bg-[#882c0e] text-white font-bold text-sm rounded-full shadow-md hover:shadow-lg transition flex items-center gap-2.5 transform hover:-translate-y-0.5 active:translate-y-0 animate-pulse-glow"
              >
                <span>{t('startChatting')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Preview Card */}
          <div className="lg:col-span-5 animate-scale-in">
            <div 
              onClick={onStartChatting}
              className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-card space-y-4 relative cursor-pointer hover:border-[#a03612]/40 transition duration-300 group transform hover:-translate-y-1"
            >
              
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-bold text-sm shadow-xs">
                  <svg className="w-5 h-5 text-[#2d6a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l9-4 9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-5.45-9-12V6z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 group-hover:text-[#a03612] transition">SahakarMitra AI</h3>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>Online and Ready to Help</span>
                  </p>
                </div>
              </div>

              {/* User Bubble */}
              <div className="bg-[#1e4e4d] text-white p-4 rounded-2xl text-xs leading-relaxed shadow-xs">
                What is the quorum required for an AGM under the Maharashtra State Co-operative Societies Act?
              </div>

              {/* Bot Answer */}
              <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-2xl space-y-3">
                <p className="text-xs text-stone-700 leading-relaxed">
                  According to the Maharashtra Co-operative Societies Act, 1960, the quorum for a general body meeting...
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/70 text-stone-800 text-[11px] font-semibold">
                  <svg className="w-3.5 h-3.5 text-[#2d6a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Section 72. MCS Act 1960</span>
                </div>
              </div>

              {/* Input Simulation */}
              <div className="flex items-center bg-stone-50 border border-stone-200 rounded-full px-4 py-2.5 text-xs text-stone-400 group-hover:border-[#a03612] transition shadow-xs">
                <span className="flex-1">Type your legal query here...</span>
                <div className="w-7 h-7 rounded-full bg-[#a03612] text-white flex items-center justify-center shadow-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Section 2: Designed for Needs ───────────────────── */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
            {t('designedFor')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-normal">
            {t('designedForSub')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-white border border-stone-200/80 p-8 rounded-3xl space-y-4 shadow-soft hover:shadow-card transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center text-xl font-bold border border-cyan-100 shadow-xs">
              <svg className="w-6 h-6 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">{t('card1Title')}</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('card1Body')}
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-stone-200/80 p-8 rounded-3xl space-y-4 shadow-soft hover:shadow-card transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-100 shadow-xs">
              <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">{t('card2Title')}</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('card2Body')}
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-stone-200/80 p-8 rounded-3xl space-y-4 shadow-soft hover:shadow-card transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold border border-amber-100 shadow-xs">
              <svg className="w-6 h-6 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">{t('card3Title')}</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {t('card3Body')}
            </p>
          </div>

        </div>
      </section>

      {/* ── Section 3: The SahakarMitra Advantage ───────────── */}
      <section id="about" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
            {t('advantageTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            {t('advantageSub')}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Large Left Card (Dark Teal) */}
          <div className="lg:col-span-7 bg-[#1b4342] text-white p-8 sm:p-12 rounded-3xl flex flex-col justify-end min-h-[380px] relative overflow-hidden shadow-card">
            <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl shadow-xs">
              <svg className="w-6 h-6 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div className="space-y-3 z-10 pt-20">
              <span className="text-xs font-semibold text-teal-200 uppercase tracking-wider">
                Empowering Cooperation through Digital Legal Support
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                Bridging the Digital Divide
              </h3>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-light">
                Tailored specifically for rural and semi-urban cooperative boards, making complex legal frameworks as accessible as a simple chat conversation.
              </p>
            </div>
          </div>

          {/* Right Stack */}
          <div className="lg:col-span-5 flex flex-col gap-8 justify-between">
            
            {/* Top Right Card (White) */}
            <div className="bg-white border border-stone-200/80 p-8 rounded-3xl space-y-3 shadow-soft flex-1 hover:shadow-card transition duration-300">
              <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center text-lg mb-2 shadow-xs">
                <svg className="w-5 h-5 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-stone-900">24/7 Availability</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Instant answers anytime, reducing reliance on expensive external legal counsel for routine queries.
              </p>
            </div>

            {/* Bottom Right Card (Rust Red) */}
            <div className="bg-[#a03612] text-white p-8 rounded-3xl space-y-3 shadow-soft flex-1 hover:shadow-card transition duration-300">
              <h4 className="text-lg font-bold">Up-to-Date Laws</h4>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                Constantly synchronized with the latest amendments in state and central cooperative acts.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-[#1c1917] text-stone-300 py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 pb-12 border-b border-stone-800 text-xs">
          
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-7 h-7 rounded-md bg-[#a03612] flex items-center justify-center text-xs shadow-xs">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l9-4 9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-5.45-9-12V6z" />
                </svg>
              </div>
              <span>SahakarMitra</span>
            </div>
            <p className="text-stone-400 max-w-md leading-relaxed">
              Empowering cooperative societies across India with accessible, verified, and multilingual legal guidance.
            </p>
            <p className="text-[11px] text-stone-500">
              An initiative supporting the Ministry of Cooperation, Government of India.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Platform</h4>
            <ul className="space-y-2 text-stone-400">
              <li><a href="#about" className="hover:text-white transition">About Us</a></li>
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><button onClick={onStartChatting} className="hover:text-white transition text-left">Start Assistant</button></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Legal</h4>
            <ul className="space-y-2 text-stone-400">
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Disclaimer</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4">
          <p>© 2026 SahakarMitra. All rights reserved. Not a substitute for official legal counsel.</p>
          <div className="flex items-center gap-4">
            <span>Powered by RAG and ChromaDB</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
