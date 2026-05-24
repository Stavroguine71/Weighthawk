// Insights computed from your weighings + food log.
//
// We bias toward "honest, not chirpy" — the app won't tell you you're on track
// when you're not.

export type WeightPoint = { date: Date | string; weightKg: number };
export type FoodPoint = {
  date: Date | string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function dayKey(d: Date | string): string {
  const dt = toDate(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function avg(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Simple linear regression on y = a + b*x. Returns slope b in units of kg/day
// (when x is days since first measurement).
function regress(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: meanY - slope * meanX };
}

// 7-day moving average of weighings.
export function movingAvg(weighings: WeightPoint[], windowDays = 7): { date: string; avgKg: number }[] {
  if (!weighings.length) return [];
  // Bucket into day-keyed values (take latest per day if multiple).
  const byDay = new Map<string, number>();
  for (const w of weighings) byDay.set(dayKey(w.date), w.weightKg);
  const sorted = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const out: { date: string; avgKg: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, i - windowDays + 1);
    const slice = sorted.slice(start, i + 1).map((s) => s[1]);
    out.push({ date: sorted[i][0], avgKg: slice.reduce((a, b) => a + b, 0) / slice.length });
  }
  return out;
}

// Weight trend over the last N days, returning kg/week slope.
export function weightTrendKgPerWeek(weighings: WeightPoint[], lastNDays = 28): number | null {
  const since = daysAgo(lastNDays).getTime();
  const points = weighings
    .filter((w) => toDate(w.date).getTime() >= since)
    .map((w) => ({ x: toDate(w.date).getTime() / 86400000, y: w.weightKg }));
  const r = regress(points);
  if (!r) return null;
  return r.slope * 7; // kg/day → kg/week
}

// Project the date at which you'll hit goalWeightKg if the current trend holds.
export function projectGoalDate(
  weighings: WeightPoint[],
  goalWeightKg: number,
  lookbackDays = 28,
): { etaDate: Date | null; weeksAway: number | null; trendKgPerWeek: number | null } {
  if (!weighings.length) return { etaDate: null, weeksAway: null, trendKgPerWeek: null };
  const trend = weightTrendKgPerWeek(weighings, lookbackDays);
  if (trend === null) return { etaDate: null, weeksAway: null, trendKgPerWeek: null };
  const latest = weighings[weighings.length - 1].weightKg;
  const delta = goalWeightKg - latest;
  // Trend going wrong direction (e.g. losing weight is negative trend, goal is below latest).
  if (trend === 0 || Math.sign(trend) !== Math.sign(delta)) {
    return { etaDate: null, weeksAway: null, trendKgPerWeek: trend };
  }
  const weeksAway = delta / trend;
  const etaDate = new Date();
  etaDate.setUTCDate(etaDate.getUTCDate() + Math.round(weeksAway * 7));
  return { etaDate, weeksAway, trendKgPerWeek: trend };
}

// Plateau / on-track / off-track classification vs target rate.
export type WeightStatus =
  | { kind: 'no-data' }
  | { kind: 'plateau'; trendKgPerWeek: number }
  | { kind: 'on-track'; trendKgPerWeek: number; targetKgPerWeek: number }
  | { kind: 'slow'; trendKgPerWeek: number; targetKgPerWeek: number }
  | { kind: 'fast'; trendKgPerWeek: number; targetKgPerWeek: number }
  | { kind: 'wrong-direction'; trendKgPerWeek: number; targetKgPerWeek: number };

export function classifyWeightTrend(
  weighings: WeightPoint[],
  targetKgPerWeek: number | null,
  lookbackDays = 21,
): WeightStatus {
  const trend = weightTrendKgPerWeek(weighings, lookbackDays);
  if (trend === null) return { kind: 'no-data' };
  if (Math.abs(trend) < 0.05) {
    // Less than 50g/week movement → effectively a plateau.
    return { kind: 'plateau', trendKgPerWeek: trend };
  }
  if (targetKgPerWeek == null || !Number.isFinite(targetKgPerWeek)) {
    // No target set — just report direction.
    return trend < 0
      ? { kind: 'on-track', trendKgPerWeek: trend, targetKgPerWeek: 0 }
      : { kind: 'on-track', trendKgPerWeek: trend, targetKgPerWeek: 0 };
  }
  if (Math.sign(trend) !== Math.sign(targetKgPerWeek)) {
    return { kind: 'wrong-direction', trendKgPerWeek: trend, targetKgPerWeek };
  }
  const ratio = Math.abs(trend) / Math.abs(targetKgPerWeek);
  if (ratio < 0.5) return { kind: 'slow', trendKgPerWeek: trend, targetKgPerWeek };
  if (ratio > 1.6) return { kind: 'fast', trendKgPerWeek: trend, targetKgPerWeek };
  return { kind: 'on-track', trendKgPerWeek: trend, targetKgPerWeek };
}

// Sum a food day.
function sumDay(rows: FoodPoint[]) {
  return rows.reduce(
    (a, r) => ({
      cal: a.cal + r.calories,
      p: a.p + r.proteinG,
      c: a.c + r.carbsG,
      f: a.f + r.fatG,
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );
}

// Bucket food log by day (UTC).
function groupByDay(foods: FoodPoint[]) {
  const map = new Map<string, FoodPoint[]>();
  for (const f of foods) {
    const k = dayKey(f.date);
    const arr = map.get(k) || [];
    arr.push(f);
    map.set(k, arr);
  }
  return map;
}

// Streak of consecutive recent days with at least one food log (up to and including yesterday).
// We're lenient about "today" because the user may not have logged yet.
export function loggingStreak(foods: FoodPoint[]): number {
  const days = new Set([...groupByDay(foods).keys()]);
  let streak = 0;
  // Start from yesterday if today isn't logged, otherwise from today.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let cursor = new Date(today);
  if (!days.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// % of last `days` where total kcal was logged AND <= goal (with 5% buffer).
export function adherencePct(
  foods: FoodPoint[],
  kcalGoal: number,
  days = 30,
): { pctWithinGoal: number; loggedDays: number; totalDays: number } {
  if (!kcalGoal) return { pctWithinGoal: 0, loggedDays: 0, totalDays: days };
  const byDay = groupByDay(foods);
  const cap = kcalGoal * 1.05;
  let logged = 0;
  let within = 0;
  for (let i = 0; i < days; i++) {
    const d = daysAgo(i);
    const k = dayKey(d);
    const rows = byDay.get(k);
    if (!rows || rows.length === 0) continue;
    logged++;
    const total = sumDay(rows).cal;
    if (total > 0 && total <= cap) within++;
  }
  return {
    pctWithinGoal: logged ? Math.round((within / logged) * 100) : 0,
    loggedDays: logged,
    totalDays: days,
  };
}

// Weekly summary: averages, deltas, projected monthly weight change.
export type WeeklySummary = {
  avgKcal: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  daysLogged: number;
  avgWeightKg: number | null;
  weightDeltaKg: number | null; // this week's avg minus previous week's avg
  trendKgPerWeek: number | null;
  projectedMonthlyKg: number | null;
};

export function weeklySummary(
  foods: FoodPoint[],
  weighings: WeightPoint[],
): WeeklySummary {
  const byDay = groupByDay(foods);
  const last7Totals: number[] = [];
  const last7P: number[] = [];
  const last7C: number[] = [];
  const last7F: number[] = [];
  for (let i = 0; i < 7; i++) {
    const k = dayKey(daysAgo(i));
    const rows = byDay.get(k);
    if (rows && rows.length) {
      const t = sumDay(rows);
      last7Totals.push(t.cal);
      last7P.push(t.p);
      last7C.push(t.c);
      last7F.push(t.f);
    }
  }
  const cutoff7 = daysAgo(7).getTime();
  const cutoff14 = daysAgo(14).getTime();
  const w7 = weighings.filter((w) => toDate(w.date).getTime() >= cutoff7).map((w) => w.weightKg);
  const w14_7 = weighings
    .filter((w) => {
      const t = toDate(w.date).getTime();
      return t >= cutoff14 && t < cutoff7;
    })
    .map((w) => w.weightKg);
  const avgW = avg(w7);
  const prevW = avg(w14_7);
  const trend = weightTrendKgPerWeek(weighings, 28);
  return {
    avgKcal: last7Totals.length ? Math.round(avg(last7Totals)!) : null,
    avgProtein: last7P.length ? Math.round(avg(last7P)!) : null,
    avgCarbs: last7C.length ? Math.round(avg(last7C)!) : null,
    avgFat: last7F.length ? Math.round(avg(last7F)!) : null,
    daysLogged: last7Totals.length,
    avgWeightKg: avgW !== null ? +avgW.toFixed(2) : null,
    weightDeltaKg: avgW !== null && prevW !== null ? +(avgW - prevW).toFixed(2) : null,
    trendKgPerWeek: trend !== null ? +trend.toFixed(2) : null,
    projectedMonthlyKg: trend !== null ? +(trend * 4.345).toFixed(1) : null,
  };
}

// Macro hints: simple rule-based observations over the last 7 days.
export function macroHints(
  foods: FoodPoint[],
  goals: { proteinG: number; carbsG: number; fatG: number; kcalGoal: number },
): string[] {
  const byDay = groupByDay(foods);
  let lowProteinDays = 0;
  let highFatDays = 0;
  let highCarbDays = 0;
  let over = 0;
  let dayCount = 0;
  for (let i = 0; i < 7; i++) {
    const k = dayKey(daysAgo(i));
    const rows = byDay.get(k);
    if (!rows || !rows.length) continue;
    dayCount++;
    const t = sumDay(rows);
    if (goals.proteinG && t.p < goals.proteinG * 0.85) lowProteinDays++;
    if (goals.fatG && t.f > goals.fatG * 1.15) highFatDays++;
    if (goals.carbsG && t.c > goals.carbsG * 1.15) highCarbDays++;
    if (goals.kcalGoal && t.cal > goals.kcalGoal * 1.05) over++;
  }
  const hints: string[] = [];
  if (dayCount < 3) return hints; // not enough signal
  if (lowProteinDays >= 4) hints.push(`Protein under goal on ${lowProteinDays}/${dayCount} days — try a higher-protein breakfast or snack.`);
  if (highFatDays >= 4) hints.push(`Fat over goal on ${highFatDays}/${dayCount} days — easy targets: cooking oil, cheese, nut butters.`);
  if (highCarbDays >= 4) hints.push(`Carbs over goal on ${highCarbDays}/${dayCount} days — bread/pasta portions or sweet snacks are usually the culprit.`);
  if (over >= 4) hints.push(`Calories over goal on ${over}/${dayCount} logged days — consider tightening portion sizes or swapping a high-cal item.`);
  if (!hints.length) hints.push(`Macros look consistent over the last ${dayCount} logged days.`);
  return hints;
}
