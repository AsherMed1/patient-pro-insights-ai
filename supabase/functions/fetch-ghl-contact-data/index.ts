import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchGHLContact, extractInsuranceCardUrl } from '../_shared/ghl-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { appointmentId } = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: 'appointmentId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Fetching GHL contact data for appointment: ${appointmentId}`);

    // Get appointment details
    const { data: appointment, error: apptError } = await supabase
      .from('all_appointments')
      .select('id, ghl_appointment_id, ghl_id, project_name, lead_name')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      console.error('Appointment not found:', apptError);
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get GHL API key for this project
    const { data: projectData, error: projectError } = await supabase
      .from('ghl_subaccounts')
      .select('ghl_api_key')
      .eq('project_name', appointment.project_name)
      .single();

    if (projectError || !projectData?.ghl_api_key) {
      console.error('GHL API key not found for project:', projectError);
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured for this project' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const ghlApiKey = projectData.ghl_api_key;
    let contactId = appointment.ghl_id;

    // If no contact ID, fetch it from the GHL appointment
    if (!contactId && appointment.ghl_appointment_id) {
      console.log('No contact ID found, fetching from GHL appointment...');
      
      const apptResponse = await fetch(
        `${GHL_BASE_URL}/calendars/events/appointments/${appointment.ghl_appointment_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Version': GHL_API_VERSION,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!apptResponse.ok) {
        const errorText = await apptResponse.text();
        console.error('Failed to fetch GHL appointment:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch GHL appointment details' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const apptData = await apptResponse.json();
      contactId = apptData.contactId;

      if (contactId) {
        // Update the database with the contact ID
        await supabase
          .from('all_appointments')
          .update({ ghl_id: contactId })
          .eq('id', appointmentId);
        
        console.log(`Updated appointment with contact ID: ${contactId}`);
      }
    }

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'No contact ID available for this appointment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch contact details with custom fields
    console.log(`Fetching contact details for: ${contactId}`);
    const contact = await fetchGHLContact(contactId, ghlApiKey);

    if (!contact) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contact from GHL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract insurance card URL if available
    const insuranceCardUrl = extractInsuranceCardUrl(contact);

    // Format custom fields for easy display
    const customFields = contact.customFields?.map(field => ({
      id: field.id,
      key: field.key,
      value: field.field_value,
    })) || [];

    console.log(`Successfully fetched ${customFields.length} custom fields for ${contact.firstName} ${contact.lastName}`);

    return new Response(
      JSON.stringify({
        success: true,
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
        },
        customFields,
        insuranceCardUrl,
        contactIdWasUpdated: !appointment.ghl_id && !!contactId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
