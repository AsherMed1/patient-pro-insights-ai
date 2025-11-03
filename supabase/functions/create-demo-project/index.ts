import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Create Demo Project function started')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action } = await req.json()

    if (action === 'create') {
      // Create the PPM - Test Account project
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .upsert({ 
          project_name: 'PPM - Test Account',
          active: true,
          timezone: 'America/Chicago'
        }, { 
          onConflict: 'project_name',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (projectError && projectError.code !== '23505') {
        throw projectError
      }

      // Create demo leads (simplified set)
      const demoLeads = []
      const names = [
        ['John', 'Demo'], ['Sarah', 'Sample'], ['Mike', 'Testing'],
        ['Jane', 'Example'], ['Tom', 'Practice'], ['Lisa', 'Dummy'],
        ['Robert', 'Fake'], ['Emily', 'Mock'], ['David', 'Placeholder'],
        ['Jennifer', 'Trial']
      ]

      const insuranceProviders = ['Aetna', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Medicare', 'Humana', 'Cigna']
      const statuses = ['New', 'Contacted', 'Qualified', 'Scheduled', 'Not Interested']

      for (let i = 0; i < 75; i++) {
        const nameIndex = i % names.length
        const [firstName, lastName] = names[nameIndex]
        const leadNumber = String(i + 1).padStart(3, '0')
        
        demoLeads.push({
          project_name: 'PPM - Test Account',
          lead_name: `${firstName} ${lastName} ${i > 9 ? leadNumber : ''}`.trim(),
          first_name: firstName,
          last_name: `${lastName} ${i > 9 ? leadNumber : ''}`.trim(),
          phone_number: `+1555555${String(i + 1).padStart(4, '0')}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 9 ? leadNumber : ''}@demo.ppm-example.com`,
          date: new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          status: statuses[i % statuses.length],
          insurance_provider: insuranceProviders[i % insuranceProviders.length],
          insurance_plan: i % 2 === 0 ? 'PPO' : 'HMO',
          dob: new Date(1960 + (i % 20), (i % 12), 1 + (i % 28)).toISOString().split('T')[0],
          address: `${100 + i} Demo St, Test City, TX 750${String(i % 100).padStart(2, '0')}`,
          patient_intake_notes: 'Demo patient with vascular concerns.',
          contact_id: `demo_contact_${leadNumber}`,
          times_called: i % 8
        })
      }

      const { error: leadsError } = await supabaseClient
        .from('new_leads')
        .insert(demoLeads)

      if (leadsError) console.error('Leads error:', leadsError)

      // Create demo appointments
      const demoAppointments = []
      
      // 10 future appointments
      for (let i = 0; i < 10; i++) {
        const lead = demoLeads[i]
        demoAppointments.push({
          project_name: 'PPM - Test Account',
          date_appointment_created: new Date(Date.now() + ((i + 5) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          lead_name: lead.lead_name,
          lead_phone_number: lead.phone_number,
          lead_email: lead.email,
          date_of_appointment: new Date(Date.now() + ((i + 5) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          requested_time: `${9 + (i % 8)}:${i % 2 === 0 ? '00' : '30'}`,
          status: i % 3 === 0 ? null : 'Confirmed',
          dob: lead.dob,
          detected_insurance_provider: lead.insurance_provider,
          detected_insurance_plan: lead.insurance_plan,
          patient_intake_notes: 'Upcoming appointment for vascular consultation.',
          procedure_ordered: false,
          was_ever_confirmed: i % 3 !== 0,
          internal_process_complete: false,
          ghl_appointment_id: `demo_appt_${String(i + 1).padStart(3, '0')}`
        })
      }

      // 35 past appointments with varied statuses
      const pastStatuses = [
        { status: 'Showed', procedure: true, count: 12 },
        { status: 'Won', procedure: true, count: 5 },
        { status: 'Showed', procedure: false, count: 4 },
        { status: 'No Show', procedure: false, count: 8 },
        { status: 'Cancelled', procedure: false, count: 4 },
        { status: 'OON', procedure: false, count: 2 }
      ]

      let apptIndex = 10
      for (const statusGroup of pastStatuses) {
        for (let j = 0; j < statusGroup.count; j++) {
          const lead = demoLeads[apptIndex % demoLeads.length]
          demoAppointments.push({
            project_name: 'PPM - Test Account',
            date_appointment_created: new Date(Date.now() - ((apptIndex - 9) * 2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            lead_name: lead.lead_name,
            lead_phone_number: lead.phone_number,
            lead_email: lead.email,
            date_of_appointment: new Date(Date.now() - ((apptIndex - 9) * 2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            requested_time: `${9 + (apptIndex % 8)}:${apptIndex % 2 === 0 ? '00' : '30'}`,
            status: statusGroup.status,
            dob: lead.dob,
            detected_insurance_provider: lead.insurance_provider,
            detected_insurance_plan: lead.insurance_plan,
            patient_intake_notes: `Demo appointment - ${statusGroup.status}`,
            procedure_ordered: statusGroup.procedure,
            was_ever_confirmed: statusGroup.status === 'Showed' || statusGroup.status === 'Won',
            internal_process_complete: statusGroup.procedure,
            ghl_appointment_id: `demo_appt_${String(apptIndex + 1).padStart(3, '0')}`
          })
          apptIndex++
        }
      }

      const { error: appointmentsError } = await supabaseClient
        .from('all_appointments')
        .insert(demoAppointments)

      if (appointmentsError) console.error('Appointments error:', appointmentsError)

      // Create demo call records
      const demoCalls = []
      const agents = ['Demo Agent Alpha', 'Demo Agent Beta', 'Training Agent', 'Sample Rep', 'Demo Agent Gamma']
      const callStatuses = ['completed', 'no-answer', 'voicemail', 'busy']

      for (let i = 0; i < 100; i++) {
        const lead = demoLeads[i % demoLeads.length]
        const daysAgo = i
        const callDate = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000))
        const callDateTime = new Date(callDate.setHours(9 + (i % 8), (i % 4) * 15, 0, 0))
        
        demoCalls.push({
          project_name: 'PPM - Test Account',
          lead_name: lead.lead_name,
          lead_phone_number: lead.phone_number,
          agent: agents[i % agents.length],
          date: callDate.toISOString().split('T')[0],
          call_datetime: callDateTime.toISOString(),
          direction: i % 3 === 0 ? 'inbound' : 'outbound',
          status: callStatuses[i % 4],
          duration_seconds: callStatuses[i % 4] === 'completed' ? 180 + (i % 600) : 15 + (i % 30),
          recording_url: i % 3 === 0 ? `https://demo.recordings.example.com/call_${String(i + 1).padStart(3, '0')}` : null,
          call_summary: callStatuses[i % 4] === 'completed' ? 'Demo call - patient inquiry about vascular services.' : null,
          ghl_id: `demo_call_${String(i + 1).padStart(3, '0')}`
        })
      }

      const { error: callsError } = await supabaseClient
        .from('all_calls')
        .insert(demoCalls)

      if (callsError) console.error('Calls error:', callsError)

      // Create ad spend data (last 60 days)
      const adSpend = []
      const campaigns = [
        'Demo Campaign - Varicose Veins',
        'Demo Campaign - Knee Pain',
        'Demo Campaign - General Vascular'
      ]

      for (let i = 0; i < 60; i++) {
        adSpend.push({
          project_name: 'PPM - Test Account',
          date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          campaign_name: campaigns[i % campaigns.length],
          spend: 150 + Math.random() * 75
        })
      }

      const { error: adSpendError } = await supabaseClient
        .from('facebook_ad_spend')
        .insert(adSpend)

      if (adSpendError) console.error('Ad spend error:', adSpendError)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Demo project "PPM - Test Account" created successfully',
          stats: {
            leads: demoLeads.length,
            appointments: demoAppointments.length,
            calls: demoCalls.length,
            adSpendRecords: adSpend.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'delete') {
      // Delete all demo data
      await supabaseClient.from('facebook_ad_spend').delete().eq('project_name', 'PPM - Test Account')
      await supabaseClient.from('all_calls').delete().eq('project_name', 'PPM - Test Account')
      await supabaseClient.from('all_appointments').delete().eq('project_name', 'PPM - Test Account')
      await supabaseClient.from('new_leads').delete().eq('project_name', 'PPM - Test Account')
      await supabaseClient.from('projects').delete().eq('project_name', 'PPM - Test Account')

      return new Response(
        JSON.stringify({ success: true, message: 'Demo project data deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "create" or "delete"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-demo-project:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
