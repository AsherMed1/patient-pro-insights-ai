import { supabase } from '@/integrations/supabase/client';

export const updateTiffanyNewsonIntake = async () => {
  console.log('Updating Tiffany Newson appointment...');
  
  const formattedNotes = `Contact: Name: Tiffany Newson | Phone: (478) 978-4350 | DOB: Oct 27th 1974 | Address: 1849 Tindall Avenue apt 204b, Macon Georgia 31201 | Patient ID: OTBpn3A89eAG5VlvHPMy /n Insurance: Plan: Ambetter Peach State | Group #: 2CVA | Notes: Tiffany Renae Newson - Right knee, pain for 3y. Hard to walk and go up and down stairs. Cannot go out as much as before, not do grocery shopping because it is painful to stand up. Tried cortisone and gel injections but no longer working. Pain wakes her up sometimes /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'OTBpn3A89eAG5VlvHPMy',
    lead_phone_number: '(478) 978-4350',
    dob: '1974-10-27',
    detected_insurance_provider: 'Ambetter Peach State',
    detected_insurance_plan: 'Ambetter Peach State',
    detected_insurance_id: '2CVA',
    parsed_contact_info: {
      name: 'Tiffany Newson',
      phone: '(478) 978-4350',
      address: '1849 Tindall Avenue apt 204b, Macon Georgia 31201',
      patient_id: 'OTBpn3A89eAG5VlvHPMy'
    },
    parsed_demographics: {
      dob: '1974-10-27',
      age: 50,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Ambetter Peach State',
      plan: 'Ambetter Peach State',
      group_number: '2CVA'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55'
    },
    parsed_medical_info: {
      notes: 'Tiffany Renae Newson - Right knee, pain for 3y. Hard to walk and go up and down stairs. Cannot go out as much as before, not do grocery shopping because it is painful to stand up. Tried cortisone and gel injections but no longer working. Pain wakes her up sometimes',
      treatments_tried: 'Cortisone injections, Gel injections'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Tiffany Newson')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Tiffany Newson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Tiffany Newson appointment:', data);
  return { success: true, data };
};
