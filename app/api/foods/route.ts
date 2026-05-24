import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateInput } from '@/lib/date';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');
  const days = searchParams.get('days');

  if (days) {
    const n = Math.min(180, Math.max(1, Number(days)));
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - n);
    const rows = await prisma.foodLog.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(rows);
  }

  const date = parseDateInput(dateParam);
  const rows = await prisma.foodLog.findMany({
    where: { date },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const description = String(body.description || '').trim();
  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 });
  const calories = Number(body.calories);
  if (!Number.isFinite(calories) || calories < 0) {
    return NextResponse.json({ error: 'calories required' }, { status: 400 });
  }
  const source = body.source === 'usda' || body.source === 'off' ? body.source : null;
  const row = await prisma.foodLog.create({
    data: {
      date: parseDateInput(body.date),
      description,
      source,
      fdcId: body.fdcId ? Number(body.fdcId) : null,
      offCode: body.offCode ? String(body.offCode) : null,
      servingG: body.servingG ? Number(body.servingG) : null,
      servings: body.servings ? Number(body.servings) : 1,
      calories,
      proteinG: Number(body.proteinG || 0),
      carbsG: Number(body.carbsG || 0),
      fatG: Number(body.fatG || 0),
      mealType: body.mealType || null,
    },
  });
  return NextResponse.json(row);
}
