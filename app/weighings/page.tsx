'use client';

import { useCallback, useEffect, useState } from 'react';
import { QuickWeighIn } from '@/components/QuickWeighIn';
import { WeightChart } from '@/components/WeightChart';

type Weighing = { id: string; date: string; weightKg: number; note: string | null };
type Settings = { goalWeightKg: number | null; startWeightKg: number | null };

export default function WeighingsPage() {
  const [rows, setRows] = useState<Weighing[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const load = useCallback(async () => {
    const [w, s] = await Promise.all([
      fetch('/api/weighings?days=365').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]);
    setRows(Array.isArray(w) ? w : []);
    setSettings(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    await fetch(`/api/weighings/${id}`, { method: 'DELETE' });
    load();
  }

  const sorted = [...rows].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const latest = sorted[0]?.weightKg;
  const first = sorted[sorted.length - 1]?.weightKg;
  const change = latest !== undefined && first !== undefined ? latest - first : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <WeightChart goalWeightKg={settings?.goalWeightKg ?? null} days={180} />
        </div>
        <QuickWeighIn onSaved={load} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Latest" value={latest !== undefined ? `${latest.toFixed(1)} kg` : '—'} />
        <Stat label="Entries" value={String(rows.length)} />
        <Stat
          label="Change (period)"
          value={change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(1)} kg` : '—'}
          tone={change !== null ? (change < 0 ? 'good' : change > 0 ? 'warn' : 'muted') : 'muted'}
        />
        <Stat
          label="Goal"
          value={settings?.goalWeightKg ? `${settings.goalWeightKg} kg` : '—'}
        />
      </div>

      <div className="card">
        <h3 className="font-medium mb-2">History</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No weighings yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {sorted.map((w) => (
              <li key={w.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm">{w.weightKg.toFixed(1)} kg</div>
                  <div className="text-xs text-muted">
                    {new Date(w.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    {w.note ? ` · ${w.note}` : ''}
                  </div>
                </div>
                <button className="text-xs text-muted hover:text-danger px-2" onClick={() => remove(w.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'muted' | 'good' | 'warn' }) {
  const c = tone === 'good' ? 'text-accent2' : tone === 'warn' ? 'text-warn' : 'text-white';
  return (
    <div className="card">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${c}`}>{value}</div>
    </div>
  );
}
