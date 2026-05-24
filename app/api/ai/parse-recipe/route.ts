import { NextResponse } from 'next/server';
import { aiEnabled, client, firstToolInput, HAIKU } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOOL = {
  name: 'log_recipe',
  description: 'Break a recipe into a single combined log entry sized to the requested servings.',
  input_schema: {
    type: 'object' as const,
    properties: {
      description: { type: 'string', description: 'Recipe name + portion (e.g. "Tofu pad thai (1 of 4 servings)")' },
      totalServings: { type: 'number' },
      userServings: { type: 'number' },
      perUserPortion: {
        type: 'object',
        properties: {
          calories: { type: 'number' },
          proteinG: { type: 'number' },
          carbsG: { type: 'number' },
          fatG: { type: 'number' },
        },
        required: ['calories', 'proteinG', 'carbsG', 'fatG'],
      },
      ingredients: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of detected ingredients with quantities for reference',
      },
    },
    required: ['description', 'totalServings', 'userServings', 'perUserPortion'],
  },
};

const SYSTEM = `You convert a recipe (free text, possibly pasted from a website) into a single nutrient estimate
sized to the user's portion.

Rules:
- Read the ingredient list carefully; infer total servings from the recipe if stated, otherwise estimate based on volume.
- Compute total recipe macros, then divide by total servings, then multiply by the user's stated servings.
- Use realistic densities and standard composition values.
- Round calories to nearest 5.
- Never refuse — give your best estimate.`;

export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ disabled: true }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim();
  const servings = Number(body.servings) || 1;
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (text.length > 10000) return NextResponse.json({ error: 'recipe too long' }, { status: 400 });
  try {
    const resp = await client().messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: `User is eating ${servings} serving(s) of this recipe.\n\nRecipe:\n${text}` }],
    });
    const out = firstToolInput<any>(resp);
    return NextResponse.json(out || { error: 'empty response' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI call failed' }, { status: 502 });
  }
}
