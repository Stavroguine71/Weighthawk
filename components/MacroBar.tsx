'use client';

export function MacroBar({
  label,
  value,
  goal,
  color = 'bg-accent',
  unit = 'g',
}: {
  label: string;
  value: number;
  goal: number;
  color?: string;
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="text-muted">{label}</span>
        <span>
          <strong className={over ? 'text-warn' : ''}>{Math.round(value)}</strong>
          <span className="text-muted"> / {goal}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-panel2 overflow-hidden">
        <div
          className={`h-full ${over ? 'bg-warn' : color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
