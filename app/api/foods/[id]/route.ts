import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.foodLog.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
