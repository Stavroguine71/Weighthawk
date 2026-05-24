'use client';

import { useEffect, useRef, useState } from 'react';
import { todayISO } from '@/lib/date';

type Item = {
  description: string;
  servingG?: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  note?: string;
  _keep?: boolean;
};

type LabelResult = {
  description: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSizeG?: number;
};

type RecipeResult = {
  description: string;
  totalServings: number;
  userServings: number;
  perUserPortion: { calories: number; proteinG: number; carbsG: number; fatG: number };
  ingredients?: string[];
};

type Mode = 'text' | 'photo' | 'label' | 'recipe';

export function AIQuickEntry({ onAdded }: { onAdded: () => void }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [servings, setServings] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [label, setLabel] = useState<LabelResult | null>(null);
  const [labelGrams, setLabelGrams] = useState(100);
  const [recipe, setRecipe] = useState<RecipeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Probe availability once (any AI endpoint returns 503 if key missing).
  useEffect(() => {
    fetch('/api/ai/parse-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
      .then((r) => setAvailable(r.status !== 503))
      .catch(() => setAvailable(false));
  }, []);

  function reset() {
    setItems([]);
    setLabel(null);
    setRecipe(null);
    setErr(null);
  }

  async function runText() {
    if (!text.trim()) return;
    setBusy(true); reset();
    try {
      const r = await fetch('/api/ai/parse-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'AI parse failed');
      setItems((j.items || []).map((it: Item) => ({ ...it, _keep: true })));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  async function runImage(file: File, m: 'meal' | 'label') {
    setBusy(true); reset();
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await fetch('/api/ai/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mode: m }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'AI parse failed');
      if (m === 'meal') {
        setItems((j.result?.items || []).map((it: Item) => ({ ...it, _keep: true })));
      } else {
        setLabel(j.result || null);
        if (j.result?.servingSizeG) setLabelGrams(j.result.servingSizeG);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  async function runRecipe() {
    if (!text.trim()) return;
    setBusy(true); reset();
    try {
      const r = await fetch('/api/ai/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, servings }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'AI parse failed');
      setRecipe(j);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  async function logItems(toLog: Item[]) {
    const date = todayISO();
    for (const it of toLog) {
      await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: it.description,
          servingG: it.servingG ?? null,
          servings: 1,
          calories: it.calories,
          proteinG: it.proteinG,
          carbsG: it.carbsG,
          fatG: it.fatG,
          date,
        }),
      });
    }
    setItems([]);
    setText('');
    onAdded();
  }

  async function logLabel() {
    if (!label) return;
    const f = labelGrams / 100;
    await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: label.description,
        servingG: labelGrams,
        servings: 1,
        calories: Math.round(label.caloriesPer100g * f),
        proteinG: +(label.proteinPer100g * f).toFixed(1),
        carbsG: +(label.carbsPer100g * f).toFixed(1),
        fatG: +(label.fatPer100g * f).toFixed(1),
        date: todayISO(),
      }),
    });
    setLabel(null);
    onAdded();
  }

  async function logRecipe() {
    if (!recipe) return;
    await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: recipe.description,
        servings: recipe.userServings,
        calories: recipe.perUserPortion.calories,
        proteinG: recipe.perUserPortion.proteinG,
        carbsG: recipe.perUserPortion.carbsG,
        fatG: recipe.perUserPortion.fatG,
        date: todayISO(),
      }),
    });
    setRecipe(null);
    setText('');
    onAdded();
  }

  if (available === false) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-medium">Quick AI entry</h3>
        <div className="flex gap-1 text-xs">
          {(['text', 'photo', 'label', 'recipe'] as Mode[]).map((m) => (
            <button
              key={m}
              className={`px-2 py-1 rounded ${mode === m ? 'bg-panel2 text-white ring-1 ring-accent/40' : 'text-muted hover:text-white'}`}
              onClick={() => { setMode(m); reset(); }}
            >
              {m === 'text' ? 'Describe' : m === 'photo' ? 'Photo' : m === 'label' ? 'Label' : 'Recipe'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'text' && (
        <>
          <textarea
            className="input min-h-[72px]"
            placeholder='e.g. "chicken caesar wrap, flat white, two squares of dark chocolate"'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary mt-3" disabled={busy || !text.trim()} onClick={runText}>
            {busy ? 'Thinking...' : 'Parse'}
          </button>
        </>
      )}

      {(mode === 'photo' || mode === 'label') && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="text-xs text-muted file:btn-ghost file:mr-3 file:text-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) runImage(f, mode === 'photo' ? 'meal' : 'label');
            }}
          />
          <p className="text-xs text-muted mt-2">
            {mode === 'photo'
              ? 'Snap your plate. Best with everything visible at a normal angle.'
              : 'Snap the per-100g nutrition table on the back of the packet.'}
          </p>
        </>
      )}

      {mode === 'recipe' && (
        <>
          <textarea
            className="input min-h-[120px]"
            placeholder="Paste the recipe ingredients + method"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-end gap-2 mt-3">
            <div>
              <label className="label">Servings I'm eating</label>
              <input
                className="input w-24"
                type="number"
                min={0.25}
                step={0.25}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value) || 1)}
              />
            </div>
            <button className="btn-primary" disabled={busy || !text.trim()} onClick={runRecipe}>
              {busy ? 'Computing...' : 'Compute'}
            </button>
          </div>
        </>
      )}

      {err && <p className="text-sm text-danger mt-3">{err}</p>}

      {/* Preview: meal items */}
      {items.length > 0 && (
        <div className="mt-4 ring-1 ring-white/10 rounded-lg overflow-hidden">
          <ul className="divide-y divide-white/5">
            {items.map((it, i) => (
              <li key={i} className="px-3 py-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!it._keep}
                  onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, _keep: e.target.checked } : x))}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{it.description}{it.servingG ? ` (${it.servingG}g)` : ''}</div>
                  <div className="text-xs text-muted">
                    {Math.round(it.calories)} kcal - P {it.proteinG} - C {it.carbsG} - F {it.fatG}
                    {it.note ? <span className="ml-2 italic">{it.note}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 bg-panel2/40 flex justify-end gap-2">
            <button className="btn-ghost text-xs" onClick={() => setItems([])}>Discard</button>
            <button
              className="btn-primary text-xs"
              onClick={() => logItems(items.filter((i) => i._keep))}
              disabled={!items.some((i) => i._keep)}
            >
              Log {items.filter((i) => i._keep).length} item{items.filter((i) => i._keep).length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {/* Preview: nutrition label */}
      {label && (
        <div className="mt-4 ring-1 ring-white/10 rounded-lg p-3 bg-panel2/40">
          <div className="text-sm font-medium">{label.description}</div>
          <div className="text-xs text-muted">
            Per 100g: {Math.round(label.caloriesPer100g)} kcal - P {label.proteinPer100g} - C {label.carbsPer100g} - F {label.fatPer100g}
          </div>
          <div className="flex items-end gap-2 mt-3">
            <div>
              <label className="label">Grams eaten</label>
              <input
                className="input w-28"
                type="number"
                value={labelGrams}
                onChange={(e) => setLabelGrams(Number(e.target.value) || 0)}
              />
            </div>
            <button className="btn-primary text-xs" onClick={logLabel} disabled={!labelGrams}>
              Log
            </button>
            <button className="btn-ghost text-xs" onClick={() => setLabel(null)}>Cancel</button>
          </div>
          <div className="text-xs text-muted mt-2">
            ~ {Math.round(label.caloriesPer100g * labelGrams / 100)} kcal at {labelGrams}g
          </div>
        </div>
      )}

      {/* Preview: recipe */}
      {recipe && (
        <div className="mt-4 ring-1 ring-white/10 rounded-lg p-3 bg-panel2/40">
          <div className="text-sm font-medium">{recipe.description}</div>
          <div className="text-xs text-muted">
            {recipe.userServings} of {recipe.totalServings} servings:
            {' '}{Math.round(recipe.perUserPortion.calories)} kcal -
            P {recipe.perUserPortion.proteinG} -
            C {recipe.perUserPortion.carbsG} -
            F {recipe.perUserPortion.fatG}
          </div>
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="text-xs text-muted mt-2 line-clamp-3">
              Detected: {recipe.ingredients.join(', ')}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button className="btn-primary text-xs" onClick={logRecipe}>Log</button>
            <button className="btn-ghost text-xs" onClick={() => setRecipe(null)}>Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}
