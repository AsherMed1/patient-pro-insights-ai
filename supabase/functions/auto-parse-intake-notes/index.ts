import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize DOB string to YYYY-MM-DD format or return null
function normalizeDob(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  
  // Strip ordinal suffixes (1st, 2nd, 3rd, 4th) and commas
  const cleaned = raw.replace(/(\d+)(st|nd|rd|th)/gi, '$1').replace(/,/g, '').trim();
  
  // Try parsing with various formats
  const formats = [
    // Month name formats
    /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/, // Sep 20 1954
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/, // 20 Sep 1954
    // Numeric formats
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // 9/20/1954 or 09/20/1954
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // 1954-09-20
  ];
  
  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      try {
        let year: number, month: number, day: number;
        
        if (format.source.includes('[A-Za-z]')) {
          // Month name format
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthStr = match[1].toLowerCase().substring(0, 3);
          const monthIdx = monthNames.indexOf(monthStr);
          
          if (monthIdx === -1) continue;
          
          if (match[1].match(/[A-Za-z]/)) {
            // Format: Month Day Year
            month = monthIdx + 1;
            day = parseInt(match[2]);
            year = parseInt(match[3]);
          } else {
            // Format: Day Month Year
            day = parseInt(match[1]);
            const monthStr2 = match[2].toLowerCase().substring(0, 3);
            const monthIdx2 = monthNames.indexOf(monthStr2);
            if (monthIdx2 === -1) continue;
            month = monthIdx2 + 1;
            year = parseInt(match[3]);
          }
        } else if (match[1].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // M/D/YYYY format
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }
        
        // Validate date components
        if (year < 1900 || year > 2100) continue;
        if (month < 1 || month > 12) continue;
        if (day < 1 || day > 31) continue;
        
        // Create date and format as YYYY-MM-DD
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
}

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
    "insurance_provider": "string or null",
    "insurance_plan": "string or null", 
    "insurance_id_number": "string or null",
    "insurance_group_number": "string or null"
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

        // Normalize DOB to proper format
        const dobIso = normalizeDob(parsedData.contact_info?.dob);
        
        // Build update data based on table
        const updateData: any = {
          parsing_completed_at: new Date().toISOString()
        };

        if (record.table === 'all_appointments') {
          // For appointments: include parsed_* JSON fields
          updateData.parsed_insurance_info = parsedData.insurance_info;
          updateData.parsed_pathology_info = parsedData.pathology_info;
          updateData.parsed_contact_info = parsedData.contact_info;
          updateData.parsed_demographics = parsedData.demographics;
          
          if (parsedData.medical_info) {
            updateData.parsed_contact_info = {
              ...updateData.parsed_contact_info,
              medical_info: parsedData.medical_info
            };
          }

          // Sync DOB if normalized successfully
          if (dobIso) {
            updateData.dob = dobIso;
          }

          // Sync insurance info to main columns
          if (parsedData.insurance_info?.insurance_provider) {
            updateData.detected_insurance_provider = parsedData.insurance_info.insurance_provider;
          }
          if (parsedData.insurance_info?.insurance_plan) {
            updateData.detected_insurance_plan = parsedData.insurance_info.insurance_plan;
          }
          if (parsedData.insurance_info?.insurance_id_number) {
            updateData.detected_insurance_id = parsedData.insurance_info.insurance_id_number;
          }
        } else if (record.table === 'new_leads') {
          // For leads: DO NOT include parsed_* fields (they don't exist)
          // Only sync to main columns
          if (dobIso) {
            updateData.dob = dobIso;
          }
          
          if (parsedData.insurance_info?.insurance_provider) {
            updateData.insurance_provider = parsedData.insurance_info.insurance_provider;
          }
          if (parsedData.insurance_info?.insurance_plan) {
            updateData.insurance_plan = parsedData.insurance_info.insurance_plan;
          }
          if (parsedData.insurance_info?.insurance_id_number) {
            updateData.insurance_id = parsedData.insurance_info.insurance_id_number;
          }
          if (parsedData.insurance_info?.insurance_group_number) {
            updateData.group_number = parsedData.insurance_info.insurance_group_number;
          }
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