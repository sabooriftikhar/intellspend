'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Trash2, Loader2, Bot, User, Sparkles,
  TrendingUp, Wallet, Receipt, HelpCircle,
} from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('access_token') ?? '';
}

// ── Markdown-lite renderer ────────────────────────────────────
function boldify(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderContent(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (!listItems.length) return;
    elements.push(
      <ul key={key} className="mt-1.5 space-y-0.5 list-none">
        {listItems.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-50" />
            <span dangerouslySetInnerHTML={{ __html: boldify(item) }} />
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('• ') || t.startsWith('- ') || t.startsWith('* ')) {
      listItems.push(t.slice(2));
    } else {
      flushList(`l${i}`);
      if (!t) {
        if (elements.length) elements.push(<div key={`s${i}`} className="h-1.5" />);
      } else if (/^#{1,3}\s+/.test(t)) {
        const heading = t.replace(/^#{1,3}\s+/, '');
        const headingClass = t.startsWith('###')
          ? 'text-[11px] font-semibold uppercase tracking-widest opacity-40 mt-3 mb-0.5'
          : t.startsWith('##')
            ? 'text-xs font-semibold uppercase tracking-wide opacity-65 mt-2.5 mb-0.5'
            : 'text-sm font-semibold mt-2 mb-0.5';
        elements.push(
          <p key={i} className={headingClass}>
            {heading}
          </p>
        );
      } else if (t.startsWith('═══')) {
        elements.push(
          <p key={i} className="text-[11px] font-semibold uppercase tracking-widest opacity-40 mt-3 mb-0.5">
            {t.replace(/═/g, '').trim()}
          </p>
        );
      } else {
        elements.push(
          <p key={i} dangerouslySetInnerHTML={{ __html: boldify(t) }} />
        );
      }
    }
  });
  flushList('end');
  return elements;
}

// ── Suggestion chips ──────────────────────────────────────────
const SUGGESTIONS = [
  { icon: TrendingUp, text: "What's my biggest expense this month?" },
  { icon: Wallet,     text: "What's my net worth right now?" },
  { icon: Receipt,    text: "Which bills are due soon?" },
  { icon: HelpCircle, text: "Can I afford my upcoming bills?" },
  { icon: TrendingUp, text: "How does this month compare to last?" },
  { icon: Sparkles,   text: "Give me 3 tips to reduce spending." },
];

// ── Message bubble ────────────────────────────────────────────
function Bubble({
  msg, streaming = false,
}: {
  msg: ChatMessage & { streamingContent?: string };
  streaming?: boolean;
}) {
  const isUser = msg.role === 'user';
  const content = streaming ? (msg.streamingContent ?? '') : msg.content;

  return (
    <div className={cn('flex items-end gap-2.5 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-accent-green/15 text-accent-green',
      )}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-card border border-border text-foreground rounded-bl-sm',
      )}>
        {isUser
          ? <p>{content}</p>
          : (
            <div className="space-y-0.5">
              {renderContent(content)}
              {streaming && (
                <span className="inline-block w-0.5 h-4 bg-accent-green animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )
        }
        {!streaming && (
          <p className={cn(
            'text-[10px] mt-1.5 select-none opacity-0 group-hover:opacity-60 transition-opacity',
            isUser ? 'text-right text-primary-foreground' : 'text-muted-foreground',
          )}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Typing dots (before first token arrives) ──────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-green/15">
        <Bot className="h-3.5 w-3.5 text-accent-green" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3.5 flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
const STREAM_ID = '__streaming__';

export default function ChatPage() {
  const [messages, setMessages] = useState<(ChatMessage & { streamingContent?: string })[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showDots, setShowDots] = useState(false);   // before first token
  const [error, setError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    fetch(`${API_BASE}/chat/history`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then((data: ChatMessage[]) => { setMessages(data); setHistoryLoaded(true); })
      .catch(() => setHistoryLoaded(true));
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDots]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    // Cancel any in-flight stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Add user bubble immediately
    const userBubble: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userBubble]);
    setInput('');
    setError('');
    setIsStreaming(true);
    setShowDots(true);

    // Placeholder streaming bubble
    const streamingBubble: ChatMessage & { streamingContent: string } = {
      id: STREAM_ID as unknown as number,
      role: 'assistant',
      content: '',
      streamingContent: '',
      created_at: new Date().toISOString(),
    };

    let fullReply = '';

    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Show streaming bubble once response starts
      setShowDots(false);
      setMessages(prev => [...prev, { ...streamingBubble }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';  // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          let raw = line.slice(5);
          if (raw.startsWith(' ')) raw = raw.slice(1);
          if (raw === '[DONE]') break;
          if (raw.startsWith('[ERROR]')) {
            throw new Error(raw.slice(7).trim());
          }
          // Restore newlines that were escaped for SSE wire format
          const token = raw.replace(/\\n/g, '\n');
          fullReply += token;

          // Update streaming bubble content live
          setMessages(prev =>
            prev.map(m =>
              (m.id as unknown as string) === STREAM_ID
                ? { ...m, streamingContent: fullReply }
                : m,
            ),
          );
        }
      }

      // Persist the exchange and replace streaming bubble with real history
      const saveRes = await fetch(`${API_BASE}/chat/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          user_message: trimmed,
          assistant_message: fullReply || '(no response)',
        }),
      });

      if (saveRes.ok) {
        const history: ChatMessage[] = await saveRes.json();
        setMessages(history);
      } else {
        // Keep the streaming bubble as a plain message
        setMessages(prev =>
          prev.map(m =>
            (m.id as unknown as string) === STREAM_ID
              ? { ...m, id: Date.now(), content: fullReply, streamingContent: undefined }
              : m,
          ),
        );
      }
    } catch (err: unknown) {
      setShowDots(false);
      // Remove streaming bubble if stream failed
      setMessages(prev =>
        prev.filter(m => (m.id as unknown as string) !== STREAM_ID),
      );
      if ((err as Error).name === 'AbortError') return;  // user cancelled
      const msg = err instanceof Error ? err.message : 'Stream failed';
      setError(
        msg.includes('OPENROUTER_API_KEY')
          ? 'OpenRouter API key not set. Add it to backend/.env and restart the server.'
          : msg,
      );
    } finally {
      setIsStreaming(false);
      setShowDots(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearHistory = async () => {
    if (!confirm('Clear all chat history?')) return;
    setClearing(true);
    try {
      await fetch(`${API_BASE}/chat/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setMessages([]);
    } finally { setClearing(false); }
  };

  const visibleMessages = messages.filter(
    m => (m.id as unknown as string) !== STREAM_ID || (m as any).streamingContent !== undefined,
  );
  const isEmpty = historyLoaded && visibleMessages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-green/15">
            <Sparkles className="h-5 w-5 text-accent-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">AI Finance Advisor</h1>
            <p className="text-xs text-muted-foreground">
              GPT-4o mini · live data · streams token-by-token
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} disabled={clearing}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors">
            {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Clear
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-background p-4 space-y-4 custom-scrollbar">
        {!historyLoaded ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-8 gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-green/10">
              <Sparkles className="h-8 w-8 text-accent-green" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Ask me anything about your finances</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                I have full access to your accounts, transactions, and bills — refreshed on every message.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button key={i} onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-all">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />{s.text}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {visibleMessages.map(msg => (
              <Bubble
                key={msg.id}
                msg={msg}
                streaming={(msg.id as unknown as string) === STREAM_ID}
              />
            ))}
            {showDots && <TypingDots />}

            {/* Quick suggestions below conversation */}
            {!isStreaming && (
              <div className="pt-1">
                <p className="text-[11px] text-muted-foreground mb-2 text-center">Try asking…</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {SUGGESTIONS.slice(0, 3).map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <button key={i} onClick={() => sendMessage(s.text)}
                        className="flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-all">
                        <Icon className="h-3 w-3" />{s.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div className="mt-2 shrink-0 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-3 shrink-0 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="mt-3 shrink-0">
        <div className={cn(
          'flex items-end gap-2 rounded-2xl border bg-card px-4 py-3 transition-all',
          isStreaming
            ? 'border-accent-green/30 ring-2 ring-accent-green/10'
            : 'border-border focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10',
        )}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Waiting for response…' : 'Ask about spending, balances, bills… (Enter to send)'}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-40 min-h-6 leading-6"
            style={{ height: '24px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all',
              !isStreaming && input.trim()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'bg-secondary text-muted-foreground cursor-not-allowed',
            )}
          >
            {isStreaming
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-1.5">
          Shift+Enter for new line · financial context refreshed on every message
        </p>
      </div>
    </div>
  );
}
