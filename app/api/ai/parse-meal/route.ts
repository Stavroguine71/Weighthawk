import { NextResponse } from 'next/server';
import { aiEnabled, client, firstToolInput, HAIKU } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOOL = {
  name: 'log_meal_items',
  description: 'Return one row per distinct food item described by the user.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Short name (e.g. "Chicken caesar wrap")' },
            servingG: { type: 'number', description: 'Estimated grams of the portion if relevant; null for single items like a coffee.' },
            calories: { type: 'number' },
            proteinG: { type: 'number' },
            carbsG: { type: 'number' },
            fatG: { type: 'number' },
            note: { type: 'string', description: 'Optional clarification (e.g. "estimated, no portion specified").' },
          },
          required: ['description', 'calories', 'proteinG', 'carbsG', 'fatG'],
        },
      },
    },
    required: ['items'],
  },
};

const SYSTEM = `You convert short, casual descriptions of meals into structured nutrient estimates.

Rules:
- One item per distinct food. "Coffee and a croissant" = 2 items.
- If portion size is implied (e.g. "a banana"), assume a standard portion (medium banana = ~120 g).
- Be honest about uncertainty. If a description is vague (e.g. "salad"), use moderate defaults and note it.
- Use UK conventions (e.g. flat white = ~120 ml whole milk, ~80 kcal).
- Round calories to nearest 5, grams to one decimal.
- Never refuse or ask clarifying questions — give your best estimate.`;

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ disabled: true, error: 'ANTHROPIC_API_KEY not set' }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'text too long' }, { status: 400 });
  try {
    const resp = await client().messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: text }],
    });
    const out = firstToolInput<{ items: any[] }>(resp);
    return NextResponse.json({ items: out?.items || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI call failed' }, { status: 502 });
  }
}
