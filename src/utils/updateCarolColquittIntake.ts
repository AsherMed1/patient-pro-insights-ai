import { supabase } from '@/integrations/supabase/client';

export const updateCarolColquittIntake = async () => {
  console.log('Updating Carol A. Colquitt appointment...');
  
  const appointmentId = 'b0cd17f9-747a-4d4f-ba16-920b5b15a649';
  
  const updates = {
    parsed_contact_info: {
      name: "Carol A. Colquitt",
      phone: "(762) 381-8140",
      email: "calannquik@gmail.com",
      address: "409 Old Milner Road, Barnesville Georgia 30204"
    },
    parsed_demographics: {
      dob: "1969-05-06",
      age: 56,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare",
      group_number: "72866",
      alternate_selection: "United",
      notes: "Left knee, MRI Taken at Griffin Imaging in May 2025"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "6 months - 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Swelling, Grinding sensation, Instability or weakness, Stiffness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES"
    },
    parsed_medical_info: {
      pcp: "Dr. Terri Wilson",
      clinic: "7703581961",
      location: "Healthcare Barnesville",
      imaging_location: "Griffin Imaging in May 2025"
    },
    ghl_id: "QXUuKp30gzojO3qMFfoc",
    detected_insurance_provider: "United Healthcare",
    detected_insurance_plan: "United Healthcare",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Carol A. Colquitt appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Carol A. Colquitt appointment:', data);
  return { success: true, data };
};
