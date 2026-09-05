// ---------------------------------------------
// SahakarMitra: Top-Level Application Component
// Supports Landing Page, Auth Flow, Legal Dashboard Overview,
// Multi-Chat Sessions, Settings, Knowledge Repository, and RAG AI.
// ---------------------------------------------

import React, { useState, useEffect, useRef } from 'react';
import LandingPage     from './components/LandingPage.jsx';
import AuthModal       from './components/AuthModal.jsx';
import DashboardHeader from './components/DashboardHeader.jsx';
import DashboardView   from './components/DashboardView.jsx';
import ChatWindow      from './components/ChatWindow.jsx';
import Sidebar         from './components/Sidebar.jsx';
import WelcomeModal    from './components/WelcomeModal.jsx';
import SettingsView    from './components/SettingsView.jsx';
import ExpertsView     from './components/ExpertsView.jsx';
import LibraryView     from './components/LibraryView.jsx';
import { makeT }       from './i18n.js';

const EXAMPLE_QUESTIONS = {
  en: [
    'How to register a society?',
    'Rules for annual general meetings',
    'Election procedures',
    'Member rights and duties',
  ],
  hi: [
    'सोसायटी पंजीकरण कैसे करें?',
    'वार्षिक सामान्य बैठक के नियम',
    'चुनाव प्रक्रियाएँ',
    'सदस्य के अधिकार और कर्तव्य',
  ],
  mr: [
    'संस्थेची नोंदणी कशी करावी?',
    'वार्षिक सर्वसाधारण सभेचे नियम',
    'निवडणूक प्रक्रिया',
    'सदस्यांचे हक्क आणि कर्तव्ये',
  ],
};

const WELCOME_SEEN_KEY = 'sahakar_welcome_seen';

// Stable ids for messages / chats (never use array index as a React key).
const newId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;


const makeChat = () => ({
  id: newId('chat'),
  title: 'New Legal Inquiry',
  messages: [],
  timestamp: Date.now(),
});

