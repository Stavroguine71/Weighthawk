import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await prisma.favorite.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const calories = Number(body.calories);
  if (!Number.isFinite(calories) || calories < 0) {
    return NextResponse.json({ error: 'calories required' }, { status: 400 });
  }
  const row = await prisma.favorite.create({
    data: {
      name,
      fdcId: body.fdcId ? Number(body.fdcId) : null,
      servingG: body.servingG ? Number(body.servingG) : null,
      servings: body.servings ? Number(body.servings) : 1,
      calories,
      proteinG: Number(body.proteinG || 0),
      carbsG: Number(body.carbsG || 0),
      fatG: Number(body.fatG || 0),
    },
  });
  return NextResponse.json(row);
}
