import { NextRequest, NextResponse } from 'next/server';
import { skillEvidence, graphConfigured } from '@/lib/graph';
import { canonicalSkill } from '@/lib/skills';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, private' };
export async function GET(request: NextRequest) {
  if (!graphConfigured()) return NextResponse.json({ error: 'graph_unconfigured' }, { status: 503, headers });
  const raw = request.nextUrl.searchParams.get('skill')?.trim() ?? '';
  if (!/^[a-z0-9+#. -]{1,40}$/i.test(raw)) return NextResponse.json({ error: 'invalid' }, { status: 400, headers });
  const skill = canonicalSkill(raw)?.name;
  if (!skill) return NextResponse.json({ skill: raw, evidence: [] }, { headers });
  try {
    return NextResponse.json({ skill, evidence: await skillEvidence(skill) }, { headers });
  } catch {
    return NextResponse.json({ error: 'graph_unavailable' }, { status: 503, headers });
  }
}
