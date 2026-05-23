'use client';

import { useCallback, useEffect, useState } from 'react';
import { QuickWeighIn } from '@/components/QuickWeighIn';
import { FoodSearch, PendingFood } from '@/components/FoodSearch';
import { FoodList } from '@/components/FoodList';
import { MacroBar } from '@/components/MacroBar';
import { WeightChart } from '@/components/WeightChart';
import { todayISO } from '@/lib/date';

type Settings = {
  dailyCalorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
  goalWeightKg: number | null;
};

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

type Weighing = { id: string; date: string; weightKg: number };
type Favorite = {
  id: string;
  name: string;
  fdcId: number | null;
  servingG: number | null;
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export default function HomePage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [today, setToday] = useState<FoodLog[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const date = todayISO();

  const load = useCallback(async () => {
    const [s, f, w, fav] = await Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch(`/api/foods?date=${date}`).then((r) => r.json()),
      fetch('/api/weighings?days=14').then((r) => r.json()),
      fetch('/api/favorites').then((r) => r.json()),
    ]);
    setSettings(s);
    setToday(Array.isArray(f) ? f : []);
    setWeighings(Array.isArray(w) ? w : []);
    setFavorites(Array.isArray(fav) ? fav : []);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addFood(food: PendingFood) {
    await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...food, date }),
    });
    load();
  }

  async function deleteFood(id: string) {
    await fetch(`/api/foods/${id}`, { method: 'DELETE' });
    load();
  }

  async function saveAsFavorite(row: FoodLog) {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: row.description,
        calories: row.calories,
        proteinG: row.proteinG,
        carbsG: row.carbsG,
        fatG: row.fatG,
        servingG: row.servingG,
      }),
    });
    load();
  }

  async function addFavoriteToToday(fav: Favorite) {
    await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: fav.name,
        fdcId: fav.fdcId,
        servingG: fav.servingG,
        servings: 1,
        calories: fav.calories,
        proteinG: fav.proteinG,
        carbsG: fav.carbsG,
        fatG: fav.fatG,
        date,
      }),
    });
    load();
  }

  const totals = today.reduce(
    (acc, r) => {
      acc.cal += r.calories;
      acc.p += r.proteinG;
      acc.c += r.carbsG;
      acc.f += r.fatG;
      return acc;
    },
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  const latestWeight = weighings.length ? weighings[weighings.length - 1].weightKg : null;
  const prevWeight = weighings.length > 1 ? weighings[weighings.length - 2].weightKg : null;
  const weightDelta = latestWeight !== null && prevWeight !== null ? latestWeight - prevWeight : null;
  const remaining = settings ? settings.dailyCalorieGoal - totals.cal : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Today</h2>
            <span className="text-xs text-muted">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 items-end">
            <div>
              <div className="text-xs text-muted">Calories</div>
              <div className="text-3xl font-semibold">{Math.round(totals.cal)}</div>
              <div className="text-xs text-muted">
                of {settings?.dailyCalorieGoal ?? '—'}
              </div>
            </div>
            <div className="col-span-2">
              <MacroBar label="Calories" value={totals.cal} goal={settings?.dailyCalorieGoal ?? 0} unit=" kcal" />
              <div className="mt-3 grid grid-cols-3 gap-3">
                <MacroBar label="Protein" value={totals.p} goal={settings?.proteinGoalG ?? 0} color="bg-accent2" />
                <MacroBar label="Carbs" value={totals.c} goal={settings?.carbsGoalG ?? 0} color="bg-accent" />
                <MacroBar label="Fat" value={totals.f} goal={settings?.fatGoalG ?? 0} color="bg-warn" />
              </div>
              <div className="text-xs text-muted mt-2">
                {remaining >= 0
                  ? `${Math.round(remaining)} kcal left today`
                  : `${Math.round(Math.abs(remaining))} kcal over goal`}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-medium">Latest weight</h2>
          {latestWeight ? (
            <>
              <div className="text-3xl font-semibold mt-2">{latestWeight.toFixed(1)} <span className="text-base text-muted">kg</span></div>
              {weightDelta !== null && (
                <div className={`text-xs mt-1 ${weightDelta < 0 ? 'text-accent2' : weightDelta > 0 ? 'text-warn' : 'text-muted'}`}>
                  {weightDelta > 0 ? '▲' : weightDelta < 0 ? '▼' : '•'} {Math.abs(weightDelta).toFixed(1)} kg vs previous
                </div>
              )}
              {settings?.goalWeightKg && (
                <div className="text-xs text-muted mt-1">
                  Goal: {settings.goalWeightKg} kg ({(latestWeight - settings.goalWeightKg).toFixed(1)} to go)
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted mt-2">No weighings yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FoodSearch onAdd={addFood} />
        <QuickWeighIn onSaved={load} />
      </div>

      {favorites.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Quick-add favorites</h3>
            <a href="/favorites" className="text-xs text-muted hover:text-white">Manage →</a>
          </div>
          <div className="flex flex-wrap gap-2">
            {favorites.slice(0, 12).map((f) => (
              <button
                key={f.id}
                className="chip hover:bg-panel hover:ring-accent/40"
                onClick={() => addFavoriteToToday(f)}
                title={`${Math.round(f.calories)} kcal`}
              >
                <span>{f.name}</span>
                <span className="text-muted">· {Math.round(f.calories)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-medium mb-2">Today's foods</h3>
        <FoodList rows={today} onDelete={deleteFood} onSaveAsFavorite={saveAsFavorite} />
      </div>

      <WeightChart goalWeightKg={settings?.goalWeightKg} days={90} />
    </div>
  );
}
