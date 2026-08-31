import React, { useState } from 'react';
import CitationCard from './CitationCard.jsx';
import ImageModal   from './ImageModal.jsx';
import { makeT }    from '../i18n.js';

/**
 * Format markdown text strings into rich HTML components:
 * - Headings: # ## ### -> Styled Typography Headings
 * - Bold text: **text** -> <strong>
 * - Bracket Badges: [ Tag1 | Tag2 ] -> Styled Tag Pills
 * - Lists: 1. Numbered or - Bulleted -> Styled Lists
 * - Tables: | Col1 | Col2 | -> Styled Tailwind HTML Tables
 * - Blockquotes: > quote -> Styled Callout Box
 * - Section references: (Section X) -> Clean inline SVG badge
 */
function renderFormattedContent(text) {
  if (!text) return null;

  // Pre-process text:
  // 1. Replace raw <br>, <br/>, <br /> string tags with real line breaks (\n)
  let normalizedText = text.replace(/<br\s*\/?>/gi, '\n');

  // 2. Normalize pseudo-table pipes e.g. "| 2. Heading | Description |" into clean structured sections
  normalizedText = normalizedText.replace(/\|\s*(\d+\.\s+[^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|/g, (match, p1, p2) => {
    return `\n\n### ${p1.trim()}\n${p2.trim()}\n\n`;
  });
  normalizedText = normalizedText.replace(/\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|/g, (match, p1, p2) => {
    if (p1.startsWith('-') || p1.startsWith('|') || p1.toLowerCase().includes('source') || p1.toLowerCase().includes('file')) return match;
    return `\n\n### ${p1.trim()}\n${p2.trim()}\n\n`;
  });

  // Split into block paragraphs separated by empty lines
  const rawParagraphs = normalizedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  return rawParagraphs.map((block, bIdx) => {
    const lines = block.split('\n').filter(l => l.trim().length > 0);
    const firstLine = lines[0].trim();

    // 1. Horizontal Rule (--- or ___ or ***)
    if (/^(---|___|\*\*\*)$/.test(firstLine)) {
      return <hr key={bIdx} className="my-4 border-t border-stone-200" />;
    }

    // 2. Headings (# Heading, ## Heading, ### Heading, #### Heading)
    if (/^#{1,6}\s+/.test(firstLine)) {
      const match = firstLine.match(/^(#{1,6})\s+(.*)/);
      const level = match[1].length;
      const title = match[2];

      if (level <= 2) {
        return (
          <h2 key={bIdx} className="text-base sm:text-lg font-black text-stone-900 mt-5 mb-2.5 pb-1 border-b border-amber-200/60 flex items-center gap-2">
            <span className="w-2 h-4 bg-[#a03612] rounded-full inline-block"></span>
            <span>{parseInlineFormatting(title)}</span>
          </h2>
        );
      } else if (level === 3) {
        return (
          <h3 key={bIdx} className="text-sm sm:text-base font-bold text-[#a03612] mt-4 mb-2 flex items-center gap-2">
            <span>{parseInlineFormatting(title)}</span>
          </h3>
        );
      } else {
        return (
          <h4 key={bIdx} className="text-xs sm:text-sm font-bold text-stone-800 mt-3 mb-1.5 uppercase tracking-wider">
            {parseInlineFormatting(title)}
          </h4>
        );
      }
    }

    // 3. Markdown Tables (| Col 1 | Col 2 |)
    const isTable = lines.length >= 2 && lines.every(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
    if (isTable) {
      const rows = lines.map(line =>
        line.split('|').map(cell => cell.trim()).filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1)
      );
      const headerRow = rows[0];
      const dataRows = rows.slice(2).filter(row => row.length > 0);

      return (
        <div key={bIdx} className="my-4 overflow-x-auto rounded-xl border border-stone-200/90 shadow-xs bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-amber-50/90 border-b border-stone-200 text-stone-900 font-bold">
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="px-3 py-2 border-r last:border-r-0 border-stone-200/70">
                    {parseInlineFormatting(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-stone-100 hover:bg-stone-50/80 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 border-r last:border-r-0 border-stone-100 text-stone-700 leading-relaxed">
                      {parseInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // 4. Blockquotes (> text)
    if (lines.every(l => l.trim().startsWith('>'))) {
      const quoteText = lines.map(l => l.replace(/^>\s*/, '')).join(' ');
      return (
        <blockquote key={bIdx} className="my-3 pl-4 py-2 border-l-4 border-[#a03612] bg-amber-50/50 rounded-r-xl text-xs sm:text-sm text-stone-800 italic">
          {parseInlineFormatting(quoteText)}
        </blockquote>
      );
    }

    // 5. Line-by-Line Processing (Lists, bullet points, headers, paragraphs)
    const processedElements = [];
    let currentList = null;

    lines.forEach((line, lIdx) => {
      const trimmed = line.trim();

      // Numbered List Item
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        if (currentList?.type !== 'ol') {
          currentList = { type: 'ol', items: [] };
          processedElements.push(currentList);
        }
        currentList.items.push({ num: numMatch[1], content: numMatch[2] });
        return;
      }

      // Bullet List Item
      const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
      if (bulletMatch) {
        if (currentList?.type !== 'ul') {
          currentList = { type: 'ul', items: [] };
          processedElements.push(currentList);
        }
        currentList.items.push({ content: bulletMatch[1] });
        return;
      }

      // Heading embedded in line
      if (/^#{1,6}\s+/.test(trimmed)) {
        currentList = null;
        const match = trimmed.match(/^(#{1,6})\s+(.*)/);
        processedElements.push({ type: 'heading', level: match[1].length, title: match[2] });
        return;
      }

      // Standard text line
      currentList = null;
      processedElements.push({ type: 'text', content: line });
    });

    return (
      <div key={bIdx} className="mb-3.5 last:mb-0 space-y-2">
        {processedElements.map((item, iIdx) => {
          if (item.type === 'ol') {
            return (
              <ol key={iIdx} className="space-y-2.5 my-2.5 pl-1">
                {item.items.map((it, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-stone-800">
                    <span className="w-5 h-5 rounded-full bg-amber-100/90 text-[#a03612] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs border border-amber-200/60">
                      {it.num}
                    </span>
                    <span className="flex-1">{parseInlineFormatting(it.content)}</span>
                  </li>
                ))}
              </ol>
            );
          }

          if (item.type === 'ul') {
            return (
              <ul key={iIdx} className="space-y-2 my-2 pl-1">
                {item.items.map((it, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-stone-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a03612] flex-shrink-0 mt-2"></span>
                    <span className="flex-1">{parseInlineFormatting(it.content)}</span>
                  </li>
                ))}
              </ul>
            );
          }

          if (item.type === 'heading') {
            return (
              <h4 key={iIdx} className="text-xs sm:text-sm font-bold text-[#a03612] mt-3 mb-1 uppercase tracking-wider">
                {parseInlineFormatting(item.title)}
              </h4>
            );
          }

          return (
            <p key={iIdx} className="text-xs sm:text-sm leading-relaxed text-stone-800">
              {parseInlineFormatting(item.content)}
            </p>
          );
        })}
      </div>
    );
  });
}

/**
 * Parse inline **bold** syntax, [ Tag1 | Tag2 ] pills, and (Section X) legal tags
 */
function parseInlineFormatting(str) {
  if (!str) return '';

  // Check if line matches bracketed tags e.g. "[ Issue | Relevant Provision | Description ]"
  const bracketMatch = str.match(/^\[\s*(.*?)\s*\]$/);
  if (bracketMatch && bracketMatch[1].includes('|')) {
    const tags = bracketMatch[1].split('|').map(t => t.trim());
    return (
      <span className="inline-flex flex-wrap gap-1.5 my-1.5">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-xs flex items-center gap-1 ${
              idx === 0
                ? 'bg-amber-100/90 text-[#a03612] border-amber-300/80'
                : idx === 1
                ? 'bg-teal-50 text-[#2d6a68] border-teal-200'
                : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            {tag}
          </span>
        ))}
      </span>
    );
  }

  // Parse bold **text** and code `text`
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-stone-100 text-[#a03612] px-1.5 py-0.5 rounded font-mono text-[11px] border border-stone-200">{part.slice(1, -1)}</code>;
    }

    // Highlight (Section X) legal tags
    const sectionRegex = /(\(Section[s]?\s+[0-9A-Z\s,()&a-z-]+\))/gi;
    const sectionParts = part.split(sectionRegex);

    return sectionParts.map((secPart, j) => {
      if (/^\(Section[s]?\s+[0-9A-Z\s,()&a-z-]+\)$/i.test(secPart)) {
        return (
          <span key={j} className="inline-flex items-center gap-1 font-semibold text-[#2d6a68] bg-teal-50 px-2 py-0.5 mx-0.5 rounded-md border border-teal-200/80 text-[11px] font-mono shadow-xs">
            <svg className="w-3 h-3 text-[#2d6a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{secPart}</span>
          </span>
        );
      }
      return secPart;
    });
  });
}

// Format a message timestamp as a short locale time, e.g. "14:32"
function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function MessageBubble({ message, language = 'en', onRetry, onRegenerate, isLastBot }) {
  const isUser  = message.role === 'user';
  const isError = message.isError;
  const t = makeT(language);

  const [copied, setCopied]   = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null
  const [previewImage, setPreviewImage] = useState(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — ignore
    }
  };

  const handleFeedback = (value) => {
    setFeedback(value);
    console.log(`[feedback] msg=${message.id} rating=${value}`);
  };

  const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
        <div
          className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-5 py-4 shadow-soft transition-all duration-200 ${
            isUser
              ? 'bg-[#1e4e4d] text-white rounded-tr-none'
              : isError
              ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-tl-none'
              : 'bg-white border border-stone-200/90 text-stone-800 rounded-tl-none'
          }`}
        >
          {/* Timestamp */}
          {formatTime(message.ts) && (
            <div className={`text-[10px] mb-1.5 font-medium ${isUser ? 'text-white/60' : 'text-stone-400'}`}>
              {formatTime(message.ts)}
            </div>
          )}

          {/* User Attachments (Screenshots & Document chips) */}
          {isUser && hasAttachments && (
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {message.attachments.map((att, idx) => {
                  const isImg = att.isImage || (att.type && att.type.startsWith('image/')) || (att.data && att.data.startsWith('data:image/'));
                  if (isImg) {
                    return (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(att)}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/20 shadow-md bg-black/20 hover:border-amber-300/80 transition"
                      >
                        <img
                          src={att.data}
                          alt={att.name || 'Screenshot'}
                          className="h-28 w-40 object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2 opacity-90 group-hover:opacity-100">
                          <span className="text-[10px] font-medium text-white truncate max-w-[130px] flex items-center gap-1">
                            <svg className="w-3 h-3 text-amber-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {att.name || 'Screenshot'}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-xs shadow-xs"
                    >
                      <svg className="w-4 h-4 text-amber-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-semibold truncate max-w-[160px]">{att.name}</span>
                      {att.size && <span className="text-[10px] text-white/70">({formatFileSize(att.size)})</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message Text with Rich HTML Formatting */}
          {message.text && (
            <div className="prose prose-stone max-w-none">
              {renderFormattedContent(message.text)}
            </div>
          )}

          {/* Streaming indicator */}
          {message.streaming && (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#a03612] animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#a03612] animate-ping" />
              <span>Generating legal answer...</span>
            </div>
          )}

          {/* Citations section */}
          {!isUser && Array.isArray(message.sources) && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-stone-200/80 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#a03612]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{t('sourcesHeading')}</span>
              </div>

              <div className="space-y-2">
                {message.sources.map((src, index) => (
                  <CitationCard key={index} source={src} index={index + 1} language={language} />
                ))}
              </div>
            </div>
          )}

          {/* Error actions: Retry */}
          {isError && onRetry && message.retryText && (
            <div className="mt-3 pt-2 border-t border-rose-200/80 flex items-center justify-between">
              <span className="text-[11px] text-rose-700 font-medium">Failed to reach AI service</span>
              <button
                onClick={() => onRetry(message)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t('retry')}</span>
              </button>
            </div>
          )}

          {/* Bot Action Bar: Copy + Regenerate + Feedback */}
          {!isUser && !isError && !message.streaming && (
            <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-stone-800 transition"
                  title={t('copyAnswer')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                  </svg>
                  <span>{copied ? t('copied') : t('copyAnswer')}</span>
                </button>

                {isLastBot && onRegenerate && (
                  <button
                    onClick={() => onRegenerate(message)}
                    className="flex items-center gap-1 hover:text-stone-800 transition"
                    title={t('regenerate')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{t('regenerate')}</span>
                  </button>
                )}
              </div>

              {/* Thumbs Up / Down Feedback */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 hidden sm:inline">{t('wasHelpful')}</span>
                <button
                  onClick={() => handleFeedback('up')}
                  className={`p-1 rounded hover:bg-stone-100 transition ${feedback === 'up' ? 'text-emerald-600 font-bold scale-110' : 'text-stone-400'}`}
                  title="Helpful"
                  aria-label="Helpful"
                >
                  <svg className="w-3.5 h-3.5" fill={feedback === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2" />
                  </svg>
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  className={`p-1 rounded hover:bg-stone-100 transition ${feedback === 'down' ? 'text-rose-600 font-bold scale-110' : 'text-stone-400'}`}
                  title="Not helpful"
                  aria-label="Not helpful"
                >
                  <svg className="w-3.5 h-3.5" fill={feedback === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-9h2a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                  </svg>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <ImageModal
          image={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}
