'use client';

import {
  adherencePct,
  classifyWeightTrend,
  loggingStreak,
  macroHints,
  projectGoalDate,
  weeklySummary,
  type FoodPoint,
  type WeightPoint,
} from '@/lib/insights';

type Settings = {
  dailyCalorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
  goalWeightKg: number | null;
  targetDate: string | null;
  weeklyRateKg: number | null;
};

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtKg(n: number | null): string {
  if (n === null || n === undefined) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)} kg`;
}

function trendClass(kind: string): string {
  switch (kind) {
    case 'on-track':
      return 'text-accent2';
    case 'fast':
    case 'wrong-direction':
      return 'text-warn';
    case 'slow':
    case 'plateau':
      return 'text-muted';
    default:
      return 'text-muted';
  }
}

function trendBlurb(s: ReturnType<typeof classifyWeightTrend>, goalDirection: 'lose' | 'gain' | 'none'): string {
  if (s.kind === 'no-data') return 'Need more weigh-ins to detect a trend.';
  if (s.kind === 'plateau') return `Weight is flat (${fmtKg(s.trendKgPerWeek)}/wk over last 3 weeks). Plateau.`;
  const trendStr = `${fmtKg(s.trendKgPerWeek)}/wk over last 3 weeks`;
  if (s.kind === 'wrong-direction') {
    return goalDirection === 'lose'
      ? `Weight is going up (${trendStr}). Target is to lose ${Math.abs(s.targetKgPerWeek).toFixed(2)} kg/wk.`
      : `Weight is going down (${trendStr}). Target is to gain ${s.targetKgPerWeek.toFixed(2)} kg/wk.`;
  }
  if (s.kind === 'slow') return `Moving slower than target (${trendStr} vs ${fmtKg(s.targetKgPerWeek)}/wk goal).`;
  if (s.kind === 'fast') return `Moving faster than target (${trendStr} vs ${fmtKg(s.targetKgPerWeek)}/wk goal). Watch for muscle loss / rebound.`;
  return `On track (${trendStr}${s.targetKgPerWeek ? `, target ${fmtKg(s.targetKgPerWeek)}/wk` : ''}).`;
}

export function InsightsPanel({
  foods,
  weighings,
  settings,
}: {
  foods: FoodPoint[];
  weighings: WeightPoint[];
  settings: Settings;
}) {
  const summary = weeklySummary(foods, weighings);
  const status = classifyWeightTrend(weighings, settings.weeklyRateKg ?? null);
  const adh = adherencePct(foods, settings.dailyCalorieGoal, 30);
  const streak = loggingStreak(foods);
  const hints = macroHints(foods, {
    proteinG: settings.proteinGoalG,
    carbsG: settings.carbsGoalG,
    fatG: settings.fatGoalG,
    kcalGoal: settings.dailyCalorieGoal,
  });

  // ETA projection toward goal weight.
  const latestWeight = weighings.length ? weighings[weighings.length - 1].weightKg : null;
  const eta = settings.goalWeightKg && latestWeight
    ? projectGoalDate(weighings, settings.goalWeightKg)
    : null;

  const goalDirection: 'lose' | 'gain' | 'none' =
    settings.weeklyRateKg && settings.weeklyRateKg < 0
      ? 'lose'
      : settings.weeklyRateKg && settings.weeklyRateKg > 0
        ? 'gain'
        : 'none';

  // Compare projected ETA against user's target date, if set.
  let targetVsProjected: { onTrack: boolean; daysDiff: number } | null = null;
  if (eta?.etaDate && settings.targetDate) {
    const target = new Date(settings.targetDate);
    const daysDiff = Math.round((eta.etaDate.getTime() - target.getTime()) / 86400000);
    targetVsProjected = { onTrack: daysDiff <= 0, daysDiff };
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Weekly summary */}
      <div className="card md:col-span-2">
        <div className="flex items-baseline justify-between">
          <h3 className="font-medium">Last 7 days</h3>
          <span className="text-xs text-muted">{summary.daysLogged}/7 days logged</span>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted">Avg kcal/day</div>
            <div className="text-xl font-semibold">{summary.avgKcal ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Avg weight</div>
            <div className="text-xl font-semibold">
              {summary.avgWeightKg !== null ? `${summary.avgWeightKg.toFixed(1)} kg` : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Δ vs prev week</div>
            <div className={`text-xl font-semibold ${
              summary.weightDeltaKg === null ? 'text-muted'
              : summary.weightDeltaKg < 0 ? 'text-accent2'
              : summary.weightDeltaKg > 0 ? 'text-warn'
              : 'text-muted'
            }`}>
              {summary.weightDeltaKg !== null ? fmtKg(summary.weightDeltaKg) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Projected /month</div>
            <div className="text-xl font-semibold">
              {summary.projectedMonthlyKg !== null ? fmtKg(summary.projectedMonthlyKg) : '—'}
            </div>
          </div>
        </div>
        <div className={`mt-3 text-sm ${trendClass(status.kind)}`}>
          {trendBlurb(status, goalDirection)}
        </div>
        {hints.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {hints.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-accent2 mt-0.5">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Goal / streak / adherence */}
      <div className="card">
        <h3 className="font-medium">Goal & habit</h3>
        {settings.goalWeightKg && eta ? (
          <div className="mt-3 text-sm">
            <div className="text-xs text-muted">ETA to {settings.goalWeightKg} kg</div>
            <div className="text-xl font-semibold">{formatDate(eta.etaDate)}</div>
            {eta.weeksAway !== null && (
              <div className="text-xs text-muted mt-0.5">
                ≈ {Math.abs(eta.weeksAway).toFixed(1)} weeks at current trend
              </div>
            )}
            {targetVsProjected && settings.targetDate && (
              <div className={`text-xs mt-1 ${targetVsProjected.onTrack ? 'text-accent2' : 'text-warn'}`}>
                {targetVsProjected.onTrack
                  ? `${Math.abs(targetVsProjected.daysDiff)} days ahead of target (${formatDate(new Date(settings.targetDate))})`
                  : `${targetVsProjected.daysDiff} days behind target (${formatDate(new Date(settings.targetDate))})`}
              </div>
            )}
            {!eta.etaDate && (
              <div className="text-xs text-warn mt-1">
                Current trend won't reach goal. Adjust diet or set a different goal.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-xs text-muted">
            Set a goal weight + weekly rate in Settings to get an ETA.
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted">Streak</div>
            <div className="text-xl font-semibold">{streak} <span className="text-base text-muted">day{streak === 1 ? '' : 's'}</span></div>
          </div>
          <div>
            <div className="text-xs text-muted">Adherence (30d)</div>
            <div className="text-xl font-semibold">{adh.pctWithinGoal}%</div>
            <div className="text-xs text-muted">{adh.loggedDays}/{adh.totalDays} days logged</div>
          </div>
        </div>
      </div>
    </div>
  );
}
