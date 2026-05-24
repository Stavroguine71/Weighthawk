import { NextResponse } from 'next/server';
import { aiEnabled, client, firstToolInput, SONNET } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOOL = {
  name: 'propose_targets',
  description: 'Propose adjusted targets based on actual progress over the last 90 days.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: 'Two or three sentences in plain English explaining what changed and why.' },
      proposed: {
        type: 'object',
        properties: {
          weeklyRateKg: { type: 'number' },
          dailyCalorieGoal: { type: 'number' },
          proteinGoalG: { type: 'number' },
          carbsGoalG: { type: 'number' },
          fatGoalG: { type: 'number' },
        },
        required: ['weeklyRateKg', 'dailyCalorieGoal', 'proteinGoalG', 'carbsGoalG', 'fatGoalG'],
      },
      keepSame: { type: 'boolean', description: 'True if nothing should change.' },
    },
    required: ['summary', 'proposed', 'keepSame'],
  },
};

const SYSTEM = `You review a user's 90 days of nutrition + weight data and propose adjusted targets.

Inputs:
- Current targets (kcal, macros, weekly rate, goal weight, target date).
- Actual weight trend (kg / week) computed from regression.
- Adherence: % of logged days where kcal was within +/- 5% of goal.

Rules:
- If actual trend is close to target rate (within 30%), propose keepSame: true.
- If actual rate is consistently slower than target, propose a tighter kcal goal and lower weekly rate (more achievable).
- If the user is losing too fast, propose a smaller deficit.
- Macros: protein stays ~1.6 g/kg lean body mass, fat ~25% of kcal, carbs fill the rest.
- Never propose a kcal goal below 1200.`;

export async function POST() {
  if (!aiEnabled()) return NextResponse.json({ disabled: true }, { status: 503 });

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  const [settings, foods, weighings] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.foodLog.findMany({ where: { date: { gte: since } }, orderBy: { date: 'asc' } }),
    prisma.weighing.findMany({ where: { date: { gte: since } }, orderBy: { date: 'asc' } }),
  ]);

  const data = {
    current: settings,
    weighings: weighings.map((w) => ({ date: w.date.toISOString().slice(0, 10), kg: w.weightKg })),
    foodsByDay: foods.reduce((acc: Record<string, number>, f) => {
      const k = f.date.toISOString().slice(0, 10);
      acc[k] = (acc[k] || 0) + f.calories;
      return acc;
    }, {}),
  };

  try {
    const resp = await client().messages.create({
      model: SONNET,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: `Review my 90-day data and propose updated targets.\n\nData:\n${JSON.stringify(data)}` }],
    });
    const out = firstToolInput<any>(resp);
    return NextResponse.json(out || { error: 'empty response' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI call failed' }, { status: 502 });
  }
}
