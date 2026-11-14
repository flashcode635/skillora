import { NextRequest, NextResponse } from 'next/server';
import { rankJobs, jobCount, type SkillInput } from '@/lib/jobs';
import { canonicalSkill } from '@/lib/skills';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, private' };
const hits = new Map<string, number[]>();

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    // Compare hostnames, not host:port: the preview proxy serves the app on a
    // different port than the Origin it sends. No authenticated cookies exist,
    // so hostname equality is a sufficient anti-cross-site check here.
    return new URL(origin).hostname === new URL(`http://${host}`).hostname;
  } catch { return false; }
}

function limited(key: string): boolean {
  const now = Date.now();
  const window = (hits.get(key) ?? []).filter(time => now - time < 60000);
  if (window.length >= 10) { hits.set(key, window); return true; }
  window.push(now); hits.set(key, window); return false;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'origin' }, { status: 403, headers });
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 20480) return NextResponse.json({ error: 'invalid' }, { status: 413, headers });
    let body: unknown;
    try { body = JSON.parse(await request.text()); } catch { return NextResponse.json({ error: 'invalid' }, { status: 400, headers }); }
    const input = body as { skills?: unknown; minMatch?: unknown; city?: unknown; fresher?: unknown };
    if (!Array.isArray(input.skills)) return NextResponse.json({ error: 'invalid' }, { status: 400, headers });
    if (limited(request.headers.get('x-forwarded-for') ?? 'local')) return NextResponse.json({ error: 'rate_limit' }, { status: 429, headers });
    const skills: SkillInput[] = input.skills
      .filter((skill): skill is { name: string; topicOnly?: boolean } =>
        typeof skill === 'object' && skill !== null && typeof (skill as { name?: unknown }).name === 'string')
      .map(skill => ({ name: canonicalSkill(skill.name)?.name ?? skill.name, topicOnly: skill.topicOnly === true }))
      .slice(0, 200);
    const filters = {
      minMatch: typeof input.minMatch === 'number' && Number.isFinite(input.minMatch) ? input.minMatch : 0,
      city: typeof input.city === 'string' ? input.city.slice(0, 60) : '',
      fresher: input.fresher === true,
    };
    const ranked = rankJobs(skills, filters);
    return NextResponse.json({ ...ranked, ingested: jobCount() }, { headers });
  } catch {
    return NextResponse.json({ error: 'storage' }, { status: 503, headers });
  }
}
