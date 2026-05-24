import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getOrCreate() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) s = await prisma.settings.create({ data: { id: 1 } });
  return s;
}

const INT_FIELDS = ['dailyCalorieGoal', 'proteinGoalG', 'carbsGoalG', 'fatGoalG', 'birthYear'];
const FLOAT_FIELDS = ['heightCm', 'startWeightKg', 'goalWeightKg', 'weeklyRateKg'];
const STRING_FIELDS = ['sex', 'activityLevel'];

export async function GET() {
  return NextResponse.json(await getOrCreate());
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const data: any = {};

  for (const k of INT_FIELDS) {
    if (body[k] === null || body[k] === '') {
      data[k] = null;
    } else if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (Number.isFinite(n)) data[k] = Math.round(n);
    }
  }

  for (const k of FLOAT_FIELDS) {
    if (body[k] === null || body[k] === '') {
      data[k] = null;
    } else if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (Number.isFinite(n)) data[k] = n;
    }
  }

  for (const k of STRING_FIELDS) {
    if (body[k] === null || body[k] === '') {
      data[k] = null;
    } else if (body[k] !== undefined) {
      data[k] = String(body[k]);
    }
  }

  if (body.targetDate === null || body.targetDate === '') {
    data.targetDate = null;
  } else if (typeof body.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.targetDate)) {
    data.targetDate = new Date(`${body.targetDate}T00:00:00.000Z`);
  }

  await getOrCreate();
  const s = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json(s);
}
