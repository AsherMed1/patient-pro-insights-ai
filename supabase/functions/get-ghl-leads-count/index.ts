import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

interface GHLSearchResponse {
  contacts: any[];
  total?: number;
  count?: number;
  meta?: {
    total: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { project_name, start_date, end_date } = await req.json();

    if (!project_name) {
      return new Response(
        JSON.stringify({ error: 'project_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching GHL leads count for:', { project_name, start_date, end_date });

    // Fetch project configuration
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('ghl_location_id, ghl_api_key')
      .eq('project_name', project_name)
      .eq('active', true)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!project.ghl_location_id || !project.ghl_api_key) {
      return new Response(
        JSON.stringify({ 
          error: 'Project missing GHL configuration',
          ghl_count: null,
          db_count: null,
          source: 'config_missing'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build GHL search filters
    const filters: any[] = [];
    
    if (start_date && end_date) {
      filters.push({
        field: 'dateAdded',
        operator: 'between',
        value: {
          start: start_date,
          end: end_date
        }
      });
    } else if (start_date) {
      filters.push({
        field: 'dateAdded',
        operator: 'gte',
        value: start_date
      });
    } else if (end_date) {
      filters.push({
        field: 'dateAdded',
        operator: 'lte',
        value: end_date
      });
    }

    // Call GHL API
    const ghlResponse = await fetch(`${GHL_BASE_URL}/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${project.ghl_api_key}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: project.ghl_location_id,
        filters: filters.length > 0 ? filters : undefined,
        limit: 1 // We only need the count
      })
    });

    if (!ghlResponse.ok) {
      const errorText = await ghlResponse.text();
      console.error('GHL API error:', ghlResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from GoHighLevel',
          details: errorText,
          ghl_count: null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ghlData: GHLSearchResponse = await ghlResponse.json();
    const ghlCount = ghlData.total || ghlData.count || ghlData.meta?.total || 0;

    console.log('GHL leads count:', ghlCount);

    // Also get database count for comparison
    let dbQuery = supabase
      .from('new_leads')
      .select('id', { count: 'exact', head: true })
      .eq('project_name', project_name);

    if (start_date) {
      dbQuery = dbQuery.gte('date', start_date);
    }
    if (end_date) {
      dbQuery = dbQuery.lte('date', end_date);
    }

    const { count: dbCount } = await dbQuery;

    return new Response(
      JSON.stringify({
        success: true,
        ghl_count: ghlCount,
        db_count: dbCount || 0,
        project_name,
        date_range: { start_date, end_date },
        source: 'ghl_api',
        fetched_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-ghl-leads-count:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        ghl_count: null,
        db_count: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
