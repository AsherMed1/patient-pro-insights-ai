/**
 * release-block-incident-dnd
 *
 * Scheduled (or on-demand) sweep that finds rows in `pending_dnd_releases`
 * whose `release_at` has passed and `released_at` is still null, and turns
 * DND back off on the corresponding GHL contacts. Idempotent — failures
 * increment `release_attempts` and store `last_error` for retry.
 *
 * Recommended cadence: every 15 minutes via pg_cron.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PER_RUN = 100;
const MAX_ATTEMPTS = 5;

async function disableDnd(apiKey: string, contactId: string) {
  const r = await fetch(
    `https://services.leadconnectorhq.com/contacts/${contactId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-04-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dnd: false,
        dndSettings: {
          Email: { status: 'inactive' },
          SMS: { status: 'inactive' },
          WhatsApp: { status: 'inactive' },
        },
      }),
    }
  );
  return { ok: r.ok, status: r.status };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: due, error } = await supabase
      .from('pending_dnd_releases')
      .select('id, ghl_contact_id, project_name, release_attempts')
      .is('released_at', null)
      .lte('release_at', new Date().toISOString())
      .lt('release_attempts', MAX_ATTEMPTS)
      .order('release_at', { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) {
      throw error;
    }

    let released = 0;
    let failed = 0;
    const credCache = new Map<string, string | null>();

    for (const row of due || []) {
      let apiKey = credCache.get((row as any).project_name);
      if (apiKey === undefined) {
        const { data: project } = await supabase
          .from('projects')
          .select('ghl_api_key')
          .eq('project_name', (row as any).project_name)
          .single();
        apiKey = (project as any)?.ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY') || null;
        credCache.set((row as any).project_name, apiKey);
      }

      if (!apiKey) {
        await supabase.from('pending_dnd_releases').update({
          release_attempts: ((row as any).release_attempts || 0) + 1,
          last_error: 'no GHL API key for project',
        }).eq('id', (row as any).id);
        failed++;
        continue;
      }

      const result = await disableDnd(apiKey, (row as any).ghl_contact_id);
      if (result.ok) {
        await supabase.from('pending_dnd_releases').update({
          released_at: new Date().toISOString(),
        }).eq('id', (row as any).id);
        released++;
      } else {
        await supabase.from('pending_dnd_releases').update({
          release_attempts: ((row as any).release_attempts || 0) + 1,
          last_error: `GHL HTTP ${result.status}`,
        }).eq('id', (row as any).id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: (due || []).length, released, failed }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[release-dnd] fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
