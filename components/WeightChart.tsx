'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type Weighing = { id: string; date: string; weightKg: number; note: string | null };

function movingAvg(values: number[], window = 7): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    if (slice.length === 0) out.push(null);
    else out.push(+(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
  }
  return out;
}

export function WeightChart({ goalWeightKg, days = 90 }: { goalWeightKg?: number | null; days?: number }) {
  const [data, setData] = useState<Weighing[]>([]);
  const [range, setRange] = useState<number>(days);

  useEffect(() => {
    fetch(`/api/weighings?days=${range}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData([]));
  }, [range]);

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const values = sorted.map((d) => d.weightKg);
    const avg = movingAvg(values, 7);
    return sorted.map((d, i) => ({
      date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: d.weightKg,
      avg7: avg[i],
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-muted">No weighings yet. Log one to see your trend.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Weight trend</h3>
        <div className="flex gap-1">
          {[30, 90, 180, 365].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`text-xs px-2 py-1 rounded ${range === d ? 'bg-accent text-bg' : 'bg-panel2 text-muted hover:text-white'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="date" stroke="#8a94c1" fontSize={11} tickLine={false} />
            <YAxis stroke="#8a94c1" fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#121933', border: '1px solid #ffffff15', borderRadius: 8 }}
              labelStyle={{ color: '#8a94c1' }}
            />
            {goalWeightKg ? <ReferenceLine y={goalWeightKg} stroke="#4ade80" strokeDasharray="4 4" label={{ value: `goal ${goalWeightKg}kg`, fill: '#4ade80', fontSize: 11, position: 'right' }} /> : null}
            <Line type="monotone" dataKey="weight" stroke="#7c9cff" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="avg7" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="2 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted mt-2">Blue = daily • Amber dashed = 7-day average</p>
    </div>
  );
}
