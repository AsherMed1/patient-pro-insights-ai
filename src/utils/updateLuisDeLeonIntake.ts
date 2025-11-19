import { supabase } from '@/integrations/supabase/client';

export const updateLuisDeLeonIntake = async () => {
  console.log('Updating Luis De Leon Premier Vascular appointment with parsed data...');
  
  const appointmentId = 'd170ff51-40fb-4e79-9f32-ce803039b0e1';
  
  const updates = {
    parsed_contact_info: {
      name: 'Luis De Leon',
      phone: '(602) 341-3087',
      email: 'luis.d@patientpromarketing.com',
      address: '17856 West Summerhaven Drive, Goodyear Arizona 85338',
      dob: '11/18/2010'
    },
    parsed_demographics: {
      age: '14',
      gender: 'Male'
    },
    parsed_insurance_info: {
      insurance_provider: 'Medicare',
      insurance_plan: '123',
      insurance_id_number: null,
      insurance_group_number: '123'
    },
    parsed_pathology_info: {
      procedure_type: 'GAE',
      primary_complaint: 'Knee pain requiring GAE consultation',
      affected_area: 'Knee',
      duration: 'Over 1 year',
      pain_level: '10/10',
      symptoms: 'Sharp Pain, Dull Ache, Swelling, Stiffness, Grinding sensation, Instability or weakness',
      previous_treatments: 'Injections, Physical therapy, Knee replacement, Medications/pain pills',
      imaging_done: 'YES',
      oa_tkr_diagnosed: 'YES',
      trauma_related_onset: 'YES',
      age_range: '56 and above'
    },
    parsed_medical_info: {
      allergies: null,
      medications: null,
      pcp_name: null,
      pcp_phone: null,
      pcp_address: null,
      imaging_details: 'Imaging completed',
      xray_details: null
    },
    parsing_completed_at: new Date().toISOString(),
    dob: '2010-11-18',
    detected_insurance_provider: 'Medicare',
    detected_insurance_plan: '123',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/rxG65ma53cKFH5QmM8dZ',
    ai_summary: 'Luis De Leon is a 14-year-old male Medicare patient presenting with severe chronic knee pain (10/10) lasting over 1 year. He has been previously diagnosed with OA/TKR and has had trauma-related onset. Symptoms include sharp pain, dull ache, swelling, stiffness, grinding sensation, and instability. Previous treatments include injections, physical therapy, knee replacement surgery, and pain medications. Patient has completed imaging studies and is scheduled for GAE consultation on December 10, 2025.',
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('all_appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select();

    if (error) {
      console.error('Error updating Luis De Leon:', error);
      return { success: false, error };
    }

    console.log('Successfully updated Luis De Leon Premier Vascular appointment:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: err };
  }
};
