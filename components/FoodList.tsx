'use client';

type FoodLog = {
  id: string;
  date: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number | null;
  servings: number;
  mealType: string | null;
};

export function FoodList({
  rows,
  onDelete,
  onSaveAsFavorite,
}: {
  rows: FoodLog[];
  onDelete: (id: string) => void;
  onSaveAsFavorite?: (row: FoodLog) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Nothing logged yet.</p>;
  }
  return (
    <ul className="divide-y divide-white/5">
      {rows.map((r) => (
        <li key={r.id} className="py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm truncate">{r.description}</div>
            <div className="text-xs text-muted">
              {Math.round(r.calories)} kcal · P {r.proteinG.toFixed(0)} · C {r.carbsG.toFixed(0)} · F {r.fatG.toFixed(0)}
              {r.servingG ? ` · ${r.servingG}g` : ''}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onSaveAsFavorite && (
              <button
                className="text-xs text-muted hover:text-accent2 px-2"
                title="Save as favorite"
                onClick={() => onSaveAsFavorite(r)}
              >
                ★
              </button>
            )}
            <button
              className="text-xs text-muted hover:text-danger px-2"
              onClick={() => onDelete(r.id)}
              title="Delete"
            >
              ✕
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
