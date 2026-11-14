import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { analyze, ScanError } from '@/lib/github';
import { receipts, saveReceipt, deleteReceipts } from '@/lib/store';
import { cachedExtraction, revisionFor, saveExtraction } from '@/lib/cache';
import { graphConfigured, initGraph, ingestProfile } from '@/lib/graph';
import { normalizeEvidence } from '@/lib/skills';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, private' };
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
function sessionFor(request: NextRequest) {
  const value = request.cookies.get('skillora_session')?.value;
  return value && /^[a-f0-9-]{36}$/.test(value) ? value : undefined;
}
export async function GET(request: NextRequest) {
  try { const session = sessionFor(request); return NextResponse.json({ receipts: session ? receipts(session) : [] }, { headers }); }
  catch { return NextResponse.json({ error: 'storage' }, { status: 503, headers }); }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'origin' }, { status: 403, headers });
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 1024) return NextResponse.json({ error: 'invalid' }, { status: 413, headers });
    let input: unknown;
    try { input = JSON.parse(await request.text()); } catch { throw new ScanError('invalid', 400); }
    const username = typeof input === 'object' && input !== null && 'username' in input && typeof input.username === 'string' ? input.username.trim() : '';
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username) || username.includes('--')) throw new ScanError('invalid', 400);
    const session = sessionFor(request) ?? randomUUID();
    if (receipts(session).filter(r => Date.now() - Date.parse(r.created_at) < 60000).length >= 5) throw new ScanError('rate_limit', 429);
    const profile = await analyze(username);
    const revision = revisionFor(profile.repos);
    const cached = cachedExtraction(username, revision);
    if (cached) {
      profile.normalized = cached;
    } else {
      profile.normalized = normalizeEvidence(profile.repos);
      saveExtraction(username, revision, profile.normalized);
    }
    let graph: 'synced' | 'unavailable' = 'unavailable';
    if (graphConfigured()) {
      try { await initGraph(); await ingestProfile(profile); graph = 'synced'; } catch { /* the graph is supplementary; the scan itself succeeded */ }
    }
    saveReceipt(session, profile.repos.length, profile.normalized.length);
    const response = NextResponse.json({ profile, graph }, { headers });
    response.cookies.set('skillora_session', session, { httpOnly: true, sameSite: 'lax', secure: request.headers.get('x-forwarded-proto') === 'https' || request.nextUrl.protocol === 'https:', maxAge: 3600, path: '/' });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof ScanError ? error.code : 'storage' }, { status: error instanceof ScanError ? error.status : 503, headers });
  }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'origin' }, { status: 403, headers });
  try { const session = sessionFor(request); if (session) deleteReceipts(session); return NextResponse.json({ deleted: true }, { headers }); }
  catch { return NextResponse.json({ error: 'storage' }, { status: 503, headers }); }
}