export default function App() {
  // Navigation & Auth State
  const initialIsLibrary = typeof window !== 'undefined' && window.location.pathname === '/library';
  const [currentView, setCurrentView] = useState(initialIsLibrary ? 'dashboard' : 'landing');
  const [activeTab,   setActiveTab]   = useState(initialIsLibrary ? 'library' : 'dashboard');
  const [authModal,   setAuthModal]   = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [settingsSubTab, setSettingsSubTab] = useState('profile');


  // Multi-Chat Sessions & Sidebar State
  const [chats, setChats]               = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed]     = useState(false);

  // Active Chat Dashboard Controls
  const [language, setLanguage] = useState('en');
  const [loading,  setLoading]  = useState(false);
  const [input,    setInput]    = useState('');

  // Backend health status: 'checking' | 'ok' | 'down'
  const [backendStatus, setBackendStatus] = useState('checking');

  // Stream abort ref
  const streamAbortRef = useRef(null);

  // Load stored User and Chat History on startup
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('sahakar_user');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));

      const savedChats = localStorage.getItem('sahakar_chats');
      if (savedChats) {
        const parsed = JSON.parse(savedChats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
          setActiveChatId(parsed[0].id);
          return;
        }
      }
    } catch {
      // Fallback
    }

    const defaultChat = makeChat();
    setChats([defaultChat]);
    setActiveChatId(defaultChat.id);
  }, []);

  // Save chats to localStorage whenever updated
  useEffect(() => {
    if (chats.length > 0) {
      try {
        localStorage.setItem('sahakar_chats', JSON.stringify(chats));
      } catch {
        // Ignore
      }
    }
  }, [chats]);

  // Health check: ping the backend
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    let cancelled = false;
    setBackendStatus('checking');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setBackendStatus('down');
        } else {
          setBackendStatus(data.status === 'degraded' ? 'degraded' : 'ok');
        }
      })
      .catch(() => { if (!cancelled) setBackendStatus('down'); })
      .finally(() => clearTimeout(timer));

    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [currentView, activeTab]);

  useEffect(() => () => streamAbortRef.current?.abort(), []);

  // Keep <html lang> in sync so screen readers switch pronunciation with the UI
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    if (updatedUser.preferredLang) {
      setLanguage(updatedUser.preferredLang);
    }
    try {
      localStorage.setItem('sahakar_user', JSON.stringify(updatedUser));
    } catch {
      // Ignore
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];

  const handleNewChat = () => {
    const newChat = makeChat();
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setActiveTab('chat');
  };

  const handleDeleteChat = (chatId) => {
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== chatId);
      if (filtered.length === 0) {
        const defaultChat = makeChat();
        setActiveChatId(defaultChat.id);
        return [defaultChat];
      }
      if (activeChatId === chatId) {
        setActiveChatId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('sahakar_user', JSON.stringify(user));
    } catch {
      // Ignore
    }
    setAuthModal(null);
    setCurrentView('dashboard');
    setActiveTab('chat');
    setShowWelcome(true);
  };

  const handleGuestLogin = () => {
    handleAuthSuccess({
      name: 'Guest',
      email: 'guest@sahakarmitra.local',
      societyName: 'Guest Session',
      role: 'Guest',
      token: 'guest-' + Date.now(),
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sahakar_user');
    } catch {
      // Ignore
    }
    setActiveTab('dashboard');
    setCurrentView('landing');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : prev === 'hi' ? 'mr' : 'en');
  };

  const handleStartChatting = () => {
    if (currentUser) {
      setCurrentView('dashboard');
      setActiveTab('chat');
    } else {
      setAuthModal('login');
    }
  };

  const closeWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, '1');
    } catch {
      // Ignore
    }
  };

  const updateChatMessages = (chatId, updater) => {
    setChats(prev => prev.map(c => (c.id === chatId ? { ...c, messages: updater(c.messages) } : c)));
  };

  async function sendMessage(text, attachments = []) {
    text = (text || '').trim();
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if ((!text && !hasAttachments) || loading || !activeChat) return;

    const currentChatId = activeChat.id;
    const t = makeT(language);

    const history = messages
      .filter((m) => !m.isError)
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    const userMsg = {
      id: newId('msg'),
      role: 'user',
      text,
      attachments: hasAttachments ? attachments.map(a => ({
        name: a.name,
        type: a.type,
        data: a.data,
        size: a.size,
        isImage: a.isImage,
      })) : [],
      ts: Date.now(),
    };

    const isFirstMessage = activeChat.messages.length === 0;
    updateChatMessages(currentChatId, (prevMsgs) => [...prevMsgs, userMsg]);
    if (isFirstMessage) {
      const titleCandidate = text || (hasAttachments ? (attachments[0].isImage ? 'Screenshot Inquiry' : attachments[0].name) : 'Legal Inquiry');
      setChats(prev => prev.map(c => (c.id === currentChatId
        ? { ...c, title: titleCandidate.slice(0, 30) + (titleCandidate.length > 30 ? '…' : '') }
        : c)));
    }

    setLoading(true);
    setInput('');
    setActiveTab('chat');

    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 90000);

    const botMsgId = newId('msg');
    let botMsgAdded = false;
    const ensureBotMsg = () => {
      if (botMsgAdded) return;
      botMsgAdded = true;
      updateChatMessages(currentChatId, (prevMsgs) => [
        ...prevMsgs,
        { id: botMsgId, role: 'bot', text: '', sources: [], ts: Date.now(), streaming: true },
      ]);
    };
    const appendToken = (tok) => {
      updateChatMessages(currentChatId, (prevMsgs) =>
        prevMsgs.map((m) => (m.id === botMsgId ? { ...m, text: m.text + tok } : m)));
    };

    try {
      const payloadAttachments = hasAttachments
        ? attachments.map(a => ({ name: a.name, type: a.type, data: a.data, size: a.size }))
        : [];

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language, history, attachments: payloadAttachments }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }


      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          let event;
          try {
            event = JSON.parse(trimmed.slice(5));
          } catch {
            continue;
          }

          if (event.type === 'token') {
            ensureBotMsg();
            appendToken(event.text);
          } else if (event.type === 'no_match') {
            ensureBotMsg();
            appendToken(t('noMatchMessage'));
          } else if (event.type === 'done') {
            ensureBotMsg();
            const sources = event.sources || [];
            updateChatMessages(currentChatId, (prevMsgs) =>
              prevMsgs.map((m) => (m.id === botMsgId ? { ...m, sources, streaming: false } : m)));
            streamDone = true;
          } else if (event.type === 'error') {
            throw new Error(event.error || 'Stream error');
          }
        }
      }

      ensureBotMsg();
      updateChatMessages(currentChatId, (prevMsgs) =>
        prevMsgs.map((m) => (m.id === botMsgId ? { ...m, streaming: false } : m)));

    } catch (err) {
      if (err.name === 'AbortError') {
        if (botMsgAdded) {
          updateChatMessages(currentChatId, (prevMsgs) =>
            prevMsgs.map((m) => (m.id === botMsgId ? { ...m, streaming: false } : m)));
        }
      } else {
        const errorMsg = {
          id: newId('msg'),
          role: 'bot',
          text: err.message || t('errGeneric'),
          sources: [],
          isError: true,
          retryText: text,
          retryAttachments: attachments,
          ts: Date.now(),
        };
        updateChatMessages(currentChatId, (prevMsgs) => [...prevMsgs, errorMsg]);
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  const handleRetry = (failedMsg) => {
    if (failedMsg?.retryText || failedMsg?.retryAttachments) {
      sendMessage(failedMsg.retryText || '', failedMsg.retryAttachments || []);
    }
  };

  const handleRegenerate = (botMsg) => {
    if (loading || !activeChat) return;
    const idx = activeChat.messages.findIndex((m) => m.id === botMsg.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (activeChat.messages[i].role === 'user') {
        sendMessage(activeChat.messages[i].text, activeChat.messages[i].attachments || []);
        return;
      }
    }
  };

  const t = makeT(language);
  const isDevanagari = language !== 'en';

  return (
    <div className={`min-h-screen bg-[#faf8f5] text-[#1c1917] flex flex-col font-sans ${isDevanagari ? 'lang-dev' : ''}`}>

      {/* Skip link, first focusable element on the page */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[#a03612] focus:border focus:border-[#a03612] focus:px-4 focus:py-2 focus:rounded-xl focus:text-xs focus:font-bold focus:shadow-md"
      >
        Skip to content
      </a>

      {/* VIEW 1: LANDING PAGE */}
      {currentView === 'landing' && (
        <LandingPage
          onOpenAuth={(mode) => setAuthModal(mode)}
          onStartChatting={handleStartChatting}
          onToggleLanguage={toggleLanguage}
          language={language}
        />
      )}

      {/* VIEW 2: AI COOPERATIVE DASHBOARD WORKSPACE */}
      {currentView === 'dashboard' && (
        <div className="h-[100dvh] flex flex-col bg-[#faf8f5] overflow-hidden">

          {/* Header */}
          <DashboardHeader
            language={language}
            setLanguage={setLanguage}
            user={currentUser}
            onLogout={handleLogout}
            onGoHome={() => setCurrentView('landing')}
            onOpenSettings={() => setActiveTab('settings')}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onNewChat={handleNewChat}
            backendStatus={backendStatus}
          />

          {/* Main Dashboard Layout */}
          <div className="flex-1 flex overflow-hidden relative">

            {/* Legal Sidebar */}
            <Sidebar
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={(id) => { setActiveChatId(id); setActiveTab('chat'); }}
              onNewChat={handleNewChat}
              onDeleteChat={handleDeleteChat}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              currentUser={currentUser}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              language={language}
              onLogout={handleLogout}
              onOpenHelp={() => setShowWelcome(true)}
              onOpenSettingsTab={(subTab) => { setSettingsSubTab(subTab || 'profile'); setActiveTab('settings'); }}
            />


            {/* Main Workspace Area */}
            <div id="main-content" className="flex-1 flex flex-col min-w-0 bg-[#faf8f5]">

              {activeTab === 'dashboard' ? (
                <DashboardView
                  user={currentUser}
                  chats={chats}
                  onSelectChat={(id) => { setActiveChatId(id); setActiveTab('chat'); }}
                  onNewChat={handleNewChat}
                  onOpenWelcome={() => setShowWelcome(true)}
                  language={language}
                />
              ) : activeTab === 'settings' ? (
                <SettingsView
                  user={currentUser}
                  onUpdateUser={handleUpdateUser}
                  language={language}
                  initialSubTab={settingsSubTab}
                />

              ) : activeTab === 'experts' ? (
                <ExpertsView
                  language={language}
                />
              ) : activeTab === 'library' ? (
                <LibraryView
                  language={language}
                  initialCategory="all"
                  initialShowBookmarksOnly={false}
                />
              ) : activeTab === 'bookmarks' ? (
                <LibraryView
                  language={language}
                  initialCategory="all"
                  initialShowBookmarksOnly={true}
                />
              ) : (

                <ChatWindow
                  messages={messages}
                  loading={loading}
                  onSend={sendMessage}
                  onRetry={handleRetry}
                  onRegenerate={handleRegenerate}
                  input={input}
                  setInput={setInput}
                  exampleQuestions={EXAMPLE_QUESTIONS[language]}
                  showExamples={messages.length === 0}
                  language={language}
                  onConnectExpert={() => setActiveTab('experts')}
                />
              )}
            </div>

          </div>

        </div>
      )}

      {/* FULLPAGE AUTH VIEWS */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
          onGuest={handleGuestLogin}
          language={language}
        />
      )}

      {/* WELCOME FEATURE MODAL */}
      {showWelcome && (
        <WelcomeModal
          onClose={closeWelcome}
          onStartChat={() => { setActiveTab('chat'); handleNewChat(); }}
          language={language}
        />
      )}

    </div>
  );
}
