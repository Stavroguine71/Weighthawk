'use client';

import { useEffect, useMemo, useState } from 'react';
import { ACTIVITY_LABEL, computeIntel, type ActivityLevel, type Sex } from '@/lib/nutrition-intel';

type Settings = {
  dailyCalorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
  heightCm: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
  birthYear: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  targetDate: string | null;
  weeklyRateKg: number | null;
};

function toDateInput(d: string | null): string {
  if (!d) return '';
  return d.slice(0, 10);
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/weighings?days=180').then((r) => r.json()).catch(() => []),
    ]).then(([settings, ws]) => {
      setS(settings);
      if (Array.isArray(ws) && ws.length) {
        setLatestWeight(ws[ws.length - 1].weightKg);
      }
    });
  }, []);

  function update<K extends keyof Settings>(k: K, v: Settings[K]) {
    if (!s) return;
    setS({ ...s, [k]: v });
  }

  const intel = useMemo(() => {
    if (!s) return null;
    return computeIntel({
      weightKg: latestWeight ?? s.startWeightKg ?? null,
      heightCm: s.heightCm,
      birthYear: s.birthYear,
      sex: s.sex,
      activity: s.activityLevel,
      weeklyRateKg: s.weeklyRateKg,
    });
  }, [s, latestWeight]);

  // Auto-suggest weekly rate from goal weight + target date.
  function suggestWeeklyRate() {
    if (!s) return;
    if (!s.goalWeightKg || !s.targetDate) return;
    const current = latestWeight ?? s.startWeightKg;
    if (!current) return;
    const target = new Date(s.targetDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const weeks = (target.getTime() - today.getTime()) / (7 * 86400000);
    if (weeks <= 0) return;
    const delta = s.goalWeightKg - current; // negative = need to lose
    const rate = +(delta / weeks).toFixed(2);
    setS({ ...s, weeklyRateKg: rate });
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

  function applySuggestion() {
    if (!s || !intel || !intel.ok) return;
    setS({
      ...s,
      dailyCalorieGoal: intel.suggestedKcal,
      proteinGoalG: intel.suggestedMacros.proteinG,
      carbsGoalG: intel.suggestedMacros.carbsG,
      fatGoalG: intel.suggestedMacros.fatG,
    });
  }

  if (!s) return <p className="text-sm text-muted">Loading...</p>;

  const currentYear = new Date().getUTCFullYear();
  const current = latestWeight ?? s.startWeightKg;
  const targetWeeks =
    s.targetDate && current
      ? Math.max(0, (new Date(s.targetDate).getTime() - Date.now()) / (7 * 86400000))
      : null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card">
        <h2 className="font-medium">Targets</h2>
        <p className="text-xs text-muted mt-1">What you're aiming for. Drives the dashboard ETA and trend alerts.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="label">Goal weight (kg)</label>
            <input className="input" type="number" step="0.1" value={s.goalWeightKg ?? ''} onChange={(e) => update('goalWeightKg', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Target date</label>
            <input
              className="input"
              type="date"
              value={toDateInput(s.targetDate)}
              onChange={(e) => update('targetDate', e.target.value || null)}
            />
          </div>
          <div>
            <label className="label">Weekly rate (kg/wk)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={s.weeklyRateKg ?? ''}
              onChange={(e) => update('weeklyRateKg', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="-0.5 lose / +0.25 gain"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <button
            type="button"
            className="btn-ghost text-xs py-1"
            onClick={suggestWeeklyRate}
            disabled={!s.goalWeightKg || !s.targetDate || !current}
          >
            Suggest rate from goal + date
          </button>
          {current && s.goalWeightKg && targetWeeks !== null && targetWeeks > 0 && (
            <span>
              {(s.goalWeightKg - current).toFixed(1)} kg over {targetWeeks.toFixed(1)} weeks
              = {((s.goalWeightKg - current) / targetWeeks).toFixed(2)} kg/wk
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-medium">Body and activity</h2>
        <p className="text-xs text-muted mt-1">Used to compute BMR / TDEE and suggest a calorie goal.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="label">Height (cm)</label>
            <input className="input" type="number" value={s.heightCm ?? ''} onChange={(e) => update('heightCm', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Birth year</label>
            <input
              className="input"
              type="number"
              min={1900}
              max={currentYear}
              value={s.birthYear ?? ''}
              onChange={(e) => update('birthYear', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g. 1990"
            />
          </div>
          <div>
            <label className="label">Sex</label>
            <select
              className="input"
              value={s.sex ?? ''}
              onChange={(e) => update('sex', (e.target.value || null) as Sex | null)}
            >
              <option value="">--</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="label">Start weight (kg)</label>
            <input className="input" type="number" step="0.1" value={s.startWeightKg ?? ''} onChange={(e) => update('startWeightKg', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Activity level</label>
            <select
              className="input"
              value={s.activityLevel ?? ''}
              onChange={(e) => update('activityLevel', (e.target.value || null) as ActivityLevel | null)}
            >
              <option value="">--</option>
              {(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>{ACTIVITY_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-medium">Daily goals</h2>
        <p className="text-xs text-muted mt-1">Edit directly or use the auto-suggest below.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
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
        <div className="mt-4 rounded-lg bg-panel2 ring-1 ring-white/10 p-3">
          {intel?.ok ? (
            <>
              <div className="text-sm">
                BMR <span className="text-white font-medium">{intel.bmr}</span> kcal -
                TDEE <span className="text-white font-medium">{intel.tdee}</span> kcal/day
              </div>
              <div className="text-sm mt-1">
                Suggested goal: <span className="text-accent font-medium">{intel.suggestedKcal} kcal</span> -
                P {intel.suggestedMacros.proteinG} g - C {intel.suggestedMacros.carbsG} g - F {intel.suggestedMacros.fatG} g
              </div>
              <button className="btn-ghost mt-3" onClick={applySuggestion} type="button">
                Apply to daily goals
              </button>
            </>
          ) : (
            <div className="text-xs text-muted">
              To auto-suggest a calorie goal, fill in: {intel?.missing.join(', ')}.
              {!latestWeight && !s.startWeightKg && ' (Add a weighing or set a start weight.)'}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save settings'}</button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
