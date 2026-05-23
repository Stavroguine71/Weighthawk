import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateInput } from '@/lib/date';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(searchParams.get('days') || 90)));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await prisma.weighing.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const weightKg = Number(body.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return NextResponse.json({ error: 'weightKg required' }, { status: 400 });
  }
  const date = parseDateInput(body.date);
  // Upsert by date — one weighing per day
  const existing = await prisma.weighing.findFirst({ where: { date } });
  const row = existing
    ? await prisma.weighing.update({
        where: { id: existing.id },
        data: { weightKg, note: body.note || null },
      })
    : await prisma.weighing.create({
        data: { date, weightKg, note: body.note || null },
      });
  return NextResponse.json(row);
}
