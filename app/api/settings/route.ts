import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getOrCreate() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) s = await prisma.settings.create({ data: { id: 1 } });
  return s;
}

export async function GET() {
  return NextResponse.json(await getOrCreate());
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  for (const k of ['dailyCalorieGoal', 'proteinGoalG', 'carbsGoalG', 'fatGoalG']) {
    if (body[k] !== undefined && body[k] !== null && body[k] !== '') {
      data[k] = Math.max(0, Math.round(Number(body[k])));
    }
  }
  for (const k of ['heightCm', 'startWeightKg', 'goalWeightKg']) {
    if (body[k] !== undefined && body[k] !== null && body[k] !== '') {
      data[k] = Number(body[k]);
    } else if (body[k] === null || body[k] === '') {
      data[k] = null;
    }
  }
  await getOrCreate();
  const s = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json(s);
}
