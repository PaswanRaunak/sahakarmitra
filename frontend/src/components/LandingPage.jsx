import React, { useState } from 'react';
import { makeT } from '../i18n.js';

export default function LandingPage({ onOpenAuth, onStartChatting, onToggleLanguage, language = 'en' }) {
  const t = makeT(language);
  const [activeTabFeature, setActiveTabFeature] = useState('rag');

  const SAMPLE_TOPICS = [
    { title: 'AGM Quorum & Notice Rules', query: 'What is the quorum required for an AGM under Section 72 of the MCS Act 1960?' },
    { title: 'Cooperative Society Elections', query: 'What is the procedure for electing managing committee members in a housing society?' },
    { title: 'Deemed Conveyance Process', query: 'How can a housing society apply for deemed conveyance if the builder refuses NOC?' },
    { title: 'Audit & Statutory Compliance', query: 'What are the statutory audit deadlines and Form O compliance rules for CHS?' },
    { title: 'Maintenance Dues Recovery', query: 'How to issue Section 101 recovery certificates to maintenance defaulters?' },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] font-sans selection:bg-[#a03612] selection:text-white">
      
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#faf8f5]/90 backdrop-blur-xl border-b border-stone-200/70 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img 
              src="/logo.jpg" 
              alt="SahakarMitra Logo" 
              className="w-10 h-10 rounded-2xl shadow-md border border-stone-200 object-cover group-hover:scale-105 transition-transform" 
            />
            <div>
              <span className="text-xl font-extrabold tracking-tight text-stone-900 group-hover:text-[#a03612] transition-colors">
                Sahakar<span className="text-[#a03612]">Mitra</span>
              </span>
              <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider hidden sm:block">Digital India Cooperative Legal Assistant</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-bold text-stone-600">
            <a href="#home" className="text-[#a03612] hover:text-[#882c0e] transition flex items-center gap-1">
              <span>{t('navHome')}</span>
            </a>
            <a href="#features" className="hover:text-[#a03612] transition">{t('navFeatures')}</a>
            <a href="#experts-spotlight" className="hover:text-[#a03612] transition">Legal Experts</a>
            <a href="#about" className="hover:text-[#a03612] transition">{t('navAbout')}</a>
          </nav>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition shadow-xs active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>{language.toUpperCase()}</span>
            </button>

            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 sm:px-5 py-2.5 text-xs font-extrabold text-white bg-[#a03612] hover:bg-[#882c0e] rounded-xl shadow-xs hover:shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {t('loginSignup')}
            </button>
          </div>

        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────── */}
      <section id="home" className="pt-10 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6 animate-slide-up">
            
            {/* Trust Badge Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-200/90 text-xs font-bold text-[#a03612] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#a03612] animate-ping"></span>
              <span>Government of India & MCS Act 1960 Aligned</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.12]">
              Cooperative Legal Guidance <br />
              <span className="bg-gradient-to-r from-[#a03612] via-[#b34420] to-[#1b4342] bg-clip-text text-transparent">
                Simplified with AI & Experts.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-stone-600 max-w-2xl leading-relaxed font-normal">
              Empowering Maharashtra cooperative housing societies, committee members, and residents with verified statutory answers, multilingual voice chat, and 1-on-1 legal consultant access.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={onStartChatting}
                className="px-7 py-4 bg-[#a03612] hover:bg-[#882c0e] text-white font-extrabold text-sm rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 active:translate-y-0 animate-pulse-glow cursor-pointer"
              >
                <span>Launch Legal Assistant</span>
                <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9-7-9-7-9 7 9 7z" />
                </svg>
              </button>

              <a
                href="#experts-spotlight"
                className="px-6 py-4 bg-white hover:bg-stone-100 text-stone-800 border border-stone-200/90 font-bold text-sm rounded-2xl shadow-xs hover:shadow-sm transition text-center"
              >
                Connect with Experts 👤
              </a>
            </div>

            {/* Trust Stats Bar */}
            <div className="pt-6 border-t border-stone-200/70 grid grid-cols-3 gap-4 text-left">
              <div>
                <p className="text-lg sm:text-2xl font-black text-[#a03612]">100%</p>
                <p className="text-[11px] text-stone-500 font-semibold">Verified Statutes</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-stone-900">3 Languages</p>
                <p className="text-[11px] text-stone-500 font-semibold">English, हिंदी, मराठी</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-[#1b4342]">24/7</p>
                <p className="text-[11px] text-stone-500 font-semibold">Instant AI Support</p>
              </div>
            </div>

          </div>

          {/* Right Interactive Live Preview Card */}
          <div className="lg:col-span-5 animate-scale-in">
            <div 
              onClick={onStartChatting}
              className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-card space-y-4 relative cursor-pointer hover:border-[#a03612]/50 transition duration-300 group transform hover:-translate-y-1"
            >
              
              {/* Card Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-xl object-cover border border-stone-200" />
                  <div>
                    <h3 className="text-xs font-bold text-stone-900 group-hover:text-[#a03612] transition">SahakarMitra AI Assistant</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                      <span>Ready to answer legal queries</span>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-[#a03612] text-[10px] font-bold rounded-full border border-amber-200/60">RAG Powered</span>
              </div>

              {/* Simulated User Bubble (Matching Rust Theme #a03612) */}
              <div className="bg-[#a03612] text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-xs space-y-1">
                <div className="text-[9px] text-amber-100/90 font-semibold">11:24 AM</div>
                <p className="font-medium">What are the quorum requirements for a General Body Meeting under MCS Act 1960?</p>
              </div>

              {/* Simulated Bot Answer */}
              <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-2xl space-y-2.5 text-xs text-stone-800 leading-relaxed shadow-xs">
                <h4 className="font-bold text-[#a03612] text-xs">Section 72 & Section 31 — Quorum Rules</h4>
                <p>
                  For a primary cooperative housing society, the quorum for a general body meeting is typically <strong>20% of total members or 50 members</strong>, whichever is less, unless specified in society bylaws.
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-[#2d6a68] border border-teal-200 text-[10px] font-bold">
                  ✓ Verified: Section 72. MCS Act 1960
                </div>
              </div>

              {/* Simulated Input Capsule (Matching Terracotta Diamond Button) */}
              <div className="flex items-center bg-white border border-stone-200 rounded-full pl-4 pr-1.5 py-1.5 text-xs text-stone-400 group-hover:border-[#a03612] transition shadow-soft">
                <span className="flex-1 text-[11px]">Ask about society laws, elections, audit...</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d89780] to-[#b34420] text-white flex items-center justify-center shadow-xs">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.5l7.5 7.5-7.5 7.5-7.5-7.5z" />
                  </svg>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Interactive Legal Topic Explorer ───────────────────── */}
      <section className="py-12 px-4 sm:px-8 max-w-7xl mx-auto border-t border-stone-200/60">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-soft space-y-4 text-center">
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">Explore Common Cooperative Legal Queries</h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">Click any legal topic below to test SahakarMitra's AI assistant instantly.</p>
          
          <div className="flex flex-wrap justify-center gap-2.5 pt-2">
            {SAMPLE_TOPICS.map((item, idx) => (
              <button
                key={idx}
                onClick={onStartChatting}
                className="px-4 py-2.5 bg-stone-50 hover:bg-amber-50 border border-stone-200/80 hover:border-amber-300 text-stone-700 hover:text-[#a03612] rounded-2xl text-xs font-bold transition shadow-xs flex items-center gap-2 group cursor-pointer"
              >
                <span>{item.title}</span>
                <span className="text-stone-400 group-hover:text-[#a03612] transition">→</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Core Platform Capabilities ───────────────────── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#a03612] uppercase tracking-wider">Features & Capabilities</span>
          <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Comprehensive Cooperative Legal Toolkit
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-normal">
            Everything managing committees, society auditors, and members need for seamless compliance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Card 1: Multilingual RAG Engine */}
          <div className="bg-white border border-stone-200/90 p-8 rounded-3xl space-y-4 shadow-soft hover:shadow-card transition duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#a03612] flex items-center justify-center text-xl font-bold border border-amber-200/60 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">{t('card1Title')}</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Query complex cooperative laws in English, Hindi (हिंदी), or Marathi (मराठी). RAG retrieves exact legal clauses with official section numbers.
            </p>
          </div>

          {/* Card 2: Voice Integration */}
          <div className="bg-white border border-stone-200/90 p-8 rounded-3xl space-y-4 shadow-soft hover:shadow-card transition duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#1b4342] flex items-center justify-center text-xl font-bold border border-teal-200/60 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">Voice Input & Audio Playback</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Speak your legal questions hands-free via speech-to-text microphone, and listen to spoken answers in your preferred regional tongue.
            </p>
          </div>

          {/* Card 3: Connect with Human Experts */}
          <div className="bg-white border border-stone-200/90 p-8 rounded-3xl space-y-4 shadow-soft hover:shadow-card transition duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center text-xl font-bold border border-purple-200/60 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-stone-900">Connect with Verified Experts</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Seamlessly transition from AI responses to 1-on-1 consultations with empanelled High Court Advocates, Society Auditors, and Consultants.
            </p>
          </div>

        </div>
      </section>

      {/* ── Section 3: Legal Experts Directory Spotlight ───────────── */}
      <section id="experts-spotlight" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto bg-stone-100/70 rounded-3xl border border-stone-200/80 my-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <span className="text-xs font-bold text-[#a03612] uppercase tracking-wider">Empanelled Human Legal Assistance</span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">Verified Cooperative Consultants</h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-xl mt-1">Book direct video or document review sessions when your society faces complex disputes.</p>
          </div>
          <button
            onClick={onStartChatting}
            className="px-5 py-2.5 bg-[#a03612] hover:bg-[#882c0e] text-white text-xs font-bold rounded-xl transition shadow-xs self-start md:self-auto cursor-pointer"
          >
            View All Experts →
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Expert Spotlight Card 1 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-soft space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-[#a03612] text-white font-black text-base flex items-center justify-center shadow-xs">RD</div>
              <div>
                <h4 className="text-sm font-bold text-stone-900">Adv. Rajesh S. Deshmukh</h4>
                <p className="text-[11px] text-stone-500 font-medium">High Court Advocate • 22 Yrs Exp</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 line-clamp-2">"Specializing in MCS Act 1960 litigation, society registration disputes, deemed conveyance, and tribunal appeals."</p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-amber-500 font-bold">★ 4.9 (142 reviews)</span>
              <span className="font-bold text-[#a03612]">₹1,500 / 30 mins</span>
            </div>
          </div>

          {/* Expert Spotlight Card 2 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-soft space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-800 text-white font-black text-base flex items-center justify-center shadow-xs">SK</div>
              <div>
                <h4 className="text-sm font-bold text-stone-900">CA Smita V. Kulkarni</h4>
                <p className="text-[11px] text-stone-500 font-medium">Certified Society Auditor • 16 Yrs Exp</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 line-clamp-2">"Empanelled statutory auditor for CHS. Expert in forensic accounting, audit rectifications, and Form O compliance."</p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-amber-500 font-bold">★ 4.8 (98 reviews)</span>
              <span className="font-bold text-[#a03612]">₹1,200 / 30 mins</span>
            </div>
          </div>

          {/* Expert Spotlight Card 3 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-soft space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-700 to-red-900 text-white font-black text-base flex items-center justify-center shadow-xs">SB</div>
              <div>
                <h4 className="text-sm font-bold text-stone-900">Sanjay M. Bhosale</h4>
                <p className="text-[11px] text-stone-500 font-medium">Retd. Dy. Registrar (Govt. of MH) • 28 Yrs Exp</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 line-clamp-2">"Former Deputy Registrar providing guidance on Section 79 notices, society amalgamation, and regulatory filings."</p>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-amber-500 font-bold">★ 5.0 (164 reviews)</span>
              <span className="font-bold text-[#a03612]">₹2,000 / 30 mins</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: The SahakarMitra Advantage ───────────── */}
      <section id="about" className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            {t('advantageTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            {t('advantageSub')}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          
          {/* Large Left Card (Dark Teal) */}
          <div className="lg:col-span-7 bg-[#1b4342] text-white p-8 sm:p-12 rounded-3xl flex flex-col justify-end min-h-[360px] relative overflow-hidden shadow-card">
            <div className="absolute top-6 left-6 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-xs">
              <svg className="w-6 h-6 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div className="space-y-3 z-10 pt-16">
              <span className="text-xs font-bold text-teal-200 uppercase tracking-wider">
                Empowering Cooperation through Digital Legal Support
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                Bridging the Digital Divide
              </h3>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-light">
                Tailored specifically for rural and urban cooperative boards across Maharashtra, making complex legal frameworks as accessible as a simple chat conversation.
              </p>
            </div>
          </div>

          {/* Right Stack */}
          <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
            
            {/* Top Right Card (White) */}
            <div className="bg-white border border-stone-200/90 p-8 rounded-3xl space-y-3 shadow-soft flex-1 hover:shadow-card transition duration-300">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#a03612] flex items-center justify-center text-lg mb-2 shadow-xs">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-stone-900">24/7 Instant Legal Answers</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Instant statutory answers anytime, reducing reliance on expensive external legal counsel for routine society queries.
              </p>
            </div>

            {/* Bottom Right Card (Rust Red) */}
            <div className="bg-[#a03612] text-white p-8 rounded-3xl space-y-3 shadow-soft flex-1 hover:shadow-card transition duration-300">
              <h4 className="text-lg font-bold">Up-to-Date Statutory Corpus</h4>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                Constantly synchronized with the latest amendments in Maharashtra Co-operative Societies Act 1960 and model housing society bye-laws.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-[#1c1917] text-stone-300 py-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 pb-12 border-b border-stone-800 text-xs">
          
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-lg">
              <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
              <span>Sahakar<span className="text-[#a03612]">Mitra</span></span>
            </div>
            <p className="text-stone-400 max-w-md leading-relaxed">
              Empowering cooperative societies across Maharashtra with accessible, verified, and multilingual legal guidance.
            </p>
            <p className="text-[11px] text-stone-500">
              An initiative supporting the Ministry of Cooperation, Government of India.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Platform Features</h4>
            <ul className="space-y-2 text-stone-400">
              <li><button onClick={onStartChatting} className="hover:text-white transition text-left">AI RAG Legal Assistant</button></li>
              <li><a href="#experts-spotlight" className="hover:text-white transition">Connect with Experts</a></li>
              <li><button onClick={onStartChatting} className="hover:text-white transition text-left">Voice Assistant (STT & TTS)</button></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Legal & Compliance</h4>
            <ul className="space-y-2 text-stone-400">
              <li><a href="#" className="hover:text-white transition">MCS Act 1960 Reference</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy & Data Governance</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4">
          <p>© 2026 SahakarMitra. All rights reserved. Designed for Maharashtra Cooperative Societies.</p>
          <div className="flex items-center gap-4">
            <span>Powered by RAG, ChromaDB & Vector Embeddings</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
