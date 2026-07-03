import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const ALLOWED_HOSTS = new Set([
  'services.leadconnectorhq.com',
  'storage.googleapis.com',
]);

function isAllowed(url: URL): boolean {
  if (ALLOWED_HOSTS.has(url.hostname)) return true;
  // Own Supabase storage
  if (url.hostname.endsWith('.supabase.co')) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const raw = new URL(req.url).searchParams.get('url');
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Missing url param' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (target.protocol !== 'https:' || !isAllowed(target)) {
      return new Response(JSON.stringify({ error: 'Host not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${upstream.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('fetch-insurance-image error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
