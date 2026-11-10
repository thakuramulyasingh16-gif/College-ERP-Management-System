import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  Sparkles,
  AlertCircle,
  Bot,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const SUGGESTED_PROMPTS = [
  'How is my attendance?',
  'How am I doing in studies?',
  'Do I have pending fees?',
  'Pending assignments',
  'How do I file a complaint?',
];

const MAX_HISTORY_TURNS = 10;
const CHAT_TIMEOUT_MS = 40000;

/**
 * Tiny safe plain-text renderer supporting line breaks, bullet lines, and **bold**.
 * Never uses dangerouslySetInnerHTML and never turns URLs into executable links.
 */
function renderSafeLines(text) {
  const safeStr = typeof text === 'string' ? text : '';
  const lines = safeStr.split('\n');

  const renderInlineBold = (line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={`${lineIdx}-${idx}`}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={`${lineIdx}-${idx}`}>{part}</React.Fragment>;
    });
  };

  return lines.map((line, i) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
            marginTop: i === 0 ? 0 : '0.2rem',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--inst-gold)', fontWeight: 700 }}>•</span>
          <span>{renderInlineBold(bulletMatch[1], i)}</span>
        </div>
      );
    }

    return (
      <div
        key={i}
        style={{
          minHeight: trimmed === '' ? '0.5rem' : 'auto',
          marginTop: i === 0 ? 0 : '0.15rem',
        }}
      >
        {renderInlineBold(line, i)}
      </div>
    );
  });
}

