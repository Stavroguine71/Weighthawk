'use client';

import { useCallback, useEffect, useState } from 'react';
import { FoodSearch, PendingFood } from '@/components/FoodSearch';
import { FoodList } from '@/components/FoodList';
import { MacroBar } from '@/components/MacroBar';
import { todayISO } from '@/lib/date';

type FoodLog = {
  id: string;
  date: string;
  description: string;
  source: string | null;
  fdcId: number | null;
  offCode: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number | null;
  servings: number;
  mealType: string | null;
};

type Settings = {
  dailyCalorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
};

export default function FoodLogPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<FoodLog[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      fetch(`/api/foods?date=${date}`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]);
    setRows(Array.isArray(r) ? r : []);
    setSettings(s);
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
        source: row.source,
        fdcId: row.fdcId,
        offCode: row.offCode,
        calories: row.calories,
        proteinG: row.proteinG,
        carbsG: row.carbsG,
        fatG: row.fatG,
        servingG: row.servingG,
      }),
    });
  }

  const totals = rows.reduce(
    (a, r) => {
      a.cal += r.calories;
      a.p += r.proteinG;
      a.c += r.carbsG;
      a.f += r.fatG;
      return a;
    },
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-medium">Food log</h2>
          <input
            className="input max-w-xs"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <MacroBar label="Calories" value={totals.cal} goal={settings?.dailyCalorieGoal ?? 0} unit=" kcal" />
          <div className="grid grid-cols-3 gap-3">
            <MacroBar label="Protein" value={totals.p} goal={settings?.proteinGoalG ?? 0} color="bg-accent2" />
            <MacroBar label="Carbs" value={totals.c} goal={settings?.carbsGoalG ?? 0} color="bg-accent" />
            <MacroBar label="Fat" value={totals.f} goal={settings?.fatGoalG ?? 0} color="bg-warn" />
          </div>
        </div>
      </div>

      <FoodSearch onAdd={addFood} />

      <div className="card">
        <h3 className="font-medium mb-2">Entries</h3>
        <FoodList rows={rows} onDelete={deleteFood} onSaveAsFavorite={saveAsFavorite} />
      </div>
    </div>
  );
}
