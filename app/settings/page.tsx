'use client';

import { useEffect, useState } from 'react';

type Settings = {
  dailyCalorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
  heightCm: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setS);
  }, []);

  function update<K extends keyof Settings>(k: K, v: Settings[K]) {
    if (!s) return;
    setS({ ...s, [k]: v });
  }

  async function save() {
    if (!s) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    setBusy(false);
    setMsg(res.ok ? 'Saved.' : 'Error saving.');
    setTimeout(() => setMsg(null), 1500);
  }

  if (!s) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="card">
        <h2 className="font-medium">Daily goals</h2>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label">Calories (kcal)</label>
            <input className="input" type="number" value={s.dailyCalorieGoal} onChange={(e) => update('dailyCalorieGoal', Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Protein (g)</label>
            <input className="input" type="number" value={s.proteinGoalG} onChange={(e) => update('proteinGoalG', Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Carbs (g)</label>
            <input className="input" type="number" value={s.carbsGoalG} onChange={(e) => update('carbsGoalG', Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Fat (g)</label>
            <input className="input" type="number" value={s.fatGoalG} onChange={(e) => update('fatGoalG', Number(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-medium">Body</h2>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="label">Height (cm)</label>
            <input className="input" type="number" value={s.heightCm ?? ''} onChange={(e) => update('heightCm', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Start weight (kg)</label>
            <input className="input" type="number" step="0.1" value={s.startWeightKg ?? ''} onChange={(e) => update('startWeightKg', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Goal weight (kg)</label>
            <input className="input" type="number" step="0.1" value={s.goalWeightKg ?? ''} onChange={(e) => update('goalWeightKg', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
