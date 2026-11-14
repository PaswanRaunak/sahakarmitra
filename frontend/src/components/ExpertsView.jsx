import React, { useState, useEffect } from 'react';
import { makeT } from '../i18n.js';

const EXPERTS_DATA = [
  {
    id: 'exp-1',
    name: 'Adv. Rajesh S. Deshmukh',
    designation: 'High Court Advocate & Senior Cooperative Legal Advisor',
    experience: 22,
    location: 'Fort, Mumbai / Pune',
    rating: 4.9,
    reviewsCount: 142,
    avatarBg: 'from-forest-soft to-forest',
    avatarInitials: 'RD',
    availability: 'Available Today (2 Slots)',
    availabilityStatus: 'online',
    languages: ['English', 'Hindi', 'Marathi'],
    modes: ['Video Call', 'In-Person', 'Document Review'],
    expertise: [
      'Maharashtra Co-operative Societies Act',
      'Housing Society Law',
      'Member Disputes',
      'Deemed Conveyance'
    ],
    bio: 'Specializing in MCS Act 1960 litigation, housing society registration disputes, deemed conveyance, and registrar tribunal appeals for over two decades.',
    education: 'LL.M (Cooperative & Property Law), Mumbai University',
    barRegistration: 'MAH/1482/2002',
    fee: '₹1,500 / 30 mins'
  },
  {
    id: 'exp-2',
    name: 'CA Smita V. Kulkarni',
    designation: 'Certified Cooperative Society Auditor & Financial Consultant',
    experience: 16,
    location: 'Kothrud, Pune / Thane',
    rating: 4.8,
    reviewsCount: 98,
    avatarBg: 'from-teal-700 to-emerald-800',
    avatarInitials: 'SK',
    availability: 'Available Tomorrow',
    availabilityStatus: 'away',
    languages: ['English', 'Marathi'],
    modes: ['Video Call', 'Document Review'],
    expertise: [
      'Audit & Accounts',
      'Compliance & Notices',
      'Society Bye-laws',
      'Financial Misappropriation'
    ],
    bio: 'Empanelled statutory auditor for cooperative housing societies. Expert in forensic accounting, audit rectifications, and Form O compliance.',
    education: 'FCA, DISA (ICAI), Certified CHS Auditor',
    barRegistration: 'ICAI-MEM-049281',
    fee: '₹1,200 / 30 mins'
  },
  {
    id: 'exp-3',
    name: 'Adv. Vikram P. Joshi',
    designation: 'Specialist in Cooperative Elections & General Body Governance',
    experience: 14,
    location: 'Vashi, Navi Mumbai',
    rating: 4.9,
    reviewsCount: 115,
    avatarBg: 'from-forest to-forest-soft',
    avatarInitials: 'VJ',
    availability: 'Available Today',
    availabilityStatus: 'online',
    languages: ['English', 'Hindi', 'Marathi'],
    modes: ['Video Call', 'In-Person', 'Document Review'],
    expertise: [
      'AGM & General Body Meetings',
      'Cooperative Society Elections',
      'Society Bye-laws',
      'Compliance & Notices'
    ],
    bio: 'Advisor to election officers and managing committees under Section 73CB. Expert in resolving election disputes, quorum issues, and bye-law amendments.',
    education: 'LL.B, Symbiosis Law School Pune',
    barRegistration: 'MAH/3910/2010',
    fee: '₹1,400 / 30 mins'
  },
  {
    id: 'exp-4',
    name: 'Adv. Sunita R. Patil',
    designation: 'Registrar Tribunal Advocate & Dues Recovery Specialist',
    experience: 19,
    location: 'Civil Lines, Nagpur / Nashik',
    rating: 4.7,
    reviewsCount: 86,
    avatarBg: 'from-stone-600 to-stone-900',
    avatarInitials: 'SP',
    availability: 'Available Friday',
    availabilityStatus: 'offline',
    languages: ['English', 'Hindi', 'Marathi'],
    modes: ['Video Call', 'In-Person'],
    expertise: [
      'Property/Member Disputes',
      'Housing Society Law',
      'Compliance & Notices',
      'Maharashtra Co-operative Societies Act'
    ],
    bio: 'Extensive experience in Section 101 maintenance dues recovery certificates, builder NOC disputes, redevelopment tripartite agreements, and cooperative court litigation.',
    education: 'LL.M (Civil & Commercial Laws), Nagpur University',
    barRegistration: 'MAH/2204/2005',
    fee: '₹1,600 / 30 mins'
  },
  {
    id: 'exp-5',
    name: 'Sanjay M. Bhosale',
    designation: 'Retd. Dy. Registrar of Cooperative Societies (Govt. of MH)',
    experience: 28,
    location: 'Bandra, Mumbai',
    rating: 5.0,
    reviewsCount: 164,
    avatarBg: 'from-amber-700 to-red-900',
    avatarInitials: 'SB',
    availability: 'Available Today',
    availabilityStatus: 'online',
    languages: ['English', 'Hindi', 'Marathi'],
    modes: ['Document Review', 'Video Call'],
    expertise: [
      'Society Registration',
      'Compliance & Notices',
      'Maharashtra Co-operative Societies Act',
      'Society Bye-laws'
    ],
    bio: 'Former Deputy Registrar providing strategic guidance on official government filings, Section 79 notices, society amalgamation, and regulatory compliance.',
    education: 'M.A. (Public Admin), Retired Class-I Gazetted Officer',
    barRegistration: 'MH-GOVT-REG-7492',
    fee: '₹2,000 / 30 mins'
  },
  {
    id: 'exp-6',
    name: 'Adv. Meera N. Iyer',
    designation: 'Real Estate & Housing Society Redevelopment Legal Counsel',
    experience: 12,
    location: 'Andheri West, Mumbai',
    rating: 4.8,
    reviewsCount: 74,
    avatarBg: 'from-accent-strong to-forest',
    avatarInitials: 'MI',
    availability: 'Available Tomorrow',
    availabilityStatus: 'away',
    languages: ['English', 'Hindi'],
    modes: ['Video Call', 'In-Person'],
    expertise: [
      'Housing Society Law',
      'Property/Member Disputes',
      'Society Bye-laws',
      'Deemed Conveyance'
    ],
    bio: 'Legal drafting and scrutiny of Development Agreements, feasibility reports, and builder tenders under Section 79A redevelopment guidelines.',
    education: 'LL.B (Gold Medalist), Pravin Gandhi College of Law',
    barRegistration: 'MAH/5820/2012',
    fee: '₹1,800 / 30 mins'
  }
];

