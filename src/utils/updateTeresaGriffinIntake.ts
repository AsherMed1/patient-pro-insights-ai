import { supabase } from '@/integrations/supabase/client';

export const updateTeresaGriffinIntake = async () => {
  console.log('Creating/Updating Teresa Griffin appointment...');
  
  const appointmentData = {
    lead_name: "Teresa Griffin",
    project_name: "Premier Vascular",
    date_appointment_created: new Date().toISOString(),
    date_of_appointment: "2026-01-19",
    requested_time: "10:00 AM",
    lead_phone_number: "(229) 942-1290",
    lead_email: "diane2523@yahoo.com",
    dob: "1970-01-23",
    ghl_id: "fWzlDilC8pTHpDey1Gr3",
    status: "confirmed",
    parsed_contact_info: {
      name: "Teresa Griffin",
      legal_name: "Teresa Diane Griffin",
      phone: "(229) 942-1290",
      email: "diane2523@yahoo.com",
      address: "395 Perry Pkwy apt l4, Perry Georgia 31069"
    },
    parsed_demographics: {
      dob: "1970-01-23",
      age: 55,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Blue Cross Blue Shield",
      plan: "BCBS",
      member_id: "R61578033",
      alternate_selection: "Blue Cross",
      legal_name: "Teresa Diane Griffin"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "1-6 months",
      age_range: "46 to 55",
      symptoms: "Walking is hard, stepping up, everything is painful",
      time_with_pain: "Since 2016",
      treatments_tried: "Stem cell injection, knee surgery",
      medical_notes: "Started feeling pain in right knee 2016, started feeling back pain in 2018 and had surgery for back, started feeling left knee pain in 2020"
    },
    parsed_medical_info: {
      pcp: "Dr. Leon - Atrion Health",
      primary_symptoms: "Walking difficulty, pain with stepping up, generalized pain",
      pain_history: "Right knee pain since 2016, back pain since 2018 (had surgery), left knee pain since 2020",
      previous_treatments: "Stem cell injection in knee, knee surgery"
    },
    patient_intake_notes: `Contact: Name: Teresa Griffin | Legal Name: Teresa Diane Griffin | Phone: (229) 942-1290 | Email: diane2523@yahoo.com | DOB: Jan 23rd 1970 | Address: 395 Perry Pkwy apt l4, Perry Georgia 31069 | Patient ID: fWzlDilC8pTHpDey1Gr3 /n Insurance: Plan: BCBS | Alt Selection: Blue Cross | ID Number: R61578033 | PCP: Dr. Leon - Atrion Health /n Pathology (GAE): Duration: 1-6 months | Age Range: 46 to 55 | Symptoms: Walking is hard, stepping up, everything is painful | Time w/pain: Since 2016 | Has tried: Stem cell injection, knee surgery | Notes: Started feeling pain in right knee 2016, started feeling back pain in 2018 and had surgery for back, started feeling left knee pain in 2020`,
    detected_insurance_provider: "Blue Cross Blue Shield",
    detected_insurance_plan: "BCBS",
    parsing_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Check if appointment exists
  const { data: existingAppointment } = await supabase
    .from('all_appointments')
    .select('id')
    .eq('ghl_id', 'fWzlDilC8pTHpDey1Gr3')
    .maybeSingle();

  let result;
  if (existingAppointment) {
    // Update existing appointment
    const { data, error } = await supabase
      .from('all_appointments')
      .update(appointmentData)
      .eq('id', existingAppointment.id)
      .select()
      .single();
    
    result = { data, error };
  } else {
    // Insert new appointment
    const { data, error } = await supabase
      .from('all_appointments')
      .insert([appointmentData])
      .select()
      .single();
    
    result = { data, error };
  }

  if (result.error) {
    console.error('Error creating/updating Teresa Griffin appointment:', result.error);
    return { success: false, error: result.error };
  }

  console.log('✅ Successfully created/updated Teresa Griffin appointment:', result.data);
  return { success: true, data: result.data };
};
