import React, { useState } from 'react';
import CitationCard from './CitationCard.jsx';
import ImageModal   from './ImageModal.jsx';
import { makeT }    from '../i18n.js';

/**
 * Format markdown text strings into rich HTML components:
 * - Bold text: **text** -> <strong>
 * - Numbered steps: 1. **Heading** - Text -> Numbered list
 * - Section references: (Section X) -> Clean inline SVG badge
 */
function renderFormattedContent(text) {
  if (!text) return null;

  // Split text into paragraphs by blank lines or single linebreaks
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n').filter(l => l.trim().length > 0);

    // Check if lines are part of a numbered list e.g. "1. **Title** - Content"
    const isNumbered = lines.length > 1 && lines.every(line => /^\d+\.\s+/.test(line.trim()));
    const isBulleted = lines.length > 1 && lines.every(line => /^[-*•]\s+/.test(line.trim()));

    if (isNumbered) {
      return (
        <ol key={pIdx} className="space-y-3 my-3 pl-1">
          {lines.map((line, lIdx) => {
            const match = line.match(/^(\d+)\.\s+(.*)/);
            const num = match ? match[1] : lIdx + 1;
            const content = match ? match[2] : line;
            return (
              <li key={lIdx} className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed text-stone-800 animate-slide-up" style={{ animationDelay: `${lIdx * 0.05}s` }}>
                <span className="w-5 h-5 rounded-full bg-amber-100 text-[#a03612] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                  {num}
                </span>
                <span className="flex-1">{parseInlineFormatting(content)}</span>
              </li>
            );
          })}
        </ol>
      );
    }

    if (isBulleted) {
      return (
        <ul key={pIdx} className="space-y-2 my-2.5 pl-1">
          {lines.map((line, lIdx) => {
            const content = line.replace(/^[-*•]\s+/, '');
            return (
              <li key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-stone-800 animate-slide-up" style={{ animationDelay: `${lIdx * 0.05}s` }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#a03612] flex-shrink-0 mt-2"></span>
                <span className="flex-1">{parseInlineFormatting(content)}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    // Standard Paragraph
    return (
      <p key={pIdx} className="mb-3 last:mb-0 text-xs sm:text-sm leading-relaxed text-stone-800">
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {parseInlineFormatting(line)}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

/**
 * Parse inline **bold** syntax and (Section X) legal tags
 */
function parseInlineFormatting(str) {
  if (!str) return '';

  // Split by ** bold syntax
  const parts = str.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-stone-900">
          {inner}
        </strong>
      );
    }

    // Highlight (Section X) or (Sections X and Y) references
    const sectionRegex = /(\(Section[s]?\s+[0-9A-Z\s,()&a-z-]+\))/gi;
    const sectionParts = part.split(sectionRegex);

    return sectionParts.map((secPart, j) => {
      if (/^\(Section[s]?\s+[0-9A-Z\s,()&a-z-]+\)$/i.test(secPart)) {
        return (
          <span key={j} className="inline-flex items-center gap-1 font-semibold text-[#2d6a68] bg-teal-50/90 px-2 py-0.5 mx-0.5 rounded-md border border-teal-200/80 text-[11px] font-mono shadow-xs transform hover:scale-105 transition">
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

                  // Non-image document badge
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs backdrop-blur-sm shadow-xs"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-400 text-stone-950 font-bold text-[9px] flex items-center justify-center uppercase tracking-tight">
                        {att.name?.split('.').pop() || 'DOC'}
                      </div>
                      <div className="truncate max-w-[160px]">
                        <p className="font-semibold text-white truncate text-[11px]">{att.name}</p>
                        {att.size && <p className="text-[9px] text-white/70">{formatFileSize(att.size)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Message Text */}
          {isUser ? (
            message.text && (
              <div className="text-xs sm:text-sm leading-relaxed font-medium">
                {message.text}
              </div>
            )
          ) : (
            /* Bot Formatted Rich Text Response */
            <div className="space-y-1">
              {renderFormattedContent(message.text)}
              {/* Streaming caret */}
              {message.streaming && (
                <span className="inline-block w-2 h-4 bg-[#a03612] animate-pulse rounded-sm align-middle" aria-hidden="true" />
              )}
            </div>
          )}

          {/* Sources & Citations Section */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-stone-200/80 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#a03612] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#a03612]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{t('sourcesHeading')}</span>
              </div>
              <div className="space-y-2">
                {message.sources.map((src, i) => (
                  <CitationCard key={i} source={src} index={i} language={language} />
                ))}
              </div>
            </div>
          )}

          {/* Message actions: copy / feedback / regenerate / retry */}
          {!isUser && !isError && message.text && !message.streaming && (
            <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-stone-500">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 hover:text-[#a03612] transition font-semibold"
                title={t('copyAnswer')}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied ? t('copied') : t('copyAnswer')}
              </button>

              {isLastBot && onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message)}
                  className="inline-flex items-center gap-1 hover:text-[#a03612] transition font-semibold"
                  title={t('regenerate')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('regenerate')}
                </button>
              )}

              <span className="inline-flex items-center gap-2 ml-auto">
                {feedback ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    {t('thanksFeedback')}
                  </span>
                ) : (
                  <>
                    <span className="text-stone-400">{t('wasHelpful')}</span>
                    <button
                      type="button"
                      onClick={() => handleFeedback('up')}
                      className="p-1 rounded hover:bg-emerald-50 hover:text-emerald-700 transition"
                      title="👍"
                      aria-label="Helpful"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback('down')}
                      className="p-1 rounded hover:bg-rose-50 hover:text-rose-700 transition rotate-180"
                      title="👎"
                      aria-label="Not helpful"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                  </>
                )}
              </span>
            </div>
          )}

          {/* Error actions: retry */}
          {isError && onRetry && message.retryText && (
            <div className="mt-3 pt-2.5 border-t border-rose-200/70">
              <button
                type="button"
                onClick={() => onRetry(message)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-full text-[11px] font-bold transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('retry')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <ImageModal
          src={previewImage.data}
          name={previewImage.name}
          alt={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}
