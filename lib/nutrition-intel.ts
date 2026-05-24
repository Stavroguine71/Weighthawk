// BMR / TDEE math + macro split helpers.
//
// Mifflin–St Jeor BMR (most accurate of the common formulas):
//   Men:   BMR = 10*kg + 6.25*cm - 5*age + 5
//   Women: BMR = 10*kg + 6.25*cm - 5*age - 161
//
// TDEE = BMR * activity multiplier.
// Suggested kcal goal = TDEE + (weeklyRateKg * 7700 / 7)
//   weeklyRateKg is negative for loss (e.g. -0.5 kg/week).
//   7700 kcal ≈ 1 kg of body fat (rough but standard).

export type Sex = 'M' | 'F';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Light (1–3 workouts/week)',
  moderate: 'Moderate (3–5 workouts/week)',
  active: 'Active (6–7 workouts/week)',
  very_active: 'Very active (twice-a-day / physical job)',
};

export function calcAge(birthYear: number | null | undefined): number | null {
  if (!birthYear || birthYear < 1900) return null;
  return new Date().getUTCFullYear() - birthYear;
}

export function calcBMR(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const { weightKg, heightCm, age, sex } = opts;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'M' ? base + 5 : base - 161;
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * (ACTIVITY_MULTIPLIER[activity] || 1.2);
}

export function suggestCalorieGoal(opts: {
  tdee: number;
  weeklyRateKg: number; // negative for loss
}): number {
  const dailyDelta = (opts.weeklyRateKg * 7700) / 7;
  const goal = opts.tdee + dailyDelta;
  // Don't let it go silly low.
  return Math.max(1200, Math.round(goal));
}

export function suggestMacroSplit(kcalGoal: number, weightKg: number) {
  // 1.6 g protein / kg lean target, 25% kcal from fat, rest carbs.
  const proteinG = Math.round(weightKg * 1.6);
  const proteinKcal = proteinG * 4;
  const fatKcal = kcalGoal * 0.25;
  const fatG = Math.round(fatKcal / 9);
  const carbsKcal = Math.max(0, kcalGoal - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);
  return { proteinG, carbsG, fatG };
}

export type IntelInputs = {
  weightKg: number | null;
  heightCm: number | null;
  birthYear: number | null;
  sex: Sex | null;
  activity: ActivityLevel | null;
  weeklyRateKg: number | null;
};

export type IntelResult =
  | { ok: false; missing: string[] }
  | {
      ok: true;
      age: number;
      bmr: number;
      tdee: number;
      suggestedKcal: number;
      suggestedMacros: { proteinG: number; carbsG: number; fatG: number };
    };

export function computeIntel(i: IntelInputs): IntelResult {
  const missing: string[] = [];
  if (!i.weightKg) missing.push('latest weight');
  if (!i.heightCm) missing.push('height');
  const age = calcAge(i.birthYear);
  if (!age) missing.push('birth year');
  if (!i.sex) missing.push('sex');
  if (!i.activity) missing.push('activity level');
  if (i.weeklyRateKg == null || !Number.isFinite(i.weeklyRateKg)) missing.push('weekly rate');
  if (missing.length) return { ok: false, missing };
  const bmr = calcBMR({
    weightKg: i.weightKg!,
    heightCm: i.heightCm!,
    age: age!,
    sex: i.sex!,
  });
  const tdee = calcTDEE(bmr, i.activity!);
  const suggestedKcal = suggestCalorieGoal({ tdee, weeklyRateKg: i.weeklyRateKg! });
  const suggestedMacros = suggestMacroSplit(suggestedKcal, i.weightKg!);
  return {
    ok: true,
    age: age!,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    suggestedKcal,
    suggestedMacros,
  };
}
