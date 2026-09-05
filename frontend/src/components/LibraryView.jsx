import React, { useState, useEffect, useMemo } from 'react';
import { makeT } from '../i18n.js';
import { LEGAL_TRANSLATIONS } from '../legalTranslations.js';

export default function LibraryView({
  language = 'en',
  initialCategory = 'all',
  initialStateFilter = 'all',
  initialShowBookmarksOnly = false,
}) {
  const t = makeT(language);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedStateFilter, setSelectedStateFilter] = useState(initialStateFilter);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(initialShowBookmarksOnly);
  const [copiedId, setCopiedId] = useState(null);
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('sahakar_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync initial parameters if props change
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
    if (initialStateFilter) setSelectedStateFilter(initialStateFilter);
    if (initialShowBookmarksOnly !== undefined) setShowBookmarksOnly(initialShowBookmarksOnly);
  }, [initialCategory, initialStateFilter, initialShowBookmarksOnly]);

  // Save bookmarks to localStorage and sync with backend POST /api/bookmarks
  const saveBookmarksState = (newBookmarks) => {
    setBookmarks(newBookmarks);
    try {
      localStorage.setItem('sahakar_bookmarks', JSON.stringify(newBookmarks));
    } catch {
      // Ignore
    }
  };

  // Fetch ingested chunks from GET /api/library and GET /api/bookmarks
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetch('/api/library').then((res) => (res.ok ? res.json() : [])).catch(() => []),
      fetch('/api/bookmarks').then((res) => (res.ok ? res.json() : [])).catch(() => []),
    ]).then(([libData, backendBookmarks]) => {
      if (!isMounted) return;

      if (Array.isArray(libData) && libData.length > 0) {
        setDocuments(libData);
      } else {
        setDocuments(FALLBACK_DOCUMENTS);
      }

      if (Array.isArray(backendBookmarks) && backendBookmarks.length > 0) {
        saveBookmarksState(backendBookmarks);
      }

      setLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      console.warn('[LibraryView] Fetch error:', err);
      setDocuments(FALLBACK_DOCUMENTS);
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  // Toggle bookmark action
  const toggleBookmark = (doc) => {
    const isBookmarked = bookmarks.some((b) => b.id === doc.id || b.section_title === doc.section_title);
    let updated;
    if (isBookmarked) {
      updated = bookmarks.filter((b) => b.id !== doc.id && b.section_title !== doc.section_title);
    } else {
      updated = [{ ...doc, bookmarkedAt: new Date().toISOString() }, ...bookmarks];
    }

    saveBookmarksState(updated);

    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    }).catch(() => {});
  };

  const getActName = (doc, lang) => {
    if (doc.act_name) return doc.act_name;
    if (lang === 'mr') return 'महाराष्ट्र सहकारी संस्था अधिनियम, १९६०';
    if (lang === 'hi') return 'महाराष्ट्र सहकारी समिति अधिनियम, 1960';
    return 'Maharashtra Cooperative Societies Act, 1960';
  };

  const getCategoryLabel = (catKey) => {
    if (catKey === 'Elections') return t('elections') || 'Elections';
    if (catKey === 'AGM') return t('agm') || 'AGM';
    if (catKey === 'Registration') return t('registration') || 'Registration';
    if (catKey === 'Member Rights') return t('memberRights') || 'Member Rights';
    if (catKey === 'Disputes') return t('disputes') || 'Disputes';
    if (catKey === 'Auditing') return t('auditing') || 'Auditing';
    return catKey;
  };

  const extractSectionNumber = (title, text, lang = 'en') => {
    const match = (title || text || '').match(/(Section|धारा|कलम)\s+\d+[A-Z]?/i);
    let secNum = match ? match[0] : (title || '').split(':')[0] || 'Section';
    const numPart = secNum.replace(/[^0-9A-Za-z]/g, '');

    if (lang === 'hi') return `धारा ${numPart || ''}`.trim();
    if (lang === 'mr') return `कलम ${numPart || ''}`.trim();
    return `Section ${numPart || ''}`.trim();
  };

  const getTranslatedDoc = (doc, lang) => {
    const translation = LEGAL_TRANSLATIONS[doc.id]?.[lang];
    if (translation) {
      return {
        ...doc,
        act_name: translation.act_name || doc.act_name || getActName(doc, lang),
        section_title: translation.section_title || doc.section_title,
        full_text: translation.full_text || doc.full_text,
        isTranslated: true,
      };
    }
    return {
      ...doc,
      act_name: doc.act_name || getActName(doc, lang),
      isTranslated: false,
    };
  };

  const handleCopyCitation = (doc, lang = language) => {
    const secNumber = extractSectionNumber(doc.section_title, doc.full_text, lang);
    const actName = doc.act_name || getActName(doc, lang);
    const citationText = `"${secNumber}, ${actName}"`;

    navigator.clipboard.writeText(citationText).then(() => {
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  const STATES = [
    { key: 'all', label: t('stateFilterAll') || 'All States' },
    { key: 'Maharashtra', label: t('stateMaharashtra') || 'Maharashtra' },
    { key: 'Gujarat', label: t('stateGujarat') || 'Gujarat' },
    { key: 'Karnataka', label: t('stateKarnataka') || 'Karnataka' },
    { key: 'Multi-State', label: t('stateMultiState') || 'Multi-State' },
  ];

  const CATEGORIES = [
    { key: 'all', label: t('allCategories') || 'All Categories' },
    { key: 'Elections', label: t('elections') || 'Elections' },
    { key: 'AGM', label: t('agm') || 'AGM' },
    { key: 'Registration', label: t('registration') || 'Registration' },
    { key: 'Member Rights', label: t('memberRights') || 'Member Rights' },
    { key: 'Disputes', label: t('disputes') || 'Disputes' },
    { key: 'Auditing', label: t('auditing') || 'Auditing' },
  ];

  const filteredDocuments = useMemo(() => {
    let list = showBookmarksOnly ? bookmarks : documents;

    if (selectedStateFilter !== 'all') {
      list = list.filter((doc) => (doc.state || 'Maharashtra').toLowerCase() === selectedStateFilter.toLowerCase());
    }

    if (selectedCategory !== 'all') {
      list = list.filter((doc) => doc.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((doc) => {
        const trDoc = getTranslatedDoc(doc, language);
        return (
          (doc.section_title || '').toLowerCase().includes(q) ||
          (doc.full_text || '').toLowerCase().includes(q) ||
          (doc.state || '').toLowerCase().includes(q) ||
          (trDoc.section_title || '').toLowerCase().includes(q) ||
          (trDoc.full_text || '').toLowerCase().includes(q) ||
          (trDoc.act_name || '').toLowerCase().includes(q) ||
          (doc.category || '').toLowerCase().includes(q)
        );
      });
    }

    return list.map((doc) => getTranslatedDoc(doc, language));
  }, [documents, bookmarks, selectedCategory, selectedStateFilter, searchQuery, showBookmarksOnly, language]);

  const groupedDocuments = useMemo(() => {
    if (selectedCategory !== 'all' || selectedStateFilter !== 'all' || searchQuery.trim() || showBookmarksOnly) {
      return null;
    }
    const groups = {};
    for (const doc of filteredDocuments) {
      const cat = doc.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(doc);
    }
    return groups;
  }, [filteredDocuments, selectedCategory, selectedStateFilter, searchQuery, showBookmarksOnly]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#faf8f5] p-4 sm:p-6 md:p-8">
      {/* Header Banner */}
      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* Title & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#a03612]/10 text-[#a03612]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                {showBookmarksOnly ? (t('myBookmarks') || 'My Bookmarked Sections') : (t('knowledgeRepoTitle') || 'Knowledge Repository')}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {showBookmarksOnly
                ? (t('bookmarksSubtitle') || 'Access your saved statutory sections and citations anytime.')
                : (t('knowledgeRepoSubtitle') || 'Browse and search ingested legal sections from the Maharashtra Cooperative Societies Act, 1960.')}
            </p>
          </div>

          {/* Quick Toggle for Bookmarks */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookmarksOnly(false)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                !showBookmarksOnly
                  ? 'bg-[#a03612] text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>{t('allDocuments') || 'All Documents'} ({documents.length})</span>
            </button>

            <button
              onClick={() => setShowBookmarksOnly(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                showBookmarksOnly
                  ? 'bg-[#a03612] text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={showBookmarksOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>{t('savedBookmarks') || 'Bookmarked'} ({bookmarks.length})</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchLibraryPlaceholder') || 'Search by section title, section number (e.g. Section 81A), or legal keyword...'}
              className="w-full pl-10 pr-10 py-3 bg-white border border-stone-200/90 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a03612]/30 focus:border-[#a03612] transition shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* State Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
              <span>📍</span>
              <span className="hidden sm:inline">{t('stateSelectorLabel') || 'Jurisdiction'}:</span>
            </span>
            {STATES.map((st) => {
              const isActive = selectedStateFilter === st.key;
              const count = st.key === 'all'
                ? documents.length
                : documents.filter((d) => (d.state || 'Maharashtra').toLowerCase() === st.key.toLowerCase()).length;

              return (
                <button
                  key={st.key}
                  onClick={() => setSelectedStateFilter(st.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#a03612] text-white shadow-xs'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-[#882c0e] text-white' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const count = cat.key === 'all'
                ? (selectedStateFilter === 'all' ? documents.length : documents.filter(d => (d.state || 'Maharashtra').toLowerCase() === selectedStateFilter.toLowerCase()).length)
                : documents.filter((d) => d.category === cat.key && (selectedStateFilter === 'all' || (d.state || 'Maharashtra').toLowerCase() === selectedStateFilter.toLowerCase())).length;

              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-stone-800 text-stone-200' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading skeletons (match the card layout) */}
        {loading && (
          <div role="status" aria-label="Loading sections" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border border-stone-200/90 rounded-2xl bg-white overflow-hidden shadow-soft">
                <div className="h-16 shimmer-bg" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3 w-2/3 rounded shimmer-bg" />
                  <div className="h-3 w-full rounded shimmer-bg" />
                  <div className="h-3 w-4/5 rounded shimmer-bg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Search / Filter Results */}
        {!loading && filteredDocuments.length === 0 && (
          <div className="py-16 text-center bg-white border border-stone-200/80 rounded-2xl p-8 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-stone-900">
              {showBookmarksOnly
                ? (t('noBookmarksYet') || 'No Bookmarked Sections Saved')
                : (t('noResultsFound') || 'No Legal Sections Match Your Criteria')}
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {showBookmarksOnly
                ? 'Click the bookmark icon on any section entry to save it to your personal legal reference list.'
                : 'Try adjusting your search keywords or switching category filters.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1.5 bg-[#a03612] text-white rounded-lg text-xs font-bold hover:bg-[#882c0e] transition"
              >
                Clear Search Query
              </button>
            )}
          </div>
        )}

        {/* Grouped View */}
        {!loading && groupedDocuments && Object.keys(groupedDocuments).length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedDocuments).map(([category, categoryDocs]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-stone-200/80 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#a03612]" />
                  <h2 className="text-base font-bold text-stone-900 tracking-tight">
                    {getCategoryLabel(category)} ({categoryDocs.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryDocs.map((doc) => (
                    <SectionCard
                      key={doc.id}
                      doc={doc}
                      language={language}
                      categoryLabel={getCategoryLabel(doc.category)}
                      isBookmarked={bookmarks.some((b) => b.id === doc.id || b.section_title === doc.section_title)}
                      onToggleBookmark={() => toggleBookmark(doc)}
                      onCopyCitation={() => handleCopyCitation(doc, language)}
                      isCopied={copiedId === doc.id}
                      extractSectionNumber={extractSectionNumber}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flat List View */}
        {!loading && !groupedDocuments && filteredDocuments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocuments.map((doc) => (
              <SectionCard
                key={doc.id}
                doc={doc}
                language={language}
                categoryLabel={getCategoryLabel(doc.category)}
                isBookmarked={bookmarks.some((b) => b.id === doc.id || b.section_title === doc.section_title)}
                onToggleBookmark={() => toggleBookmark(doc)}
                onCopyCitation={() => handleCopyCitation(doc, language)}
                isCopied={copiedId === doc.id}
                extractSectionNumber={extractSectionNumber}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// Individual Citation Card Component
function SectionCard({
  doc,
  language,
  categoryLabel,
  isBookmarked,
  onToggleBookmark,
  onCopyCitation,
  isCopied,
  extractSectionNumber,
}) {
  const t = makeT(language);
  const [showOriginal, setShowOriginal] = useState(false);

  // If user toggles to show original English, get the untranslated text
  const currentTitle = showOriginal ? (FALLBACK_DOCUMENTS.find(f => f.id === doc.id)?.section_title || doc.section_title) : doc.section_title;
  const currentText = showOriginal ? (FALLBACK_DOCUMENTS.find(f => f.id === doc.id)?.full_text || doc.full_text) : doc.full_text;
  const currentActName = showOriginal ? (doc.act_name || 'Cooperative Societies Act') : doc.act_name;
  const state = doc.state || 'Maharashtra';

  const secNum = extractSectionNumber(currentTitle, currentText, showOriginal ? 'en' : language);
  const cleanTitle = (currentTitle || '').replace(/—/g, ':');

  return (
    <div className="border border-stone-200/90 rounded-2xl bg-white overflow-hidden shadow-soft hover:shadow-md transition duration-200 flex flex-col justify-between">
      
      {/* Card Header: Act Name + State + Exact Section Number */}
      <div className="p-4 bg-stone-50/80 border-b border-stone-200/80 flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          {/* Act Badge, State & Category */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-[#a03612] font-bold">
              📍 {state}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#a03612]/10 text-[#a03612] font-bold tracking-tight">
              {currentActName}
            </span>
            {categoryLabel && (
              <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 font-semibold">
                {categoryLabel}
              </span>
            )}
          </div>

          {/* Section Number + Heading */}
          <h3 className="text-sm font-bold text-stone-900 leading-snug break-words">
            {cleanTitle}
          </h3>
        </div>

        {/* Action icons: Language toggle & Bookmark */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {language !== 'en' && (
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              title={showOriginal ? 'Show Translated text' : 'Show Original English statutory text'}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                showOriginal
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {showOriginal ? 'EN' : (language === 'hi' ? 'हिंदी' : 'मराठी')}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleBookmark}
            title={isBookmarked ? (t('removeBookmark') || 'Remove Bookmark') : (t('bookmarkSection') || 'Bookmark Section')}
            className={`p-2 rounded-xl transition flex-shrink-0 ${
              isBookmarked
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                : 'bg-white text-stone-400 hover:text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Verbatim Full Text */}
      <div className="p-4 text-xs text-stone-700 leading-relaxed font-sans flex-1 bg-white space-y-2">
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-100/90 font-serif whitespace-pre-wrap leading-relaxed text-stone-800">
          {currentText}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="px-4 py-3 bg-stone-50/60 border-t border-stone-200/80 flex items-center justify-between gap-2 text-xs">
        {/* Copy Citation Button */}
        <button
          onClick={onCopyCitation}
          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1.5 shadow-2xs ${
            isCopied
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:border-stone-300'
          }`}
          title={`Copy citation: "${secNum}, ${currentActName}"`}
        >
          {isCopied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('copied') || 'Citation Copied!'}</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>{t('copyCitation') || 'Copy Citation'}</span>
            </>
          )}
        </button>

        {/* Source file tag */}
        <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
          <svg className="w-3 h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{doc.source_file || 'ChromaDB'}</span>
        </span>
      </div>

    </div>
  );
}

const FALLBACK_DOCUMENTS = [
  {
    id: 'elections.txt::0',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
    section_title: 'Section 73: Conduct of elections to the committee',
    category: 'Elections',
    source_file: 'elections.txt',
    full_text: `Section 73: Conduct of elections to the committee\n(1) The election of the members of the committee of a society shall be conducted in the manner prescribed by the Registrar and, save as otherwise provided in the rules of the society, shall be by secret ballot.\n(2) Every society shall, before holding the election of the members of its committee, prepare a list of voters and publish it on the notice board of the society at least fourteen days before the date fixed for the election.\n(3) Any person whose name is included in the list of voters may contest the election by submitting a nomination paper duly proposed and seconded by two other voters of the same society.`,
  },
  {
    id: 'elections.txt::1',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
    section_title: 'Section 73B: Right to contest elections',
    category: 'Elections',
    source_file: 'elections.txt',
    full_text: `Section 73B: Right to contest elections\nA member of a society shall be eligible to contest the election of the committee if, on the date of filing nomination, the member:\n(a) is not in arrears of any dues payable to the society;\n(b) has not been held responsible for any loss caused to the society by an order passed under section 101;\n(c) has not been subjected to any disqualification under the rules.`,
  },
  {
    id: 'auditing.txt::0',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
    section_title: 'Section 81A: Appointment of auditor',
    category: 'AGM',
    source_file: 'auditing.txt',
    full_text: `Section 81A: Appointment of auditor\nAt every annual general meeting, a society shall appoint an auditor qualified under section 81B to audit the accounts of the society for the next year. The auditor shall hold office until the conclusion of the next annual general meeting and shall be eligible for reappointment.\nNo auditor shall be eligible for appointment unless the auditor is on the panel of auditors maintained by the Registrar.`,
  },
  {
    id: 'auditing.txt::1',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
    section_title: 'Section 81: Society to maintain books and accounts',
    category: 'Auditing',
    source_file: 'auditing.txt',
    full_text: `Section 81: Society to maintain books and accounts\nEvery society shall maintain such books and accounts as may be prescribed by the rules and shall have them audited annually by the auditor appointed under section 81A.\nThe books of accounts of the society shall be balanced and closed on the 30th day of June of each year or on such other date as may be specified in the by-laws of the society.`,
  },
  {
    id: 'society_registration.txt::0',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
    section_title: 'Section 5: Society organized to be registered',
    category: 'Registration',
    source_file: 'society_registration.txt',
    full_text: `Section 5: Society organized to be registered\nNo society, other than an existing society, shall be registered under this Act unless it is a society organized for the promotion of the economic interests of its members in accordance with co-operative principles.`,
  },
  {
    id: 'member_rights.txt::0',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
    section_title: 'Section 24: Rights and privileges of members',
    category: 'Member Rights',
    source_file: 'member_rights.txt',
    full_text: `Section 24: Rights and privileges of members\nA member of a society shall have the right to:\n(a) attend and take part in general body meetings and vote on resolutions;\n(b) inspect the registers, books and accounts of the society during office hours on any working day;\n(c) receive a copy of the annual report, the audit memorandum, and the audited balance sheet;\n(d) receive such dividend or bonus on the share capital held by the member as may be declared by the society.`,
  },
  {
    id: 'dispute_resolution.txt::0',
    act_name: 'Maharashtra Cooperative Societies Act, 1960',
    section_title: 'Section 91: Disputes referred to the Registrar',
    category: 'Disputes',
    source_file: 'dispute_resolution.txt',
    full_text: `Section 91: Disputes referred to the Registrar\n(1) If any dispute concerning the business of a society arises among members, or between a member and the society, or its committee, or between the society or its committee and any past committee member, such dispute shall be referred to the Registrar for decision.`,
  },
];
