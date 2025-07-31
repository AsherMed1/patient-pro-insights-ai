import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      type, 
      data, 
      recordId, 
      tableName,
      context = 'medical_intake' 
    } = await req.json();

    console.log(`AI formatting request - Type: ${type}, Table: ${tableName}, Record: ${recordId}`)

    if (!data) {
      throw new Error('Data is required for formatting');
    }

    // Create context-specific prompts
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'patient_intake_notes':
        systemPrompt = `You are a medical intake specialist. Format the provided patient intake notes into a clear, professional summary AND extract insurance information.

Guidelines:
- Extract key medical information (conditions, symptoms, medications, allergies)
- Organize information logically with clear headings
- Use proper medical terminology
- Remove redundant or unnecessary text
- Maintain HIPAA compliance
- Keep the tone professional and clinical
- Format in structured paragraphs with clear sections

CRITICAL: Also extract any insurance information and return it in a JSON structure at the end of your response like this:
{
  "summary": "your formatted summary here",
  "insurance": {
    "provider": "insurance company name (e.g., Humana, Medicare, Blue Cross, etc.)",
    "plan": "plan details if mentioned",
    "member_id": "member/insurance ID if mentioned",
    "confidence": 0.9
  }
}

If no insurance information is found, set insurance fields to null and confidence to 0.`;
        
        userPrompt = `Please format these patient intake notes into a clear medical summary AND extract any insurance information:\n\n${data}`;
        break;

      case 'form_submission':
        systemPrompt = `You are a data formatting specialist for medical forms. Format raw form submission data into a clean, organized report.

Guidelines:
- Create clear sections for different types of information
- Convert form field names into readable labels
- Organize personal info, medical history, symptoms, and preferences separately
- Fix any spelling or grammar issues in responses
- Highlight important medical information
- Use a professional, clinical format
- If any responses seem incomplete or unclear, note it

Make it easy for medical staff to quickly understand the patient's information.`;

        userPrompt = `Please format this form submission data into a clean, organized medical intake report:\n\n${JSON.stringify(data, null, 2)}`;
        break;

      case 'appointment_summary':
        systemPrompt = `You are a medical appointment coordinator. Create clean, professional appointment summaries.

Guidelines:
- Summarize key appointment details clearly
- Highlight important medical information
- Note any scheduling preferences or special requirements
- Use a professional, clinical tone
- Organize information logically
- Make it easy to scan quickly

Create a summary that helps medical staff prepare for the appointment.`;

        userPrompt = `Please create a clean appointment summary from this data:\n\n${JSON.stringify(data, null, 2)}`;
        break;

      default:
        systemPrompt = `You are a professional data formatter. Clean up and organize this information to make it more readable and professional.

Guidelines:
- Fix grammar and spelling errors
- Organize information logically
- Use clear, professional language
- Structure the output for easy reading
- Maintain all important details`;

        userPrompt = `Please format and clean up this information:\n\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
    }

    console.log('Sending request to OpenAI...')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent formatting
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to format with AI');
    }

    const aiResponse = await response.json();
    let formattedText = aiResponse.choices[0].message.content;
    let insuranceData = null;
    
    // Try to extract JSON insurance data for patient_intake_notes
    if (type === 'patient_intake_notes') {
      try {
        const jsonMatch = formattedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          if (jsonData.summary && jsonData.insurance) {
            formattedText = jsonData.summary;
            insuranceData = jsonData.insurance;
          }
        }
      } catch (e) {
        console.log('No JSON structure found, using full response as summary');
      }
    }

    console.log('AI formatting successful')
    if (insuranceData) {
      console.log('Insurance data extracted:', insuranceData);
    }

    // If recordId and tableName are provided, update the record with AI summary and insurance data
    if (recordId && tableName) {
      try {
        console.log(`Updating ${tableName} record ${recordId} with AI summary`)
        
        const updateData: any = {
          ai_summary: formattedText,
          updated_at: new Date().toISOString()
        };
        
        // Add insurance data if detected and table is all_appointments
        if (insuranceData && tableName === 'all_appointments') {
          updateData.detected_insurance_provider = insuranceData.provider;
          updateData.detected_insurance_plan = insuranceData.plan;
          updateData.detected_insurance_id = insuranceData.member_id;
          updateData.insurance_detection_confidence = insuranceData.confidence || 0;
        }

        const { error: updateError } = await supabaseClient
          .from(tableName)
          .update(updateData)
          .eq('id', recordId);

        if (updateError) {
          console.error('Error updating record:', updateError);
          // Don't throw here, still return the formatted text
        } else {
          console.log('Record updated successfully with AI summary and insurance data')
        }
      } catch (updateError) {
        console.error('Error updating record:', updateError);
        // Continue and return the formatted text even if update fails
      }
    }

    return new Response(
      JSON.stringify({ 
        formattedText,
        success: true,
        originalLength: typeof data === 'string' ? data.length : JSON.stringify(data).length,
        formattedLength: formattedText.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in format-intake-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});