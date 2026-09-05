import React, { useState, useEffect } from 'react';
import { makeT } from '../i18n.js';
import LanguageMenu from './LanguageMenu.jsx';

export default function LandingPage({ onOpenAuth, onStartChatting, onSetLanguage, language = 'en' }) {
  const t = makeT(language);

  // Live rollout coverage (mirrors the state/language configs via the API)
  const [states, setStates] = useState(null);     // null = loading
  const [liveLanguages, setLiveLanguages] = useState(null);
  useEffect(() => {
    fetch('/api/states').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && Array.isArray(d.states)) setStates(d);
    }).catch(() => {});
    fetch('/api/languages').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (Array.isArray(d)) setLiveLanguages(d.filter((l) => l.enabled).length);
    }).catch(() => {});
  }, []);

  const SAMPLE_TOPICS = [
    { title: 'AGM quorum & notice rules', query: 'What is the quorum required for an AGM under Section 72 of the MCS Act 1960?' },
    { title: 'Society elections', query: 'What is the procedure for electing managing committee members in a housing society?' },
    { title: 'Deemed conveyance', query: 'How can a housing society apply for deemed conveyance if the builder refuses NOC?' },
    { title: 'Audit deadlines', query: 'What are the statutory audit deadlines and Form O compliance rules for CHS?' },
    { title: 'Maintenance dues recovery', query: 'How to issue Section 101 recovery certificates to maintenance defaulters?' },
  ];

  const FEATURES = [
    {
      num: '01',
      title: t('card1Title'),
      body: 'Ask in English, Hindi (हिंदी), or Marathi (मराठी). Retrieval grounds every answer in the exact clause of the Act, with the section number cited.',
      meta: 'EN · हिंदी · मराठी',
    },
    {
      num: '02',
      title: 'Voice input, spoken answers',
      body: 'Dictate your question hands-free and listen to the answer read aloud, for committee members who prefer talking to typing.',
      meta: 'Speech to text · Text to speech',
    },
    {
      num: '03',
      title: 'Human experts on call',
      body: 'When a dispute needs more than a statute, continue straight to an empanelled High Court advocate, society auditor, or former Registrar.',
      meta: '1-on-1 consultations',
    },
  ];

  const EXPERTS = [
    {
      initials: 'RD',
      name: 'Adv. Rajesh S. Deshmukh',
      role: 'High Court Advocate · 22 yrs',
      quote: 'MCS Act 1960 litigation, society registration disputes, deemed conveyance, and tribunal appeals.',
      rating: '4.9 (142 reviews)',
      rate: '₹1,500 / 30 min',
      featured: true,
    },
    {
      initials: 'SK',
      name: 'CA Smita V. Kulkarni',
      role: 'Certified Society Auditor · 16 yrs',
      quote: 'Statutory audit, forensic accounting, audit rectifications, Form O compliance.',
      rating: '4.8 (98 reviews)',
      rate: '₹1,200 / 30 min',
    },
    {
      initials: 'SB',
      name: 'Sanjay M. Bhosale',
      role: 'Retd. Dy. Registrar, Govt. of Maharashtra · 28 yrs',
      quote: 'Section 79 notices, society amalgamation, regulatory filings.',
      rating: '5.0 (164 reviews)',
      rate: '₹2,000 / 30 min',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#faf8f5] text-[#1c1917] font-sans selection:bg-[#a03612] selection:text-white">

      {/* ── Top Navigation ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#faf8f5]/90 backdrop-blur-xl border-b border-stone-200/70 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">

          <a
            href="#home"
            className="flex items-center gap-3 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
          >
            <img
              src="/logo.jpg"
              alt="SahakarMitra"
              width="40"
              height="40"
              className="w-10 h-10 rounded-2xl shadow-sm border border-stone-200 object-cover"
            />
            <span className="text-lg font-extrabold tracking-tight text-stone-900">
              Sahakar<span className="text-[#a03612]">Mitra</span>
            </span>
          </a>

          <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#home" className="text-[#a03612] hover:text-[#882c0e] transition-colors">{t('navHome')}</a>
            <a href="#features" className="hover:text-[#a03612] transition-colors">{t('navFeatures')}</a>
            <a href="#about" className="hover:text-[#a03612] transition-colors">{t('navAbout')}</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <LanguageMenu
              current={language}
              onChange={onSetLanguage}
              buttonClassName="px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
            />
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 sm:px-5 py-2.5 text-xs font-extrabold text-white bg-[#a03612] hover:bg-[#882c0e] rounded-xl shadow-xs hover:shadow-md transition-[transform,box-shadow,background-color] transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] focus-visible:ring-offset-2"
            >
              {t('loginSignup')}
            </button>
          </div>

        </div>
      </header>

      <main id="main-content">
        {/* ── Hero: editorial offset, one answer artifact ──────── */}
        <section id="home" className="pt-12 sm:pt-20 pb-14 sm:pb-20 px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            <div className="lg:col-span-6 space-y-7 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100/90 text-[#a03612] text-xs font-extrabold uppercase tracking-wider border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-[#a03612] animate-pulse"></span>
                <span>Multi-State Cooperative Intelligence</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-[1.08] text-balance">
                Cooperative law, <span className="text-[#a03612]">answered</span> in plain language.
              </h1>

              <p className="text-base sm:text-lg text-stone-600 max-w-xl leading-relaxed">
                SahakarMitra gives cooperative housing societies and urban banks verified answers straight from statute, in English, हिंदी, and मराठी, with more states and Indian languages rolling out as their Acts are validated.
              </p>

              {/* Supported Jurisdictions (live from the rollout config) */}
              <div className="flex flex-wrap gap-2 pt-1">
                {(states
                  ? states.states.filter((st) => st.enabled)
                  : [
                      { id: 'Maharashtra', act_name: 'MCS Act' },
                      { id: 'Gujarat', act_name: 'GCS Act' },
                      { id: 'Karnataka', act_name: 'KCS Act' },
                      { id: 'Multi-State', act_name: 'Central Multi-State' },
                    ]
                ).map((st) => (
                  <span key={st.id} className="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700 shadow-xs flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l9-4 9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-5.45-9-12V6z" />
                    </svg>
                    {st.id}
                  </span>
                ))}
              </div>

              {states && states.coverage && (
                <p className="text-[11px] font-semibold text-stone-400 tabular-nums">
                  Coverage: {states.coverage.enabled}/{states.coverage.total} jurisdictions live · new states onboarded as their Acts are verified
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button
                  onClick={onStartChatting}
                  className="px-7 py-4 bg-[#a03612] hover:bg-[#882c0e] text-white font-extrabold text-sm rounded-2xl shadow-md hover:shadow-lg transition-[transform,box-shadow,background-color] flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] focus-visible:ring-offset-2"
                >
                  <span>Launch Legal Assistant</span>
                  <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9-7-9-7-9 7 9 7z" />
                  </svg>
                </button>

                <a
                  href="#experts"
                  className="px-6 py-4 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-bold text-sm rounded-2xl shadow-xs hover:shadow-sm transition-[background-color,box-shadow] text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
                >
                  Meet the experts
                </a>
              </div>

              <dl className="pt-8 border-t border-stone-200/70 grid grid-cols-4 gap-4">
                <div>
                  <dt className="text-[11px] text-stone-500 font-semibold order-2">Cited answers</dt>
                  <dd className="text-2xl sm:text-3xl font-black text-[#a03612] tabular-nums">100%</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-stone-500 font-semibold">States & Acts</dt>
                  <dd className="text-2xl sm:text-3xl font-black text-stone-900 tabular-nums">{states ? states.coverage.enabled : 4}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-stone-500 font-semibold">Languages</dt>
                  <dd className="text-2xl sm:text-3xl font-black text-stone-900 tabular-nums">{liveLanguages ?? 3}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-stone-500 font-semibold">Instant support</dt>
                  <dd className="text-2xl sm:text-3xl font-black text-[#1b4342] tabular-nums">24/7</dd>
                </div>
              </dl>
            </div>

            {/* The product's real output: one cited answer, framed once */}
            <figure className="lg:col-span-6 animate-fade-in">
              <div className="bg-white border border-stone-200/90 rounded-3xl shadow-card overflow-hidden">
                <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-stone-100">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">
                    A real answer
                  </p>
                </div>

                <div className="px-6 sm:px-8 py-6 space-y-5">
                  <p className="text-sm font-semibold text-stone-900">
                    “What is the quorum for a general body meeting?”
                  </p>

                  <div className="space-y-3">
                    <p className="text-sm text-stone-700 leading-relaxed">
                      For a primary cooperative housing society, the quorum is <strong className="text-stone-900">one-third of the total members or twenty members, whichever is less</strong>, present in person, unless the by-laws prescribe otherwise.
                    </p>
                    <p className="text-sm text-stone-700 leading-relaxed">
                      Notice of the meeting must be delivered to every member at least five clear days before the date fixed.
                    </p>
                  </div>
                </div>

                <figcaption className="px-6 sm:px-8 py-4 bg-[#faf8f5] border-t border-stone-100 flex items-center gap-2 text-[11px] font-semibold text-[#1b4342]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verified · Section 29, Model Bye-laws · MCS Act 1960
                </figcaption>
              </div>
            </figure>

          </div>
        </section>

        {/* ── Topic strip: open, no box ─────────────────────────── */}
        <section aria-label="Common legal topics" className="pb-14 sm:pb-20 px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="border-t border-stone-200/60 pt-10 flex flex-col md:flex-row md:items-baseline gap-4 md:gap-10">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-stone-500 whitespace-nowrap">
              Try a real query
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {SAMPLE_TOPICS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={onStartChatting}
                  className="px-4 py-2.5 bg-white hover:bg-amber-50 border border-stone-200/80 hover:border-amber-300 text-stone-700 hover:text-[#a03612] rounded-full text-xs font-bold transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features: ruled editorial rows ────────────────────── */}
        <section id="features" className="py-14 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="max-w-2xl space-y-3 mb-12">
            <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight text-balance">
              {t('navFeatures')}
            </h2>
            <p className="text-sm sm:text-base text-stone-500">
              What managing committees, auditors, and members actually need, nothing more.
            </p>
          </div>

          <div className="divide-y divide-stone-200/70 border-t border-stone-200/70">
            {FEATURES.map((f) => (
              <div key={f.num} className="grid md:grid-cols-12 gap-3 md:gap-8 py-8 sm:py-10 items-baseline group">
                <span className="md:col-span-1 text-xs font-black text-[#a03612] tabular-nums">{f.num}</span>
                <h3 className="md:col-span-4 text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                  {f.title}
                </h3>
                <p className="md:col-span-5 text-sm text-stone-600 leading-relaxed">{f.body}</p>
                <p className="md:col-span-2 md:text-right text-[11px] font-semibold text-stone-400 tracking-wide">
                  {f.meta}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Experts: one featured consultant + slim rows ──────── */}
        <section id="experts" className="py-14 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl space-y-3">
              <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight text-balance">
                Verified legal consultants
              </h2>
              <p className="text-sm sm:text-base text-stone-500">
                When a dispute needs more than a statute, book a direct session and bring your documents.
              </p>
            </div>
            <button
              onClick={onStartChatting}
              className="self-start px-5 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612]"
            >
              View all experts →
            </button>
          </div>

          {/* Featured expert */}
          <div className="bg-white border border-stone-200/90 rounded-3xl shadow-soft p-8 sm:p-10 grid md:grid-cols-12 gap-8 items-center mb-4">
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-[#a03612] text-white font-black text-lg flex items-center justify-center shadow-xs" aria-hidden="true">
                  {EXPERTS[0].initials}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{EXPERTS[0].name}</h3>
                  <p className="text-xs text-stone-500 font-medium">{EXPERTS[0].role}</p>
                </div>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                “Specializing in MCS Act 1960 litigation, society registration disputes, deemed conveyance, and tribunal appeals.”
              </p>
            </div>
            <div className="md:col-span-5 md:border-l md:border-stone-100 md:pl-8 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-500 font-bold tabular-nums">★ {EXPERTS[0].rating}</span>
                <span className="font-bold text-[#a03612] tabular-nums">{EXPERTS[0].rate}</span>
              </div>
              <button
                onClick={onStartChatting}
                className="px-5 py-3 bg-[#a03612] hover:bg-[#882c0e] text-white text-xs font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a03612] focus-visible:ring-offset-2"
              >
                Book a consultation
              </button>
            </div>
          </div>

          {/* Remaining consultants as slim rows */}
          <ul className="divide-y divide-stone-200/70 border-t border-stone-200/70">
            {EXPERTS.slice(1).map((e) => (
              <li key={e.initials} className="py-5 grid sm:grid-cols-12 gap-2 sm:gap-6 items-baseline">
                <h3 className="sm:col-span-4 text-sm font-bold text-stone-900">{e.name}</h3>
                <p className="sm:col-span-4 text-xs text-stone-500">{e.role}</p>
                <p className="sm:col-span-2 text-xs font-bold text-amber-500 tabular-nums">★ {e.rating}</p>
                <p className="sm:col-span-2 sm:text-right text-xs font-bold text-[#a03612] tabular-nums">{e.rate}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Advantage: the one bento moment ───────────────────── */}
        <section id="about" className="py-14 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight text-balance">
              {t('advantageTitle')}
            </h2>
            <p className="text-sm sm:text-base text-stone-500">{t('advantageSub')}</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            <div className="lg:col-span-7 bg-[#1b4342] text-white p-8 sm:p-12 rounded-3xl flex flex-col justify-end min-h-[360px] shadow-card">
              <div className="space-y-3">
                <h3 className="text-2xl sm:text-3xl font-bold leading-tight text-balance">
                  Bridging the digital divide
                </h3>
                <p className="text-sm text-teal-100/90 leading-relaxed max-w-md">
                  Built for rural and urban cooperative boards across Maharashtra, so a complex legal framework feels as simple as a conversation.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white border border-stone-200/90 p-8 rounded-3xl shadow-soft flex-1">
                <h3 className="text-lg font-bold text-stone-900">24/7 instant answers</h3>
                <p className="text-sm text-stone-600 leading-relaxed mt-2">
                  Routine society questions resolved in seconds, without waiting for outside counsel.
                </p>
              </div>
              <div className="bg-[#a03612] text-white p-8 rounded-3xl shadow-soft flex-1">
                <h3 className="text-lg font-bold">Live statutory corpus</h3>
                <p className="text-sm text-amber-100/90 leading-relaxed mt-2">
                  Amendments to the Maharashtra Cooperative Societies Act 1960 and model bye-laws are detected and ingested automatically, the knowledge base never goes stale.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-[#1c1917] text-stone-300 py-16 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-12 pb-12 border-b border-stone-800 text-xs">

          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-lg">
              <img src="/logo.jpg" alt="SahakarMitra" width="32" height="32" className="w-8 h-8 rounded-lg object-cover" />
              <span>Sahakar<span className="text-[#a03612]">Mitra</span></span>
            </div>
            <p className="text-stone-400 max-w-md leading-relaxed">
              Accessible, verified, multilingual legal guidance for cooperative societies across Maharashtra.
            </p>
            <p className="text-[11px] text-stone-500">
              An initiative supporting the Ministry of Cooperation, Government of India.
            </p>
          </div>

          <nav aria-label="Platform" className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Platform</h4>
            <ul className="space-y-2 text-stone-400">
              <li><button onClick={onStartChatting} className="hover:text-white transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded">AI legal assistant</button></li>
              <li><a href="#experts" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded">Legal experts</a></li>
              <li><a href="#features" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded">Voice assistant</a></li>
            </ul>
          </nav>

          <nav aria-label="Legal" className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Legal</h4>
            <ul className="space-y-2 text-stone-400">
              <li><a href="#about" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded">MCS Act 1960 reference</a></li>
              <li><a href="#home" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded">Terms of service</a></li>
              <li><a href="#home" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 rounded">Privacy &amp; data governance</a></li>
            </ul>
          </nav>

        </div>

        <div className="max-w-6xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4">
          <p>© 2026 SahakarMitra. Built for Maharashtra Cooperative Societies.</p>
          <p>Grounded retrieval · ChromaDB · MiniLM embeddings</p>
        </div>
      </footer>

    </div>
  );
}
