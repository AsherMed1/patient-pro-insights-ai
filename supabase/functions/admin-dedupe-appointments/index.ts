import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Service role client bypasses RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { project_name, lead_name, keep_id } = await req.json()

    if (!project_name || !lead_name || !keep_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_name, lead_name, keep_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🧹 Starting deduplication for ${lead_name} in ${project_name}, keeping ${keep_id}`)

    // Get all duplicate IDs (excluding the one to keep)
    const { data: duplicates, error: fetchError } = await supabase
      .from('all_appointments')
      .select('id')
      .eq('project_name', project_name)
      .eq('lead_name', lead_name)
      .neq('id', keep_id)

    if (fetchError) {
      console.error('❌ Error fetching duplicates:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!duplicates || duplicates.length === 0) {
      console.log('✅ No duplicates found')
      return new Response(
        JSON.stringify({ success: true, deletedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${duplicates.length} duplicates to delete`)

    const duplicateIds = duplicates.map(r => r.id)
    let deletedCount = 0

    // Delete in batches of 50
    for (let i = 0; i < duplicateIds.length; i += 50) {
      const batch = duplicateIds.slice(i, i + 50)
      const { error: deleteError } = await supabase
        .from('all_appointments')
        .delete()
        .in('id', batch)

      if (deleteError) {
        console.error(`❌ Error deleting batch ${Math.floor(i / 50) + 1}:`, deleteError)
      } else {
        deletedCount += batch.length
        console.log(`✅ Deleted batch ${Math.floor(i / 50) + 1}: ${batch.length} records`)
      }
    }

    console.log(`🎉 Cleanup complete! Deleted ${deletedCount} duplicates`)

    return new Response(
      JSON.stringify({ success: true, deletedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
