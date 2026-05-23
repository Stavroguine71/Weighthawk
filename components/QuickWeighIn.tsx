'use client';

import { useState } from 'react';
import { todayISO } from '@/lib/date';

export function QuickWeighIn({ onSaved }: { onSaved?: () => void }) {
  const [weight, setWeight] = useState<string>('');
  const [date, setDate] = useState<string>(todayISO());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (!weight) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/weighings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weightKg: Number(weight), date }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg('Saved.');
      setWeight('');
      onSaved?.();
      setTimeout(() => setMsg(null), 1500);
    } else {
      setMsg('Could not save.');
    }
  }

  return (
    <div className="card">
      <h3 className="font-medium mb-3">Log a weigh-in</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="label">Weight (kg)</label>
          <input
            className="input"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            placeholder="e.g. 72.3"
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <button className="btn-primary mt-3 w-full" disabled={!weight || busy} onClick={save}>
        {busy ? 'Saving…' : 'Save weighing'}
      </button>
      {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
    </div>
  );
}
