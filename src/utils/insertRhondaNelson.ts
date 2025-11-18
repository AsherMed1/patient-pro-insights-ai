import { supabase } from '@/integrations/supabase/client';

export const insertRhondaNelsonAppointment = async () => {
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
    patient_intake_notes: `**Contact:** Name: Rhonda Nelson | Phone: (478) 443-4472 | Email: danica062@gmail.com | DOB: Oct 24th 1977 | Address: 135 Meriweather Circle, Milledgeville Georgia 31061 | Patient ID: I7kVW8zOKLAwGvZm8A2a /n **Insurance:** Plan: Ambetter | Group #: 2CVA | Alt Selection: Other | Notes: Both knees, more left than right, injured left knee, Has had shots /n **Pathology (GAE):** Duration: 6 months - 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55`,
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
    return { success: false, error };
  }
  
  console.log('✅ Successfully created Rhonda Nelson appointment:', data);
  return { success: true, data };
};
