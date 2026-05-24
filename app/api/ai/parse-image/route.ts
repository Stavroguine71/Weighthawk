import { NextResponse } from 'next/server';
import { aiEnabled, client, firstToolInput, HAIKU, detectMediaType, stripDataUrl } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MEAL_TOOL = {
  name: 'log_meal_items',
  description: 'Return one row per distinct visible food item with estimated nutrients.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            servingG: { type: 'number' },
            calories: { type: 'number' },
            proteinG: { type: 'number' },
            carbsG: { type: 'number' },
            fatG: { type: 'number' },
            note: { type: 'string' },
          },
          required: ['description', 'calories', 'proteinG', 'carbsG', 'fatG'],
        },
      },
    },
    required: ['items'],
  },
};

const LABEL_TOOL = {
  name: 'log_label',
  description: 'Return per-100g nutrient values transcribed from a nutrition label.',
  input_schema: {
    type: 'object' as const,
    properties: {
      description: { type: 'string', description: 'Product name as printed' },
      caloriesPer100g: { type: 'number' },
      proteinPer100g: { type: 'number' },
      carbsPer100g: { type: 'number' },
      fatPer100g: { type: 'number' },
      servingSizeG: { type: 'number', description: 'Suggested serving size in grams if printed' },
    },
    required: ['description', 'caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g'],
  },
};

const MEAL_SYSTEM = `You estimate nutrient content from a photo of a meal.

Rules:
- One item per distinct food on the plate.
- Estimate portion size in grams from visual cues (plate ~25 cm, fork ~20 cm).
- Be conservative; favour the higher end of a realistic kcal range.
- Always add a brief note when estimates are highly uncertain.
- Never refuse — give your best estimate.`;

const LABEL_SYSTEM = `You transcribe a UK / EU nutrition label (per 100 g column) into structured data. Read carefully. If a value is missing, return 0. Capture the product name as printed.`;

export async function POST(req: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ disabled: true }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const image = String(body.image || '');
  const mode = body.mode === 'label' ? 'label' : 'meal';
  if (!image) return NextResponse.json({ error: 'image required' }, { status: 400 });
  if (image.length > 8_000_000) return NextResponse.json({ error: 'image too large' }, { status: 400 });

  const mediaType = detectMediaType(image);
  const data = stripDataUrl(image);
  const tool = mode === 'label' ? LABEL_TOOL : MEAL_TOOL;
  const system = mode === 'label' ? LABEL_SYSTEM : MEAL_SYSTEM;

  try {
    const resp = await client().messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: mode === 'label' ? 'Transcribe this nutrition label.' : 'Identify each food in this meal photo and estimate nutrients.' },
          ],
        },
      ],
    });
    const out = firstToolInput<any>(resp);
    return NextResponse.json({ mode, result: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI call failed' }, { status: 502 });
  }
}
