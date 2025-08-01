import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for records that need parsing
    const { data: appointmentsNeedingParsing, error: apptError } = await supabase
      .from('all_appointments')
      .select('id, patient_intake_notes, lead_name, project_name')
      .is('parsing_completed_at', null)
      .not('patient_intake_notes', 'is', null)
      .neq('patient_intake_notes', '')
      .limit(5); // Process in batches

    if (apptError) {
      console.error('Error fetching appointments:', apptError);
    }

    const { data: leadsNeedingParsing, error: leadError } = await supabase
      .from('new_leads')
      .select('id, patient_intake_notes, lead_name, project_name')
      .is('parsing_completed_at', null)
      .not('patient_intake_notes', 'is', null)
      .neq('patient_intake_notes', '')
      .limit(5); // Process in batches

    if (leadError) {
      console.error('Error fetching leads:', leadError);
    }

    const allRecordsToProcess = [
      ...(appointmentsNeedingParsing || []).map(r => ({...r, table: 'all_appointments'})),
      ...(leadsNeedingParsing || []).map(r => ({...r, table: 'new_leads'}))
    ];

    console.log(`Found ${allRecordsToProcess.length} records needing parsing`);

    let processed = 0;
    let errors = 0;

    for (const record of allRecordsToProcess) {
      try {
        const systemPrompt = `You are a medical intake data parser. Your task is to extract and categorize information from patient intake notes into specific sections.

Parse the following patient intake notes and return a JSON object with these exact fields:
{
  "insurance_info": {
    "provider": "string or null",
    "plan": "string or null", 
    "id": "string or null",
    "group_number": "string or null"
  },
  "contact_info": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "dob": "string or null"
  },
  "demographics": {
    "age": "string or null",
    "gender": "string or null"
  },
  "pathology_info": {
    "primary_complaint": "string or null",
    "symptoms": "string or null",
    "pain_level": "string or null",
    "affected_area": "string or null",
    "duration": "string or null",
    "previous_treatments": "string or null"
  },
  "medical_info": {
    "pcp": "string or null",
    "imaging": "string or null",
    "medications": "string or null",
    "allergies": "string or null"
  }
}

IMPORTANT: Return ONLY the JSON object, no other text. If information is not found, use null for that field.`;

        const userPrompt = `Patient Intake Notes:\n\n${record.patient_intake_notes}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const parsedContent = aiResponse.choices[0]?.message?.content;

        if (!parsedContent) {
          throw new Error('No content returned from AI');
        }

        // Parse the JSON response
        let parsedData;
        try {
          parsedData = JSON.parse(parsedContent);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parsedContent);
          throw new Error('Invalid JSON returned from AI');
        }

        // Update the database with parsed information
        const updateData = {
          parsed_insurance_info: parsedData.insurance_info,
          parsed_pathology_info: parsedData.pathology_info,
          parsed_contact_info: parsedData.contact_info,
          parsed_demographics: parsedData.demographics,
          parsing_completed_at: new Date().toISOString()
        };

        if (parsedData.medical_info) {
          updateData.parsed_contact_info = {
            ...updateData.parsed_contact_info,
            medical_info: parsedData.medical_info
          };
        }

        const { error: updateError } = await supabase
          .from(record.table)
          .update(updateData)
          .eq('id', record.id);

        if (updateError) {
          console.error(`Failed to update ${record.table} ${record.id}:`, updateError);
          errors++;
        } else {
          console.log(`Successfully parsed and updated ${record.table} ${record.id} for ${record.lead_name}`);
          processed++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing ${record.table} ${record.id}:`, error);
        errors++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      errors,
      total: allRecordsToProcess.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Auto-parse function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});