import React, { useRef, useEffect, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble.jsx';
import ExampleChips   from './ExampleChips.jsx';
import { makeT, FOLLOW_UPS } from '../i18n.js';

export default function ChatWindow({
  messages,
  loading,
  onSend,
  onRetry,
  onRegenerate,
  input,
  setInput,
  exampleQuestions,
  showExamples,
  language = 'en',
}) {
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const t = makeT(language);

  // Auto-scroll only when the user is already reading the bottom of the
  // conversation — never yank them back if they scrolled up to re-read
  // a citation while the answer streams in.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading, isNearBottom]);

  // Auto-grow the textarea up to ~5 rows as the user types.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 132) + 'px';
  }, [input]);

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setIsNearBottom(true);
    }
  }

  // Enter sends, Shift+Enter inserts a newline.
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input);
        setIsNearBottom(true);
      }
    }
  }

  const lastMsg = messages[messages.length - 1];
  const isLastBotAnswer = lastMsg && lastMsg.role === 'bot' && !lastMsg.isError;
  const showFollowUps = !loading && isLastBotAnswer && !lastMsg.streaming;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#faf8f5] relative">

      {/* ── Scrollable Messages Area ─────────────────────────── */}
      <main ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Welcome Screen */}
          {messages.length === 0 && (
            <div className="text-center py-12 px-4 space-y-4 max-w-xl mx-auto my-auto animate-fade-in">
              <img
                src="/logo.jpg"
                alt="SahakarMitra Logo"
                className="w-20 h-20 rounded-3xl shadow-xl border-2 border-amber-200/80 object-cover mx-auto animate-float"
              />

              <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                {t('chatWelcomeTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 font-normal leading-relaxed">
                {t('chatWelcomeSubtitle')}
              </p>

              {/* 4 Quick Example Chips (2x2 Grid) */}
              {showExamples && (
                <ExampleChips questions={exampleQuestions} onSelect={onSend} />
              )}
            </div>
          )}

          {/* Active Messages List — stable per-message ids as keys */}
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id || i}
              message={msg}
              language={language}
              onRetry={onRetry}
              onRegenerate={onRegenerate}
              isLastBot={msg === lastMsg && isLastBotAnswer}
            />
          ))}

          {/* Loading Indicator (shown until the first streamed token arrives) */}
          {loading && !messages.some((m) => m.streaming) && (
            <div className="flex items-center gap-3 text-stone-600 bg-white border border-stone-200/90 p-4 rounded-2xl w-fit text-xs shadow-soft animate-pulse-glow">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[#a03612] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#a03612] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-[#a03612] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="font-medium text-stone-700">{t('chatLoading')}</span>
            </div>
          )}

          {/* Follow-up suggestions under the latest answer */}
          {showFollowUps && (
            <div className="space-y-2 animate-fade-in">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {t('followUpsHeading')}
              </p>
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UPS[language]?.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => { onSend(q); setIsNearBottom(true); }}
                    className="px-3.5 py-2 bg-white hover:bg-amber-50 border border-stone-200/90 hover:border-amber-200 rounded-full text-xs font-semibold text-stone-700 hover:text-[#a03612] shadow-soft transition text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Jump-to-latest pill when the user scrolled up during a stream */}
      {!isNearBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsNearBottom(true);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-white border border-stone-200 shadow-card rounded-full text-xs font-bold text-[#a03612] hover:bg-amber-50 transition animate-fade-in"
        >
          ↓ {t('scrollToBottom')}
        </button>
      )}

      {/* ── Bottom Pill Input Area ───────────────────────────── */}
      <div className="p-4 sm:p-6 flex-shrink-0 bg-[#faf8f5]">
        <div className="max-w-3xl mx-auto space-y-2">

          <form onSubmit={handleSubmit} className="relative flex items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chatPlaceholder')}
              aria-label={t('chatPlaceholder')}
              className="w-full pl-6 pr-16 py-4 bg-white border border-stone-200 rounded-3xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a03612] focus:border-transparent shadow-card transition duration-200 resize-none leading-relaxed"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={t('chatPlaceholder')}
              title={t('chatPlaceholder')}
              className="absolute right-2 bottom-2 p-2.5 bg-[#a03612] hover:bg-[#882c0e] text-white rounded-full transition shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9-7-9-7-9 7 9 7z" />
              </svg>
            </button>
          </form>

          <p className="text-center text-[11px] text-stone-400 font-normal">
            {t('chatDisclaimer')}
          </p>

        </div>
      </div>

    </div>
  );
}
