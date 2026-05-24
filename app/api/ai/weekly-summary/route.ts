import { NextResponse } from 'next/server';
import { aiEnabled, client, joinText, SONNET } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM = `You are a no-nonsense nutrition coach writing a weekly recap for the user.

Style:
- Plain English, 80–140 words. No bullet points. No headings. No emojis.
- Be specific: name actual days, kcal numbers, weight deltas.
- Honest about both wins and slips. Never sycophantic.
- End with one concrete suggestion for the coming week if there is an obvious lever.`;

export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ disabled: true }, { status: 503 });

  const since14 = new Date();
  since14.setUTCDate(since14.getUTCDate() - 14);
  const [settings, foods, weighings] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.foodLog.findMany({ where: { date: { gte: since14 } }, orderBy: { date: 'asc' } }),
    prisma.weighing.findMany({ where: { date: { gte: since14 } }, orderBy: { date: 'asc' } }),
  ]);

  const facts = {
    goals: settings && {
      kcal: settings.dailyCalorieGoal,
      protein: settings.proteinGoalG,
      carbs: settings.carbsGoalG,
      fat: settings.fatGoalG,
      goalWeightKg: settings.goalWeightKg,
      weeklyRateKg: settings.weeklyRateKg,
    },
    weighingsLast14Days: weighings.map((w) => ({
      date: w.date.toISOString().slice(0, 10),
      weightKg: w.weightKg,
    })),
    foodsLast14Days: foods.map((f) => ({
      date: f.date.toISOString().slice(0, 10),
      description: f.description,
      calories: f.calories,
      proteinG: f.proteinG,
      carbsG: f.carbsG,
      fatG: f.fatG,
    })),
  };

  try {
    const resp = await client().messages.create({
      model: SONNET,
      max_tokens: 600,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Write a weekly recap covering the last 7 days. Use the prior week for comparison where useful.\n\nData:\n${JSON.stringify(facts)}`,
        },
      ],
    });
    return NextResponse.json({ text: joinText(resp) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI call failed' }, { status: 502 });
  }
}
