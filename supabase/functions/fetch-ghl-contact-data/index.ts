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

    // First, we need to get the custom field definitions to map IDs to keys
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('ghl_api_key, ghl_location_id')
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
    const ghlLocationId = projectData.ghl_location_id;
    
    if (!ghlLocationId) {
      return new Response(
        JSON.stringify({ error: 'GHL location ID not configured for this project' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    let contactId = appointment.ghl_id;
    let locationId: string | null = null;

    // If we have a GHL appointment id, fetch it to derive the true contactId and locationId
    if (appointment.ghl_appointment_id) {
      console.log('Fetching GHL appointment to derive contact and location...');
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
      console.log('GHL Appointment Response:', JSON.stringify(apptData, null, 2));

      const appt = apptData.appointment ?? apptData;
      const extractedContactId = appt?.contactId || appt?.contact_id || appt?.contact?.id || null;
      locationId = appt?.locationId || appt?.location_id || appt?.location?.id || null;

      if (extractedContactId) {
        // Update DB if different or missing
        if (appointment.ghl_id !== extractedContactId) {
          await supabase
            .from('all_appointments')
            .update({ ghl_id: extractedContactId })
            .eq('id', appointmentId);
          console.log(`Updated appointment with contact ID from appt: ${extractedContactId}`);
        }
        contactId = extractedContactId;
      }
    }

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'No contact ID available for this appointment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // First, fetch custom field definitions to map IDs to names
    console.log(`Fetching custom field definitions for location: ${ghlLocationId}`);
    const customFieldDefsRes = await fetch(`${GHL_BASE_URL}/locations/${ghlLocationId}/customFields`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    });

    const customFieldDefs: Record<string, string> = {};
    if (customFieldDefsRes.ok) {
      const defsData = await customFieldDefsRes.json();
      const defs = defsData.customFields || [];
      defs.forEach((def: any) => {
        if (def.id && def.name) {
          customFieldDefs[def.id] = def.name;
        }
      });
      console.log(`Loaded ${Object.keys(customFieldDefs).length} custom field definitions`);
    }

    // Fetch contact details with custom fields
    console.log(`Fetching contact details for: ${contactId}`);
    const contactRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
        ...(locationId ? { 'LocationId': locationId } : {}),
      },
    });

    if (!contactRes.ok) {
      const errorText = await contactRes.text();
      console.error('GHL API error fetching contact:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contact from GHL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const contactData = await contactRes.json();
    const contact = (contactData.contact ?? contactData);

    if (!contact) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contact from GHL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract insurance card URL if available
    const insuranceCardUrl = extractInsuranceCardUrl(contact);

    // Format custom fields, mapping IDs to names
    const rawCustomFields = contact.customFields || [];
    
    const customFields = rawCustomFields.map((field: any) => ({
      id: field.id,
      key: customFieldDefs[field.id] || field.key || `Unknown Field (${field.id})`,
      value: field.field_value ?? field.value,
    })).filter(f => f.value); // Only include fields with values

    console.log(`Successfully fetched ${customFields.length} custom fields for ${contact.firstName} ${contact.lastName}`);

    // Format custom fields into structured text for patient intake notes
    const formatCustomFieldsToText = (fields: any[]): string => {
      const sections: Record<string, string[]> = {
        'Contact Information': [],
        'Insurance Information': [],
        'Pathology Information': [],
        'Medical Information': []
      };

      fields.forEach(field => {
        // Skip fields without a key
        if (!field.key) {
          console.log('Skipping field without key:', JSON.stringify(field));
          return;
        }
        
        const key = field.key.toLowerCase();
        const value = Array.isArray(field.value) 
          ? field.value.join(', ') 
          : typeof field.value === 'object' && field.value !== null
            ? JSON.stringify(field.value)
            : (field.value || 'Not provided');

        const formattedLine = `${field.key}: ${value}`;

        // Categorize fields - skip conversation notes and workflow fields
        if (key.includes('insurance') || key.includes('member') || key.includes('group') || key.includes('policy')) {
          sections['Insurance Information'].push(formattedLine);
        } else if (key.includes('step') || key.includes('pain') || key.includes('symptom') || key.includes('condition') || key.includes('diagnosis') || key.includes('affected') || key.includes('duration') || key.includes('treat')) {
          sections['Pathology Information'].push(formattedLine);
        } else if ((key === 'notes' || key.startsWith('notes ') || key.startsWith('notes_') || key.startsWith('notes(')) &&
                   !key.includes('conversation')) {
          sections['Insurance Information'].push(formattedLine);
        } else if (key.includes('medication') || key.includes('allerg') || key.includes('medical') || key.includes('pcp') || key.includes('doctor') || key.includes('imaging') || key.includes('xray') || key.includes('x-ray') || key.includes('mri') || key.includes('ct scan')) {
          sections['Medical Information'].push(formattedLine);
        } else if (key.includes('phone') || key.includes('email') || key.includes('address') || key.includes('contact') || key.includes('name') || key.includes('dob') || key.includes('date of birth')) {
          sections['Contact Information'].push(formattedLine);
        }
        // Skip all other fields (conversation notes, tracking data, workflow fields, etc.)
      });

      // Build formatted text
      let formattedText = '=== GHL Contact Data ===\n\n';
      
      Object.entries(sections).forEach(([section, lines]) => {
        if (lines.length > 0) {
          formattedText += `${section}:\n`;
          lines.forEach(line => {
            formattedText += `  ${line}\n`;
          });
          formattedText += '\n';
        }
      });

      return formattedText;
    };

    const formattedNotes = formatCustomFieldsToText(customFields);

    // Get current patient intake notes
    const currentNotes = appointment.patient_intake_notes || '';
    
    // Append or set the formatted GHL data to patient_intake_notes
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n${formattedNotes}`
      : formattedNotes;

    // Update the appointment with the formatted notes
    const { error: updateError } = await supabase
      .from('all_appointments')
      .update({ 
        patient_intake_notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Failed to update patient intake notes:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update patient intake notes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Successfully updated patient intake notes with GHL data');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'GHL contact data added to patient intake notes',
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
        },
        fieldsCount: customFields.length,
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
