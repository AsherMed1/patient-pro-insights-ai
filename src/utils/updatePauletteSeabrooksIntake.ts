import { supabase } from '@/integrations/supabase/client';

export const updatePauletteSeabrooksIntake = async () => {
  console.log('Updating Paulette Daniel Seabrooks appointment...');
  
  const formattedNotes = `Contact: Name: Paulette Daniel Seabrooks | Phone: (478) 607-9392 | Email: pdseabrooks@yahoo.com | DOB: Aug 17th 1955 | Address: 222 Turner Woods Rd, Gray Georgia 31032 | Patient ID: dT29R9WQdyvSgWzqdHfH /n Insurance: Plan: (80840)9140461101 | Group #: 4A476 | Alt Selection: Humana | Upload: https://services.leadconnectorhq.com/documents/download/V4KkIqKilxVuWaJCTA0v /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 6 | Symptoms: Instability or weakness | Treatments Tried: Injections, Physical therapy | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'dT29R9WQdyvSgWzqdHfH',
    lead_email: 'pdseabrooks@yahoo.com',
    lead_phone_number: '(478) 607-9392',
    dob: '1955-08-17',
    detected_insurance_provider: 'Humana',
    detected_insurance_plan: '(80840)9140461101',
    detected_insurance_id: '4A476',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/V4KkIqKilxVuWaJCTA0v',
    parsed_contact_info: {
      name: 'Paulette Daniel Seabrooks',
      phone: '(478) 607-9392',
      email: 'pdseabrooks@yahoo.com',
      address: '222 Turner Woods Rd, Gray Georgia 31032',
      patient_id: 'dT29R9WQdyvSgWzqdHfH'
    },
    parsed_demographics: {
      dob: '1955-08-17',
      age: 69,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Humana',
      plan: '(80840)9140461101',
      group_number: '4A476',
      alternate_selection: 'Humana'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 6,
      symptoms: 'Instability or weakness',
      treatments_tried: 'Injections, Physical therapy',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Paulette Daniel Seabrooks')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Paulette Daniel Seabrooks appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Paulette Daniel Seabrooks appointment:', data);
  return { success: true, data };
};
