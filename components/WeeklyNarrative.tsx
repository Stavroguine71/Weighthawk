'use client';

import { useEffect, useState } from 'react';

function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const STORAGE_KEY = 'weekly-narrative-cache-v1';

export function WeeklyNarrative() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const weekKey = isoWeekKey();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.week === weekKey) {
          setText(cached.text);
          setAvailable(true);
          return;
        }
      }
    } catch {}
    // Probe availability without spending tokens.
    fetch('/api/ai/parse-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
      .then((r) => setAvailable(r.status !== 503))
      .catch(() => setAvailable(false));
  }, [weekKey]);

  async function run() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/ai/weekly-summary', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'failed');
      setText(j.text);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ week: weekKey, text: j.text }));
      } catch {}
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  if (available === false) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Weekly recap</h3>
        {text && (
          <button className="text-xs text-muted hover:text-white" onClick={() => { setText(null); localStorage.removeItem(STORAGE_KEY); }}>
            Refresh
          </button>
        )}
      </div>
      {text ? (
        <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{text}</p>
      ) : (
        <>
          <p className="text-xs text-muted mb-3">An honest read of your last 7 days vs. the prior week. Uses your logged data only.</p>
          <button className="btn-ghost text-sm" disabled={busy} onClick={run}>
            {busy ? 'Writing...' : 'Generate this week'}
          </button>
          {err && <p className="text-xs text-danger mt-2">{err}</p>}
        </>
      )}
    </div>
  );
}
