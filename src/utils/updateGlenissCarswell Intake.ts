import { supabase } from '@/integrations/supabase/client';

export const updateGlenissCarswellIntake = async () => {
  console.log('Updating Gleniss Carswell appointment...');
  
  const formattedNotes = `Contact: Name: Gleniss Carswell | Phone: (478) 719-4644 | Email: glenisscarswell@gmail.com | DOB: Dec 9th 1954 | Address: 4171 W Oak Dr, Macon Georgia 31210 | Patient ID: fflmI4YPvQPUxKjtB1H2 /n Insurance: Plan: UnitedHealthCare | Group #: 01119 H1889-027-000 | Upload: https://services.leadconnectorhq.com/documents/download/x0EZHCaJJv41zs2QUolO | Alt Selection: Medicare /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 6 | Symptoms: Sharp Pain, Swelling, Stiffness, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'fflmI4YPvQPUxKjtB1H2',
    lead_email: 'glenisscarswell@gmail.com',
    lead_phone_number: '(478) 719-4644',
    dob: '1954-12-09',
    detected_insurance_provider: 'UnitedHealthCare',
    detected_insurance_plan: 'UnitedHealthCare',
    detected_insurance_id: '01119 H1889-027-000',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/x0EZHCaJJv41zs2QUolO',
    parsed_contact_info: {
      name: 'Gleniss Carswell',
      phone: '(478) 719-4644',
      email: 'glenisscarswell@gmail.com',
      address: '4171 W Oak Dr, Macon Georgia 31210',
      patient_id: 'fflmI4YPvQPUxKjtB1H2'
    },
    parsed_demographics: {
      dob: '1954-12-09',
      age: 70,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'UnitedHealthCare',
      plan: 'UnitedHealthCare',
      group_number: '01119 H1889-027-000',
      alternate_selection: 'Medicare',
      insurance_card_link: 'https://services.leadconnectorhq.com/documents/download/x0EZHCaJJv41zs2QUolO'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 6,
      symptoms: 'Sharp Pain, Swelling, Stiffness, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'YES',
      notes: 'Patient diagnosed with osteoarthritis or TKR condition. Experiencing moderate to severe pain (6/10) with multiple symptoms including sharp pain, swelling, stiffness, and joint instability.'
    },
    parsed_medical_info: {
      diagnosis: 'Osteoarthritis or TKR diagnosed',
      treatments_tried: 'Injections, Physical therapy, Pain medications',
      imaging_status: 'Completed',
      pain_management: 'Currently using pain medications, has received injections and physical therapy',
      notes: 'Patient has been dealing with knee pain for over 1 year. Diagnosed with osteoarthritis or requires TKR. Has tried multiple conservative treatments including injections, physical therapy, and pain medications with limited relief. Experiencing sharp pain, swelling, stiffness, and instability in the affected joint(s). Pain level of 6/10. Imaging has been completed to assess the condition.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Gleniss Carswell')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Gleniss Carswell appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Gleniss Carswell appointment:', data);
  return { success: true, data };
};
