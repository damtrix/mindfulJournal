import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clientCache: SupabaseClient | null = null;

async function fetchClientConfig(): Promise<{ url: string; anon: string }> {
  // If running on the server, read env directly (no build-time inlining).
  if (typeof window === 'undefined') {
    const url = process.env.SUPABASE_URL || process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !anon)
      throw new Error('Missing Supabase environment variables on server');
    return { url, anon };
  }

  // Browser: fetch runtime config from server API so values are not embedded at build time
  const res = await fetch('/api/supabase-config');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Could not fetch Supabase config');
  }
  const json = await res.json();
  return { url: json.url, anon: json.anon };
}

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (clientCache) return clientCache;
  const { url, anon } = await fetchClientConfig();
  clientCache = createClient(url, anon);
  return clientCache;
}
