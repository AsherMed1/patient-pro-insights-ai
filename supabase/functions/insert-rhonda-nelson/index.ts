import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Allow all origins for this one-time operation
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Creating Rhonda Nelson appointment...');
    
    const appointmentData = {
      project_name: 'Premier Vascular',
      lead_name: 'Rhonda Nelson',
      lead_phone_number: '(478) 443-4472',
      lead_email: 'danica062@gmail.com',
      dob: '1977-10-24',
      ghl_id: 'I7kVW8zOKLAwGvZm8A2a',
      ghl_appointment_id: 'XtvXbpT4Dmdgk8J3bx2t',
      status: 'confirmed',
      date_appointment_created: new Date().toISOString().split('T')[0],
      date_of_appointment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      calendar_name: 'Request your GAE Consultation',
      internal_process_complete: false,
      was_ever_confirmed: true,
      patient_intake_notes: `**Contact:** Name: Rhonda Nelson | Phone: (478) 443-4472 | Email: danica062@gmail.com | DOB: Oct 24th 1977 | Address: 135 Meriweather Circle, Milledgeville Georgia 31061 | Patient ID: I7kVW8zOKLAwGvZm8A2a\n\n**Insurance:** Plan: Ambetter | Group #: 2CVA | Alt Selection: Other | Notes: Both knees, more left than right, injured left knee, Has had shots\n\n**Pathology (GAE):** Duration: 6 months - 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55`,
      parsed_contact_info: {
        name: "Rhonda Nelson",
        phone: "(478) 443-4472",
        email: "danica062@gmail.com",
        address: "135 Meriweather Circle, Milledgeville Georgia 31061"
      },
      parsed_demographics: {
        dob: "1977-10-24",
        age: 47,
        gender: "Female"
      },
      parsed_insurance_info: {
        provider: "Ambetter",
        plan: "Ambetter",
        group_number: "2CVA",
        alternate_selection: "Other"
      },
      parsed_pathology_info: {
        procedure: "GAE",
        duration: "6 months - 1 year",
        oa_tkr_diagnosed: "YES",
        age_range: "46 to 55",
        primary_complaint: "knee pain",
        notes: "Both knees, more left than right, injured left knee, Has had shots"
      },
      detected_insurance_provider: "Ambetter",
      detected_insurance_plan: "Ambetter",
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('all_appointments')
      .insert(appointmentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating Rhonda Nelson appointment:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('✅ Successfully created Rhonda Nelson appointment:', data);
    
    return new Response(
      JSON.stringify({ success: true, data }),
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