const EXPERTISE_TAGS = [
  'All',
  'Maharashtra Co-operative Societies Act',
  'Housing Society Law',
  'Society Registration',
  'AGM & General Body Meetings',
  'Cooperative Society Elections',
  'Audit & Accounts',
  'Property/Member Disputes',
  'Society Bye-laws',
  'Compliance & Notices'
];

export default function ExpertsView({ language = 'en' }) {
  const t = makeT(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [profileModalExpert, setProfileModalExpert] = useState(null);
  const [bookingModalExpert, setBookingModalExpert] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    date: '',
    time: '10:30 AM',
    mode: 'Video Call',
    topic: '',
    notes: ''
  });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  // Filter experts
  const filteredExperts = EXPERTS_DATA.filter((exp) => {
    const matchesSearch =
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.expertise.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag =
      selectedTag === 'All' || exp.expertise.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const handleOpenBooking = (expert) => {
    setBookingModalExpert(expert);
    setBookingForm({
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '10:30 AM',
      mode: expert.modes[0] || 'Video Call',
      topic: expert.expertise[0] || 'Cooperative Legal Inquiry',
      notes: ''
    });
    setBookingSubmitted(false);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    setBookingSubmitted(true);
    setTimeout(() => {
      setBookingSubmitted(false);
      setBookingModalExpert(null);
    }, 2800);
  };

  // Escape closes whichever expert modal is open
  useEffect(() => {
    if (!profileModalExpert && !bookingModalExpert) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setProfileModalExpert(null);
        setBookingModalExpert(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profileModalExpert, bookingModalExpert]);

  return (
    <div className="h-full overflow-y-auto bg-surface p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header & Hero Section */}
      <div className="bg-elevated rounded-3xl p-6 sm:p-8 border border-line shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
              <span>Human Assistance & Legal Counsel</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-ink tracking-tight">
              {t('expertsHeading')}
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft max-w-3xl mt-1">
              {t('expertsSubheading')}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-sunken/80 p-3 rounded-2xl border border-line text-xs">
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base flex-shrink-0">
              ✓
            </div>
            <div>
              <p className="font-bold text-ink">Verified Legal Counsel</p>
              <p className="text-[11px] text-ink-muted">Maharashtra Bar & ICAI Empanelled</p>
            </div>
          </div>
        </div>

        {/* Search Input & Filtering */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchExpertsPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-sunken border border-line rounded-2xl text-xs sm:text-sm text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-accent focus:bg-elevated transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear expert search"
                className="absolute right-3 top-2.5 text-ink-muted hover:text-ink-soft text-xs font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Expertise Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {EXPERTISE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors duration-200 ${
                selectedTag === tag
                  ? 'bg-accent text-white font-bold shadow-xs scale-105'
                  : 'bg-sunken text-ink-soft hover:bg-sunken/80 hover:text-ink'
              }`}
            >
              {tag === 'All' ? t('allExpertise') : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Expert Cards Grid */}
      {filteredExperts.length === 0 ? (
        <div className="bg-elevated rounded-3xl p-12 text-center border border-line shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-full bg-sunken text-ink-muted flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-ink">No matching experts found</h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            Try adjusting your search terms or clearing the specialization filters.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedTag('All'); }}
            className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-strong transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {filteredExperts.map((expert, idx) => (
            <div
              key={expert.id}
              className="stagger py-6 grid md:grid-cols-12 gap-4 md:gap-6 items-center"
              style={{ '--i': Math.min(idx, 8) }}
            >
              {/* Identity */}
              <div className="md:col-span-4 flex items-center gap-4 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${expert.avatarBg} text-white font-black text-lg flex items-center justify-center shadow-md`}>
                    {expert.avatarInitials}
                  </div>
                  <span
                    title={expert.availability}
                    aria-label={expert.availability}
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      expert.availabilityStatus === 'online'
                        ? 'bg-success/100'
                        : expert.availabilityStatus === 'away'
                        ? 'bg-accent-soft0'
                        : 'bg-stone-400'
                    }`}
                  ></span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-ink truncate">{expert.name}</h3>
                    <span className="text-forest-soft font-bold text-xs" title={t('verifiedExpert')} aria-label={t('verifiedExpert')}>✓</span>
                  </div>
                  <p className="text-[11px] text-ink-muted font-medium truncate">{expert.designation}</p>
                  <p className="text-[11px] text-ink-soft mt-1 tabular-nums">
                    <span className="text-amber-500 font-bold">★ {expert.rating}</span>
                    <span className="text-ink-muted"> ({expert.reviewsCount})</span>
                    <span className="text-ink-muted mx-1.5">·</span>
                    <span className="font-semibold text-ink-soft">{expert.experience} {t('yearsExp')}</span>
                  </p>
                </div>
              </div>

              {/* Expertise */}
              <div className="md:col-span-4 min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  {expert.expertise.slice(0, 3).map((exp, eidx) => (
                    <span key={eidx} className="px-2.5 py-1 bg-sunken text-ink-soft rounded-lg text-[10px] font-semibold">
                      {exp}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-ink-muted mt-2 truncate">
                  <span className="font-medium text-ink-muted">{t('languagesSpoken')}: </span>
                  <span className="font-semibold text-ink-soft">{expert.languages.join(', ')}</span>
                </p>
              </div>

              {/* Rate + actions */}
              <div className="md:col-span-4 flex md:flex-col md:items-end gap-3 md:gap-2">
                <p className="text-sm font-extrabold text-accent tabular-nums md:order-1">{expert.fee}</p>
                <div className="flex items-center gap-2 md:order-2">
                  <button
                    onClick={() => setProfileModalExpert(expert)}
                    className="flex-1 py-2 px-3 bg-elevated hover:bg-sunken text-ink-soft border border-line rounded-xl text-xs font-bold transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t('viewProfile')}
                  </button>
                  <button
                    onClick={() => handleOpenBooking(expert)}
                    className="flex-1 py-2 px-3 bg-accent hover:bg-accent-strong text-white rounded-xl text-xs font-bold transition-colors shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    {t('bookConsultation')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EXPERT PROFILE MODAL */}
      {profileModalExpert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Profile: ${profileModalExpert.name}`}
          onClick={(e) => { if (e.target === e.currentTarget) setProfileModalExpert(null); }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overscroll-contain">
          <div className="bg-elevated rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-line shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${profileModalExpert.avatarBg} text-white font-black text-xl flex items-center justify-center shadow-md`}>
                  {profileModalExpert.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-ink">{profileModalExpert.name}</h2>
                    <span className="px-2 py-0.5 bg-success/15 text-success text-[10px] font-bold rounded-full">Empanelled</span>
                  </div>
                  <p className="text-xs text-ink-muted font-medium">{profileModalExpert.designation}</p>
                  <p className="text-[11px] text-ink-muted">{profileModalExpert.location}</p>
                </div>
              </div>

              <button
                onClick={() => setProfileModalExpert(null)}
                className="w-8 h-8 rounded-full bg-sunken hover:bg-sunken text-ink-soft flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs sm:text-sm text-ink-soft">
              <div>
                <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] mb-1">About & Experience</h4>
                <p className="leading-relaxed text-ink-soft">{profileModalExpert.bio}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-sunken p-4 rounded-2xl border border-line">
                <div>
                  <p className="text-[10px] text-ink-muted font-bold uppercase">Education & Bar Certs</p>
                  <p className="font-semibold text-ink mt-0.5">{profileModalExpert.education}</p>
                  <p className="text-[11px] text-ink-muted">Reg: {profileModalExpert.barRegistration}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-muted font-bold uppercase">Consultation Fee</p>
                  <p className="font-extrabold text-accent text-sm mt-0.5">{profileModalExpert.fee}</p>
                  <p className="text-[11px] text-ink-muted">Direct 1-on-1 Consultation</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] mb-2">Specializations & Practice Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {profileModalExpert.expertise.map((exp, idx) => (
                    <span key={idx} className="px-3 py-1 bg-accent-soft text-accent border border-accent/40 rounded-xl text-xs font-semibold">
                      ✓ {exp}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] mb-1">Languages Spoken</h4>
                <p className="font-medium text-ink">{profileModalExpert.languages.join(', ')}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setProfileModalExpert(null)}
                className="px-4 py-2 bg-sunken hover:bg-sunken text-ink-soft rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const exp = profileModalExpert;
                  setProfileModalExpert(null);
                  handleOpenBooking(exp);
                }}
                className="px-5 py-2 bg-accent hover:bg-accent-strong text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {t('bookConsultation')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BOOK CONSULTATION MODAL */}
      {bookingModalExpert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Book consultation: ${bookingModalExpert.name}`}
          onClick={(e) => { if (e.target === e.currentTarget) setBookingModalExpert(null); }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overscroll-contain">
          <div className="bg-elevated rounded-3xl max-w-lg w-full border border-line shadow-2xl p-6 sm:p-8 space-y-5 animate-scale-in relative">
            
            <button
              onClick={() => setBookingModalExpert(null)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-sunken hover:bg-sunken text-ink-soft flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>

            {bookingSubmitted ? (
              <div className="py-8 text-center space-y-4 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-ink">{t('bookingSuccessTitle')}</h3>
                <p className="text-xs text-ink-soft max-w-sm mx-auto leading-relaxed">
                  {t('bookingSuccessDesc')}
                </p>
                <div className="p-4 bg-sunken rounded-2xl text-left border border-line text-xs space-y-1">
                  <p><span className="font-bold">Expert:</span> {bookingModalExpert.name}</p>
                  <p><span className="font-bold">Date & Time:</span> {bookingForm.date} at {bookingForm.time}</p>
                  <p><span className="font-bold">Mode:</span> {bookingForm.mode}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">{t('bookConsultation')}</h3>
                  <p className="text-xs text-ink-muted">with <span className="font-bold text-ink">{bookingModalExpert.name}</span></p>
                </div>

                {/* Date & Time Picker */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-ink-soft mb-1">Preferred Date</label>
                    <input
                      type="date"
                      required
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                      className="w-full p-2.5 bg-sunken border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-ink-soft mb-1">Time Slot</label>
                    <select
                      value={bookingForm.time}
                      onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                      className="w-full p-2.5 bg-sunken border border-line rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option>10:30 AM</option>
                      <option>02:00 PM</option>
                      <option>04:30 PM</option>
                      <option>06:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="text-xs">
                  <label className="block font-bold text-ink-soft mb-1">Consultation Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {bookingModalExpert.modes.map((mode) => (
                      <button
                        type="button"
                        key={mode}
                        onClick={() => setBookingForm({ ...bookingForm, mode })}
                        className={`py-2 px-2 text-center rounded-xl font-semibold border text-[11px] transition ${
                          bookingForm.mode === mode
                            ? 'bg-accent text-white border-accent'
                            : 'bg-sunken text-ink-soft border-line hover:bg-sunken'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic / Issue Description */}
                <div className="text-xs space-y-1">
                  <label className="block font-bold text-ink-soft">Legal Topic / Issue Summary</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe your society dispute, MCS Act section inquiry, or audit query..."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    className="w-full p-3 bg-sunken border border-line rounded-xl text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingModalExpert(null)}
                    className="px-4 py-2 bg-sunken hover:bg-sunken text-ink-soft rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-accent hover:bg-accent-strong text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Confirm & Submit
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
