// TEMPORARY: self-test harness for controlhub-ticket-webhook. Delete after verification.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const secret = Deno.env.get('CONTROLHUB_WEBHOOK_SECRET') ?? '';
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/controlhub-ticket-webhook`;

  const body = await req.json().catch(() => ({}));
  const payload = (body as any).payload ?? {};
  const useBadSecret = (body as any).bad_secret === true;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': useBadSecret ? 'not-the-secret' : secret,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
