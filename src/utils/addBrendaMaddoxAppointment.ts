import { supabase } from '@/integrations/supabase/client';

export const addBrendaMaddoxAppointment = async () => {
  console.log('Adding Brenda Maddox appointment...');
  
  const formattedNotes = `Contact: Name: Brenda Maddox | Phone: (478) 957-5503 | Email: cnmaddox50@yahoo.com | DOB: Oct 1st 1964 | Address: 4197 Worsham Avenue, Macon Georgia 31206 | Patient ID: SRt3o9MFXi522R3BwdbO /n Insurance: Plan: 102 | Group #: GA6807M050 | Alt Selection: Blue Cross | Upload: https://services.leadconnectorhq.com/documents/download/MRqPivGZS1Ud2ljbAv9v /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Sharp Pain, Dull Ache, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: NO | Other: NO`;

  const appointmentData = {
    lead_name: 'Brenda Maddox',
    project_name: 'Premier Vascular',
    date_appointment_created: new Date().toISOString(),
    ghl_id: 'SRt3o9MFXi522R3BwdbO',
    lead_email: 'cnmaddox50@yahoo.com',
    lead_phone_number: '(478) 957-5503',
    dob: '1964-10-01',
    patient_intake_notes: formattedNotes,
    detected_insurance_provider: 'Blue Cross',
    detected_insurance_plan: '102',
    detected_insurance_id: 'GA6807M050',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/MRqPivGZS1Ud2ljbAv9v',
    parsed_contact_info: {
      name: 'Brenda Maddox',
      phone: '(478) 957-5503',
      email: 'cnmaddox50@yahoo.com',
      address: '4197 Worsham Avenue, Macon Georgia 31206',
      patient_id: 'SRt3o9MFXi522R3BwdbO'
    },
    parsed_demographics: {
      dob: '1964-10-01',
      age: 60,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross',
      plan: '102',
      group_number: 'GA6807M050',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 10,
      symptoms: 'Sharp Pain, Dull Ache, Swelling, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'NO'
    }
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .insert([appointmentData])
    .select();
  
  if (error) {
    console.error('Error adding Brenda Maddox appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully added Brenda Maddox appointment:', data);
  return { success: true, data };
};
