'use client';

import { useEffect, useRef, useState } from 'react';

export type UsdaItem = {
  source: 'usda';
  fdcId: number;
  description: string;
  brand?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type OffItem = {
  source: 'off';
  code: string;
  description: string;
  brand?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSize?: number;
  servingSizeUnit?: string;
};

export type FoodItem = UsdaItem | OffItem;

export type PendingFood = {
  description: string;
  source?: 'usda' | 'off';
  fdcId?: number;
  offCode?: string;
  servingG?: number;
  servings?: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function itemKey(r: FoodItem) {
  return r.source === 'usda' ? `usda-${r.fdcId}` : `off-${r.code}`;
}

function sourceLabel(r: FoodItem) {
  return r.source === 'off' ? 'UK / OFF' : 'USDA';
}

export function FoodSearch({
  onAdd,
  placeholder = 'Search a food (e.g. banana, Tesco yoghurt)...',
}: {
  onAdd: (food: PendingFood) => Promise<void> | void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number>(100);
  const [adding, setAdding] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    if (selected?.servingSize && selected.servingSizeUnit === 'g') {
      setGrams(Math.round(selected.servingSize));
    } else {
      setGrams(100);
    }
  }, [selected]);

  function scaled(item: FoodItem, g: number) {
    const f = g / 100;
    return {
      calories: Math.round(item.caloriesPer100g * f),
      proteinG: +(item.proteinPer100g * f).toFixed(1),
      carbsG: +(item.carbsPer100g * f).toFixed(1),
      fatG: +(item.fatPer100g * f).toFixed(1),
    };
  }

  async function addSelected() {
    if (!selected) return;
    setAdding(true);
    const s = scaled(selected, grams);
    const payload: PendingFood = {
      description: selected.description,
      source: selected.source,
      servingG: grams,
      servings: 1,
      ...s,
    };
    if (selected.source === 'usda') payload.fdcId = selected.fdcId;
    if (selected.source === 'off') payload.offCode = selected.code;
    await onAdd(payload);
    setAdding(false);
    setSelected(null);
    setQ('');
    setResults([]);
  }

  const [manual, setManual] = useState<PendingFood>({
    description: '',
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  });

  async function addManual() {
    if (!manual.description.trim() || !Number.isFinite(manual.calories)) return;
    setAdding(true);
    await onAdd({ ...manual, servings: 1 });
    setAdding(false);
    setManual({ description: '', calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Log food</h3>
        <button
          className="text-xs text-muted hover:text-white"
          onClick={() => setManualMode((m) => !m)}
        >
          {manualMode ? 'Search instead' : 'Manual entry'}
        </button>
      </div>

      {!manualMode ? (
        <>
          <input
            className="input"
            placeholder={placeholder}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
            }}
          />
          {loading && <p className="text-xs text-muted mt-2">Searching Open Food Facts + USDA...</p>}
          {!loading && results.length > 0 && !selected && (
            <ul className="mt-2 max-h-64 overflow-auto divide-y divide-white/5 rounded-lg ring-1 ring-white/5">
              {results.map((r) => (
                <li
                  key={itemKey(r)}
                  className="px-3 py-2 hover:bg-panel2/60 cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <div className="text-sm flex items-center gap-2">
                    <span>{r.description}</span>
                    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ring-1 ${r.source === 'off' ? 'ring-accent2/40 text-accent2' : 'ring-accent/40 text-accent'}`}>
                      {sourceLabel(r)}
                    </span>
                  </div>
                  <div className="text-xs text-muted flex gap-2 flex-wrap">
                    {r.brand && <span>{r.brand}</span>}
                    <span className="text-accent">{Math.round(r.caloriesPer100g)} kcal/100g</span>
                    <span>P {r.proteinPer100g.toFixed(1)}</span>
                    <span>C {r.carbsPer100g.toFixed(1)}</span>
                    <span>F {r.fatPer100g.toFixed(1)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <div className="mt-3 bg-panel2 rounded-lg p-3 ring-1 ring-white/10">
              <div className="text-sm font-medium flex items-center gap-2">
                <span>{selected.description}</span>
                <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ring-1 ${selected.source === 'off' ? 'ring-accent2/40 text-accent2' : 'ring-accent/40 text-accent'}`}>
                  {sourceLabel(selected)}
                </span>
              </div>
              <div className="text-xs text-muted mb-2">{selected.brand || (selected.source === 'usda' ? selected.dataType : '')}</div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">Grams consumed</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={grams}
                    onChange={(e) => setGrams(Number(e.target.value) || 0)}
                  />
                </div>
                <button className="btn-primary" disabled={!grams || adding} onClick={addSelected}>
                  {adding ? 'Adding...' : 'Add'}
                </button>
                <button className="btn-ghost" onClick={() => setSelected(null)}>
                  Cancel
                </button>
              </div>
              <div className="text-xs text-muted mt-2">
                {(() => {
                  const s = scaled(selected, grams);
                  return `~ ${s.calories} kcal - P ${s.proteinG} - C ${s.carbsG} - F ${s.fatG}`;
                })()}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">What did you eat?</label>
            <input
              className="input"
              value={manual.description}
              onChange={(e) => setManual({ ...manual, description: e.target.value })}
              placeholder="e.g. Croissant from bakery"
            />
          </div>
          <div>
            <label className="label">Calories</label>
            <input
              className="input"
              type="number"
              value={manual.calories}
              onChange={(e) => setManual({ ...manual, calories: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">Protein (g)</label>
            <input
              className="input"
              type="number"
              value={manual.proteinG}
              onChange={(e) => setManual({ ...manual, proteinG: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">Carbs (g)</label>
            <input
              className="input"
              type="number"
              value={manual.carbsG}
              onChange={(e) => setManual({ ...manual, carbsG: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">Fat (g)</label>
            <input
              className="input"
              type="number"
              value={manual.fatG}
              onChange={(e) => setManual({ ...manual, fatG: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="col-span-2">
            <button
              className="btn-primary w-full"
              disabled={!manual.description.trim() || adding}
              onClick={addManual}
            >
              {adding ? 'Adding...' : 'Add to log'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
