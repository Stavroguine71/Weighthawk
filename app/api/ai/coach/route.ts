import { NextResponse } from 'next/server';
import { aiEnabled, client, joinText, SONNET } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM = `You are a calm, evidence-grounded nutrition coach embedded inside the user's personal tracker.

Style:
- Reply in plain English, conversational. Use short paragraphs, not bullet lists, unless the user explicitly asks for a list.
- Anchor advice in the user's actual data when it is present. Quote specific numbers and dates.
- When the data does not support an answer, say so plainly. Never make up logged meals.
- Avoid generic platitudes. Prefer a single concrete next action over five vague tips.
- You are not a doctor. For medical, eating-disorder, or medication questions, suggest the user speak with a professional.`;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ disabled: true }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (!messages.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const [settings, foods, weighings] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.foodLog.findMany({ where: { date: { gte: since } }, orderBy: { date: 'asc' } }),
    prisma.weighing.findMany({ where: { date: { gte: since } }, orderBy: { date: 'asc' } }),
  ]);

  const context = {
    today: new Date().toISOString().slice(0, 10),
    goals: settings && {
      kcal: settings.dailyCalorieGoal,
      protein: settings.proteinGoalG,
      carbs: settings.carbsGoalG,
      fat: settings.fatGoalG,
      goalWeightKg: settings.goalWeightKg,
      targetDate: settings.targetDate?.toISOString().slice(0, 10) ?? null,
      weeklyRateKg: settings.weeklyRateKg,
    },
    weighingsLast30Days: weighings.map((w) => ({
      date: w.date.toISOString().slice(0, 10),
      weightKg: w.weightKg,
    })),
    foodsLast30Days: foods.map((f) => ({
      date: f.date.toISOString().slice(0, 10),
      description: f.description,
      calories: f.calories,
      proteinG: f.proteinG,
      carbsG: f.carbsG,
      fatG: f.fatG,
    })),
  };

  const sys = `${SYSTEM}\n\nUser's data:\n${JSON.stringify(context)}`;

  try {
    const resp = await client().messages.create({
      model: SONNET,
      max_tokens: 800,
      system: sys,
      messages,
    });
    return NextResponse.json({ text: joinText(resp) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI call failed' }, { status: 502 });
  }
}