const AssistantWidget = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleBtnRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevOpenRef = useRef(false);

  const isStudent = user?.role === 'student';

  // Check assistant availability for logged-in student
  useEffect(() => {
    if (!isStudent) return undefined;

    let cancelled = false;
    api
      .get('/assistant/status')
      .then((res) => {
        if (!cancelled) {
          setEnabled(Boolean(res.data?.enabled));
          setStatusChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
          setStatusChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isStudent, user?.id]);

  // Move focus into panel on open, and back to launcher button on close
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    } else if (!isOpen && prevOpenRef.current) {
      toggleBtnRef.current?.focus();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Escape closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, isOpen]);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText ?? input).trim();
      if (!text || sending) return;
      if (text.length > 500) {
        setErrorMsg('Please keep your message under 500 characters.');
        return;
      }

      setErrorMsg('');
      const historyToSend = messages
        .slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));

      const userTurn = { id: `u-${Date.now()}`, role: 'user', text };
      setMessages((prev) => [...prev, userTurn]);
      setInput('');
      setSending(true);

      try {
        const res = await api.post(
          '/assistant/chat',
          { message: text, history: historyToSend },
          { timeout: CHAT_TIMEOUT_MS }
        );

        const reply = res.data?.reply || 'I could not generate a response right now.';
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', text: reply },
        ]);
      } catch (err) {
        const status = err.response?.status;
        if (status === 429) {
          setErrorMsg(
            err.response?.data?.message ||
              'You have reached the message limit for now. Please try again later.'
          );
        } else if (status === 503) {
          setErrorMsg(
            err.response?.data?.message ||
              'The AI Study Assistant is currently unavailable. Please try again later.'
          );
        } else if (status === 400) {
          setErrorMsg(err.response?.data?.message || 'Please check your message and try again.');
        } else if (err.code === 'ECONNABORTED' || !err.response) {
          setErrorMsg(
            'Request timed out or network unavailable (the server may be waking up). Please try again.'
          );
        } else {
          setErrorMsg('Unable to reach the assistant right now. Please try again.');
        }
      } finally {
        setSending(false);
      }
    },
    [input, messages, sending]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg('');
    inputRef.current?.focus();
  };

  if (!isStudent || !statusChecked || !enabled) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Toggle Button (placed above System Clock in bottom-right) */}
      {!isOpen && (
        <button
          ref={toggleBtnRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Study Assistant"
          aria-expanded="false"
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1rem',
            zIndex: 55,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6875rem 1rem',
            borderRadius: 'var(--inst-radius)',
            background: 'var(--inst-ink)',
            color: '#FFFFFF',
            border: '1px solid var(--inst-ink-700)',
            boxShadow: 'var(--inst-shadow)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            transition: 'background 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--inst-ink-700)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--inst-ink)';
          }}
        >
          <Sparkles size={17} style={{ color: 'var(--inst-gold-tint)' }} />
          <span>Study Assistant</span>
        </button>
      )}

      {/* Chat Panel (Full-screen sheet on mobile, floating card on desktop) */}
      {isOpen && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="AI Study Assistant"
          className="fixed inset-0 sm:inset-auto sm:bottom-[5.5rem] sm:right-4 sm:w-[390px] sm:max-w-[calc(100vw-2rem)] sm:h-[540px] sm:max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden rounded-none sm:rounded-[var(--inst-radius-lg)]"
          style={{
            zIndex: 60,
            background: 'var(--inst-surface)',
            border: '1px solid var(--inst-border-strong)',
            boxShadow: 'var(--inst-shadow)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem',
              background: 'var(--inst-ink)',
              color: '#FFFFFF',
              borderBottom: '1px solid var(--inst-ink-700)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} color="#FFFFFF" />
              </div>
              <div>
                <div
                  role="heading"
                  aria-level={3}
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-display)',
                    color: '#FFFFFF',
                    lineHeight: 1.2,
                  }}
                >
                  AI Study Assistant
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.6875rem',
                    color: 'rgba(255,255,255,0.78)',
                    fontWeight: 500,
                  }}
                >
                  Read-only ERP &amp; progress helper
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <button
                type="button"
                onClick={handleClearChat}
                aria-label="Clear chat"
                title="Clear chat"
                disabled={messages.length === 0 && !errorMsg}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: messages.length === 0 && !errorMsg ? 'not-allowed' : 'pointer',
                  opacity: messages.length === 0 && !errorMsg ? 0.5 : 1,
                }}
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Study Assistant"
                title="Close (Esc)"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div
            style={{
              padding: '0.45rem 0.875rem',
              background: 'var(--inst-gold-tint)',
              borderBottom: '1px solid var(--inst-border)',
              color: 'var(--inst-text)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            AI can make mistakes. Check official records in the tabs.
          </div>

          {/* Message List */}
          <div
            className="custom-scrollbar"
            aria-live="polite"
            aria-relevant="additions"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.875rem',
              background: 'var(--inst-paper)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  background: 'var(--inst-surface)',
                  border: '1px solid var(--inst-border)',
                  borderRadius: 'var(--inst-radius)',
                  padding: '0.875rem',
                  fontSize: '0.8125rem',
                  color: 'var(--inst-text)',
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: '0 0 0.625rem 0', fontWeight: 600, color: 'var(--inst-ink)' }}>
                  Hi! Ask me about your attendance, marks, fees, assignments, or how to use any ERP tab.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={sending}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        padding: '0.375rem 0.625rem',
                        borderRadius: 'var(--inst-radius-sm)',
                        background: 'var(--inst-ink-tint)',
                        border: '1px solid var(--inst-border)',
                        color: 'var(--inst-ink)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: sending ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--inst-radius)',
                      background: isUser ? 'var(--inst-ink)' : 'var(--inst-surface)',
                      color: isUser ? '#FFFFFF' : 'var(--inst-text)',
                      border: isUser ? '1px solid var(--inst-ink)' : '1px solid var(--inst-border)',
                      boxShadow: 'var(--inst-shadow-sm)',
                      fontSize: '0.8125rem',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {isUser ? msg.text : renderSafeLines(msg.text)}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  role="status"
                  aria-label="Assistant is typing"
                  style={{
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--inst-radius)',
                    background: 'var(--inst-surface)',
                    border: '1px solid var(--inst-border)',
                    color: 'var(--inst-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <MessageSquare size={14} />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--inst-radius-sm)',
                  background: 'var(--inst-danger-tint)',
                  border: '1px solid rgba(156, 59, 50, 0.25)',
                  color: 'var(--inst-danger)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.45rem',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '0.75rem',
              background: 'var(--inst-surface)',
              borderTop: '1px solid var(--inst-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0,
            }}
          >
            <label htmlFor="assistant-chat-input" className="sr-only">
              Ask the AI Study Assistant
            </label>
            <input
              id="assistant-chat-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about attendance, marks, fees, ERP..."
              maxLength={500}
              disabled={sending}
              style={{
                flex: 1,
                padding: '0.625rem 0.75rem',
                borderRadius: 'var(--inst-radius-sm)',
                border: '1px solid var(--inst-border-strong)',
                background: 'var(--inst-paper)',
                color: 'var(--inst-text)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={sending || !input.trim()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--inst-radius-sm)',
                background: 'var(--inst-ink)',
                color: '#FFFFFF',
                border: '1px solid var(--inst-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !input.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
    </>
  );
};

export default AssistantWidget;
