'use client';

import { useCallback, useEffect, useState } from 'react';
import { FoodSearch, PendingFood } from '@/components/FoodSearch';

type Favorite = {
  id: string;
  name: string;
  source: string | null;
  fdcId: number | null;
  offCode: string | null;
  servingG: number | null;
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export default function FavoritesPage() {
  const [rows, setRows] = useState<Favorite[]>([]);

  const load = useCallback(async () => {
    const r = await fetch('/api/favorites').then((r) => r.json());
    setRows(Array.isArray(r) ? r : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(food: PendingFood) {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: food.description,
        source: food.source,
        fdcId: food.fdcId,
        offCode: food.offCode,
        servingG: food.servingG,
        servings: food.servings,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
      }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-medium">Favorites</h2>
        <p className="text-sm text-muted mt-1">
          Save foods you eat often so you can one-tap log them from the dashboard.
        </p>
      </div>

      <FoodSearch onAdd={add} placeholder="Search a food to save as favorite..." />

      <div className="card">
        <h3 className="font-medium mb-2">Your favorites</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Nothing saved yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((f) => (
              <li key={f.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm truncate">{f.name}</div>
                  <div className="text-xs text-muted">
                    {Math.round(f.calories)} kcal - P {f.proteinG.toFixed(0)} - C {f.carbsG.toFixed(0)} - F {f.fatG.toFixed(0)}
                    {f.servingG ? ` - ${f.servingG}g` : ''}
                  </div>
                </div>
                <button className="text-xs text-muted hover:text-danger px-2" onClick={() => remove(f.id)}>x</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
