import { NextResponse } from 'next/server';
import { searchAllSources } from '@/lib/food';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json([]);
  try {
    const results = await searchAllSources(q);
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'search failed' }, { status: 502 });
  }
}
