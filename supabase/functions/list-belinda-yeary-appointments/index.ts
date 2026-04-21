// One-off helper: list all GHL appointments for Belinda Yeary's contact
// to identify the new Apr 23 event after the original was deleted in GHL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

const CONTACT_ID = 'jvWBldD5oWJEJJgQ21lY';
const LOCATION_ID = '9qcQctq3qbKJfJgtB6xL';
const PROJECT_NAME = 'Apex Vascular';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: project } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', PROJECT_NAME)
      .single();

    if (!project?.ghl_api_key) {
      return new Response(JSON.stringify({ error: 'No GHL API key' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = project.ghl_api_key;

    // Try contact-level appointments endpoint
    const url = `${GHL_BASE_URL}/contacts/${CONTACT_ID}/appointments`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: GHL_API_VERSION,
        Accept: 'application/json',
      },
    });
    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }

    return new Response(JSON.stringify({
      status: r.status,
      locationId: LOCATION_ID,
      contactId: CONTACT_ID,
      data,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
