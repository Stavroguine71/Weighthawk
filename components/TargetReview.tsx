'use client';

import { useEffect, useState } from 'react';

type Proposal = {
  summary: string;
  keepSame: boolean;
  proposed: {
    weeklyRateKg: number;
    dailyCalorieGoal: number;
    proteinGoalG: number;
    carbsGoalG: number;
    fatGoalG: number;
  };
};

export function TargetReview({ onApplied }: { onApplied?: () => void }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    fetch('/api/ai/parse-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
      .then((r) => setAvailable(r.status !== 503))
      .catch(() => setAvailable(false));
  }, []);

  async function run() {
    setBusy(true); setErr(null); setApplied(false);
    try {
      const r = await fetch('/api/ai/review-targets', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'failed');
      setProposal(j);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  async function apply() {
    if (!proposal) return;
    setBusy(true);
    try {
      const r = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal.proposed),
      });
      if (!r.ok) throw new Error('failed to save');
      setApplied(true);
      if (onApplied) onApplied();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  if (available === false) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">AI target review</h2>
        <button className="btn-ghost text-xs" disabled={busy} onClick={run}>
          {busy ? 'Reviewing...' : 'Review last 90 days'}
        </button>
      </div>
      {!proposal && !err && (
        <p className="text-xs text-muted mt-2">
          Reads your last 90 days of weight + food, compares actual rate vs. target, and proposes adjusted goals.
        </p>
      )}
      {err && <p className="text-sm text-danger mt-2">{err}</p>}
      {proposal && (
        <div className="mt-3 rounded-lg bg-panel2 ring-1 ring-white/10 p-3 text-sm">
          <p className="leading-relaxed">{proposal.summary}</p>
          {!proposal.keepSame && (
            <>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <Stat label="Rate" value={`${proposal.proposed.weeklyRateKg.toFixed(2)} kg/wk`} />
                <Stat label="Kcal" value={String(proposal.proposed.dailyCalorieGoal)} />
                <Stat label="Protein" value={`${proposal.proposed.proteinGoalG} g`} />
                <Stat label="Carbs" value={`${proposal.proposed.carbsGoalG} g`} />
                <Stat label="Fat" value={`${proposal.proposed.fatGoalG} g`} />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary text-xs" disabled={busy || applied} onClick={apply}>
                  {applied ? 'Applied' : 'Apply proposal'}
                </button>
                <button className="btn-ghost text-xs" onClick={() => setProposal(null)}>Dismiss</button>
              </div>
            </>
          )}
          {proposal.keepSame && (
            <p className="text-xs text-muted mt-2">No change recommended.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
