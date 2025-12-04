import { NextResponse } from 'next/server';

// This route returns runtime Supabase config. It includes two optional protections:
// 1) Same-origin check: set `SITE_ORIGIN` to your canonical origin (https://example.com)
//    and requests with a mismatched `Origin` header will be rejected.
// 2) Secret header: set `SUPABASE_CONFIG_SECRET` in server env and include
//    `x-supabase-config-secret` with that value in requests to allow access.
// NOTE: If you set the secret, the client cannot safely know it unless you
// provide it via a server-rendered page or other server flow. Use the secret
// option only for server-to-server calls or advanced flows.

export async function GET(req: Request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    return NextResponse.json(
      { error: 'Supabase URL not configured' },
      { status: 500 }
    );
  }

  // Protect by default: unless the operator configures SITE_ORIGIN or a secret,
  // do not return the anon key. This prevents accidental exposure on an open endpoint.
  const siteOrigin = process.env.SITE_ORIGIN; // e.g. https://yourdomain.com
  const secret = process.env.SUPABASE_CONFIG_SECRET; // optional server-only secret

  // If neither protection is configured, refuse to return the anon key.
  if (!siteOrigin && !secret) {
    return NextResponse.json({
      url,
      anon: null,
      warning:
        'Endpoint protected by default. Set SITE_ORIGIN or SUPABASE_CONFIG_SECRET to allow fetching anon key.',
    });
  }

  // Check same-origin if SITE_ORIGIN is set
  const origin =
    req.headers.get('origin') || req.headers.get('referer') || null;
  if (siteOrigin) {
    if (!origin) {
      return NextResponse.json(
        { error: 'Forbidden (missing origin)' },
        { status: 403 }
      );
    }
    const normalize = (s: string) => s.replace(/\/$/, '');
    if (normalize(origin) !== normalize(siteOrigin)) {
      return NextResponse.json(
        { error: 'Forbidden (origin mismatch)' },
        { status: 403 }
      );
    }
  }

  // If a secret is configured, require it (useful for server-to-server calls).
  if (secret) {
    const header = req.headers.get('x-supabase-config-secret');
    if (!header || header !== secret) {
      return NextResponse.json(
        { error: 'Forbidden (missing secret)' },
        { status: 403 }
      );
    }
  }

  // Authorized: return both url and anon.
  return NextResponse.json({ url, anon });
}
