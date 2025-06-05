
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdSpendData {
  date: string;
  project_name: string;
  spend: number;
  campaign_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await req.json();
    console.log('Received ad spend data:', body);

    // Validate required fields
    if (!body.date || !body.project_name || body.spend === undefined) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: date, project_name, and spend are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid date format. Use YYYY-MM-DD format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate spend is a number
    const spend = parseFloat(body.spend);
    if (isNaN(spend)) {
      return new Response(
        JSON.stringify({ 
          error: 'Spend must be a valid number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate that the project exists in the projects table
    const { data: projectExists, error: projectError } = await supabase
      .from('projects')
      .select('project_name')
      .eq('project_name', body.project_name)
      .single();

    if (projectError || !projectExists) {
      return new Response(
        JSON.stringify({ 
          error: `Project '${body.project_name}' does not exist. Please use an existing project name.` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const adSpendData: AdSpendData = {
      date: body.date,
      project_name: body.project_name,
      spend: spend,
      campaign_name: body.campaign_name || null
    };

    // Insert the ad spend data (no longer using upsert, allowing multiple records per day)
    const { data, error } = await supabase
      .from('facebook_ad_spend')
      .insert({
        date: adSpendData.date,
        project_name: adSpendData.project_name,
        spend: adSpendData.spend,
        campaign_name: adSpendData.campaign_name,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save ad spend data',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully saved ad spend data:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Ad spend data saved successfully',
        data: data[0]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
