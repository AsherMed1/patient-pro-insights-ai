import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  ghl_contact_id?: string;
  project_name?: string;
  ghl_api_key?: string;
  note?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const ghlContactId = (body.ghl_contact_id || '').trim();
    const note = (body.note || '').trim();

    if (!ghlContactId || !note) {
      return new Response(
        JSON.stringify({ error: 'ghl_contact_id and note are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (note.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'note exceeds 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let apiKey = body.ghl_api_key;
    if (!apiKey && body.project_name) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') as string,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
      );
      const { data: project } = await supabase
        .from('projects')
        .select('ghl_api_key')
        .eq('project_name', body.project_name)
        .maybeSingle();
      apiKey = project?.ghl_api_key ?? undefined;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'No GHL API key configured for this project' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghlContactId}/notes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ body: note }),
      },
    );

    const text = await res.text();
    if (!res.ok) {
      console.error(`GHL note create failed [${res.status}]: ${text}`);
      return new Response(
        JSON.stringify({ error: 'GHL note create failed', status: res.status, details: text }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`✅ GHL contact note added for ${ghlContactId}`);
    return new Response(
      JSON.stringify({ success: true, response: text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('add-ghl-contact-note error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
