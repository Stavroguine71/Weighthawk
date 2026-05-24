'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY = 'coach-history-v1';

export default function CoachPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
    fetch('/api/ai/parse-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
      .then((r) => setAvailable(r.status !== 503))
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setErr(null);
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'failed');
      setMessages([...next, { role: 'assistant', content: j.text }]);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  if (available === false) {
    return (
      <div className="card">
        <h2 className="font-medium">Coach</h2>
        <p className="text-sm text-muted mt-2">
          The coach uses the Anthropic API. Set <code>ANTHROPIC_API_KEY</code> in Railway to enable it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Coach</h2>
          {messages.length > 0 && (
            <button
              className="text-xs text-muted hover:text-white"
              onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }}
            >
              Clear chat
            </button>
          )}
        </div>
        <p className="text-xs text-muted mt-1">
          Anchored in your last 30 days of food + weight. Ask "why am I not losing weight", "what should I change for next week", etc.
        </p>
      </div>

      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="card text-sm text-muted">
            Try: <span className="text-white">"Why has my weight stalled?"</span> or <span className="text-white">"What should I aim for on the weekend?"</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`card ${m.role === 'user' ? 'bg-panel2/40' : ''}`}>
            <div className="text-[10px] uppercase tracking-wide text-muted mb-1">{m.role === 'user' ? 'You' : 'Coach'}</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {busy && <div className="card text-sm text-muted">Thinking...</div>}
        {err && <div className="card text-sm text-danger">{err}</div>}
        <div ref={endRef} />
      </div>

      <div className="card sticky bottom-3">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Ask the coach..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="btn-primary" disabled={busy || !input.trim()} onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
