import React, { useRef, useEffect, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble.jsx';
import ExampleChips   from './ExampleChips.jsx';
import ImageModal     from './ImageModal.jsx';
import { makeT, FOLLOW_UPS } from '../i18n.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

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
  onConnectExpert,
}) {
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewContent, setHasNewContent] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevLastMsgTextRef = useRef(messages[messages.length - 1]?.text || '');

  const t = makeT(language);

  // Toggle Speech-to-Text Microphone Listening
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('speechNotSupported'));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Auto-scroll only when user is near bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsNearBottom(nearBottom);
    if (nearBottom) {
      setHasNewContent(false);
    }
  }, []);

  useEffect(() => {
    const currentLength = messages.length;
    const lastMsgText = messages[messages.length - 1]?.text || '';

    if (isNearBottom) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setHasNewContent(false);
    } else {
      // Only set hasNewContent when user is scrolled up AND new messages or tokens arrive
      if (
        currentLength > prevMessagesLengthRef.current ||
        (lastMsgText !== prevLastMsgTextRef.current && lastMsgText.length > 0) ||
        loading
      ) {
        setHasNewContent(true);
      }
    }

    prevMessagesLengthRef.current = currentLength;
    prevLastMsgTextRef.current = lastMsgText;
  }, [messages, loading, isNearBottom]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 132) + 'px';
  }, [input]);

  // Read file as base64 data URL
  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process selected or dropped files
  const processFiles = async (fileList, isScreenshotHint = false) => {
    setFileError(null);
    const validFiles = [];

    for (const file of fileList) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`${file.name}: ${t('fileTooLarge')}`);
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const isImage = file.type.startsWith('image/') || isScreenshotHint;
        validFiles.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || (isImage ? `Screenshot_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png` : 'document'),
          type: file.type || (isImage ? 'image/png' : 'application/octet-stream'),
          size: file.size,
          data: dataUrl,
          isImage,
        });
      } catch (err) {
        console.warn('Error reading file:', err);
      }
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      textareaRef.current?.focus();
    }
  };

  const handleFileInputChange = (e, isScreenshot = false) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files), isScreenshot);
      e.target.value = '';
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Clipboard paste listener: handles screenshots pasted via Ctrl+V / Cmd+V
  useEffect(() => {
    function handlePaste(e) {
      if (!e.clipboardData || !e.clipboardData.items) return;

      const imageItems = Array.from(e.clipboardData.items).filter(
        item => item.type && item.type.startsWith('image/')
      );

      if (imageItems.length > 0) {
        e.preventDefault();
        const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
        processFiles(files, true);
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim() || attachments.length > 0) {
      onSend(input, attachments);
      setAttachments([]);
      setIsNearBottom(true);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || attachments.length > 0) {
        onSend(input, attachments);
        setAttachments([]);
        setIsNearBottom(true);
      }
    }
  }

  const lastMsg = messages[messages.length - 1];
  const isLastBotAnswer = lastMsg && lastMsg.role === 'bot' && !lastMsg.isError;
  const showFollowUps = !loading && isLastBotAnswer && !lastMsg.streaming;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-1 flex flex-col min-h-0 bg-[#faf8f5] relative"
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileInputChange(e, false)}
        accept=".pdf,.txt,.doc,.docx,.csv,.md,.json"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleFileInputChange(e, true)}
        accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
        multiple
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-[#1e4e4d]/85 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-amber-300 rounded-2xl m-3 text-white transition-all animate-fade-in">
          <div className="p-4 bg-amber-400/20 rounded-full mb-3 animate-bounce">
            <svg className="w-12 h-12 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">{t('dropzoneText')}</h3>
          <p className="text-xs text-white/80 mt-1">PDF, DOCX, TXT, PNG, JPG (up to 10MB)</p>
        </div>
      )}

      {/* ── Scrollable Messages Area ─────────────────────────── */}
      <main ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Welcome Screen */}
          {messages.length === 0 && (
            <div className="text-center py-10 px-4 space-y-4 max-w-xl mx-auto my-auto animate-fade-in">
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
                <ExampleChips questions={exampleQuestions} onSelect={(q) => onSend(q, [])} />
              )}
            </div>
          )}

          {/* Active Messages List */}
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id || i}
              message={msg}
              language={language}
              onRetry={onRetry}
              onRegenerate={onRegenerate}
              isLastBot={msg === lastMsg && isLastBotAnswer}
              onConnectExpert={onConnectExpert}
            />
          ))}

          {/* Loading Indicator */}
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

          {/* Follow-up suggestions */}
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
                    onClick={() => { onSend(q, []); setIsNearBottom(true); }}
                    className="px-3.5 py-2 bg-white hover:bg-amber-50 border border-stone-200/90 hover:border-amber-200 rounded-full text-xs font-semibold text-stone-700 hover:text-[#a03612] shadow-soft transition text-left"
                  >
                    {q}
                  </button>
                ))}

                {/* Talk to an Expert Pill Button */}
                <button
                  type="button"
                  onClick={() => onConnectExpert && onConnectExpert()}
                  className="px-3.5 py-2 bg-[#a03612]/10 hover:bg-[#a03612] hover:text-white border border-[#a03612]/40 rounded-full text-xs font-bold text-[#a03612] shadow-soft transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{t('talkToExpert')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Jump-to-latest pill: fixed to bottom-right, solid background + subtle shadow, hidden by default */}
      {!isNearBottom && hasNewContent && (
        <button
          type="button"
          onClick={() => {
            setIsNearBottom(true);
            setHasNewContent(false);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="absolute bottom-24 right-6 sm:right-8 z-20 px-4 py-2.5 bg-white text-[#a03612] border border-amber-200/90 shadow-lg rounded-full text-xs font-extrabold hover:bg-amber-50 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer animate-slide-up"
        >
          <svg className="w-3.5 h-3.5 text-[#a03612] animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span>{t('scrollToBottom')}</span>
        </button>
      )}

      {/* ── Bottom Pill Input Area with Attachments ────────────────── */}
      <div className="p-4 sm:p-6 flex-shrink-0 bg-[#faf8f5]">
        <div className="max-w-3xl mx-auto space-y-2">

          {/* File Error Notification */}
          {fileError && (
            <div className="flex items-center justify-between px-4 py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs animate-fade-in">
              <span>{fileError}</span>
              <button type="button" onClick={() => setFileError(null)} className="font-bold ml-2">×</button>
            </div>
          )}

          {/* Staged Attachments Preview Tray */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-stone-100/90 border border-stone-200 rounded-2xl animate-slide-up shadow-inner">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative flex items-center gap-2 p-1.5 bg-white border border-stone-200/90 rounded-xl shadow-xs hover:border-stone-400 transition"
                >
                  {att.isImage ? (
                    <div
                      onClick={() => setPreviewImage(att)}
                      className="cursor-pointer flex items-center gap-2"
                      title={t('previewImage')}
                    >
                      <img
                        src={att.data}
                        alt={att.name}
                        className="w-9 h-9 object-cover rounded-lg border border-stone-200"
                      />
                      <div className="truncate max-w-[120px] pr-1">
                        <p className="text-[11px] font-semibold text-stone-800 truncate">{att.name}</p>
                        <p className="text-[9px] text-stone-500">{formatBytes(att.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pr-1">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-[#a03612] font-bold text-[9px] flex items-center justify-center uppercase tracking-tight">
                        {att.name?.split('.').pop() || 'DOC'}
                      </div>
                      <div className="truncate max-w-[130px]">
                        <p className="text-[11px] font-semibold text-stone-800 truncate">{att.name}</p>
                        <p className="text-[9px] text-stone-500">{formatBytes(att.size)}</p>
                      </div>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-stone-200 hover:bg-rose-500 hover:text-white text-stone-600 transition text-xs font-bold"
                    title={t('removeAttachment')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Animated Listening Indicator Notification Banner */}
          {isListening && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-[#a03612] rounded-2xl text-xs font-bold shadow-soft animate-slide-up backdrop-blur-xs">
              <div className="flex items-center gap-3">
                {/* Animated Sound Wave Equalizer Bars */}
                <div className="flex items-center gap-1 h-5 px-1">
                  <span className="w-1 bg-[#a03612] rounded-full animate-audio-bar-1"></span>
                  <span className="w-1 bg-[#a03612] rounded-full animate-audio-bar-2"></span>
                  <span className="w-1 bg-[#a03612] rounded-full animate-audio-bar-3"></span>
                  <span className="w-1 bg-[#a03612] rounded-full animate-audio-bar-4"></span>
                  <span className="w-1 bg-[#a03612] rounded-full animate-audio-bar-5"></span>
                </div>
                <span className="font-bold text-stone-900 tracking-tight">{t('listening')}</span>
              </div>

              <button
                type="button"
                onClick={toggleListening}
                className="px-2.5 py-1 bg-[#a03612] text-white text-[11px] font-bold rounded-lg hover:bg-[#882c0e] transition shadow-xs flex items-center gap-1 active:scale-95"
              >
                <span>{t('stopListening')}</span>
                <span>×</span>
              </button>
            </div>
          )}

          {/* Main Input Form */}
          <form onSubmit={handleSubmit} className="relative flex items-end">
            
            {/* Left Attachment Action Buttons */}
            <div className="absolute left-3 bottom-3 flex items-center gap-1 z-10">
              {/* Paperclip Button for Documents */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t('attachFile')}
                className="p-2 text-stone-400 hover:text-[#1e4e4d] hover:bg-stone-100 rounded-full transition"
                aria-label={t('attachFile')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              {/* Camera / Image Button for Screenshots */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                title={t('attachScreenshot')}
                className="p-2 text-stone-400 hover:text-[#a03612] hover:bg-amber-50 rounded-full transition"
                aria-label={t('attachScreenshot')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachments.length > 0 ? (language === 'hi' ? 'संलग्न फ़ाइल के बारे में पूछें...' : language === 'mr' ? 'संलग्न फाइलबाबत विचारा...' : 'Ask question about attached file/screenshot...') : t('chatPlaceholder')}
              aria-label={t('chatPlaceholder')}
              className="w-full pl-24 pr-24 sm:pr-28 py-4 bg-white border border-stone-200 rounded-3xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#a03612] focus:border-transparent shadow-card transition duration-200 resize-none leading-relaxed"
            />

            {/* Right Side Action Buttons: Microphone (Before) + Send Button */}
            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 z-10">
              
              {/* Animated Voice Microphone Button (Positioned on the right right before Send) */}
              <div className="relative flex items-center justify-center">
                {isListening && (
                  <span className="absolute inset-0 rounded-full bg-[#a03612] animate-mic-ring"></span>
                )}
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? t('stopListening') : t('voiceInput')}
                  className={`relative p-2.5 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center ${
                    isListening
                      ? 'text-white bg-[#a03612] shadow-md scale-105'
                      : 'text-stone-400 hover:text-[#a03612] hover:bg-amber-50/80'
                  }`}
                  aria-label={t('voiceInput')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || (!input.trim() && attachments.length === 0)}
                aria-label={t('chatPlaceholder')}
                title={t('chatPlaceholder')}
                className="w-9 h-9 bg-gradient-to-tr from-[#d89780] to-[#b34420] hover:from-[#b34420] hover:to-[#882c0e] text-white rounded-full transition shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.5l7.5 7.5-7.5 7.5-7.5-7.5z" />
                </svg>
              </button>

            </div>

          </form>

          <p className="text-center text-[11px] text-stone-400 font-normal">
            {t('pasteScreenshotHint')} • {t('chatDisclaimer')}
          </p>

        </div>
      </div>

      {/* Lightbox Preview Modal for Staged Attachments */}
      {previewImage && (
        <ImageModal
          src={previewImage.data}
          name={previewImage.name}
          alt={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}

    </div>
  );
}
