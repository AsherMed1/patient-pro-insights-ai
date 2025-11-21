import { supabase } from '@/integrations/supabase/client';

export const cleanupBrendaMaddoxDuplicates = async () => {
  console.log('🧹 Starting Premier Vascular duplicate cleanup...');
  
  // Step 1: Delete the 8 Brenda Maddox duplicates
  const duplicateIds = [
    'b52a6ced-468b-48fe-8683-681c51a3290d',
    'e26c6c64-e865-4b1c-8b40-184ddde565bb',
    '0a6da613-0514-4460-b6bf-cc093657899d',
    '7a276e2d-48b3-4561-83a8-a5ac4b281e29',
    '0ebf998a-cb16-4b94-adc3-0b79eb1a644c',
    'e28de39d-cd53-4c87-9bd0-4e36dfa15073',
    'c87415c9-d139-4c05-8d97-3a2273bc3bab',
    '6e85a642-115e-4181-9e7e-de5515d55e2a'
  ];
  
  const { error: deleteError } = await supabase
    .from('all_appointments')
    .delete()
    .in('id', duplicateIds);
  
  if (deleteError) {
    console.error('❌ Error deleting Brenda Maddox duplicates:', deleteError);
  } else {
    console.log('✅ Deleted 8 Brenda Maddox duplicates');
  }
  
  // Step 2: Update the original Brenda Maddox record
  const originalId = 'd6068310-e0c7-461a-aaa0-2be3a659128d';
  
  const { error: updateError } = await supabase
    .from('all_appointments')
    .update({
      lead_name: 'Brenda Maddox',
      patient_intake_notes: 'Contact: Name: Brenda Maddox | Phone: (478) 957-5503 | Email: cnmaddox50@yahoo.com | DOB: Oct 1st 1964 | Address: 4197 Worsham Avenue, Macon Georgia 31206 | Patient ID: SRt3o9MFXi522R3BwdbO /n Insurance: Plan: 102 | Group #: GA6807M050 | Alt Selection: Blue Cross | Upload: https://services.leadconnectorhq.com/documents/download/MRqPivGZS1Ud2ljbAv9v /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Sharp Pain, Dull Ache, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: NO | Other: NO',
      ghl_id: 'SRt3o9MFXi522R3BwdbO',
      lead_email: 'cnmaddox50@yahoo.com',
      lead_phone_number: '(478) 957-5503',
      dob: '1964-10-01',
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
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', originalId);
  
  if (updateError) {
    console.error('❌ Error updating original Brenda Maddox record:', updateError);
  } else {
    console.log('✅ Updated original Brenda Maddox record with complete intake notes');
  }
  
  // Step 3: Delete TEST TEST duplicates (keep oldest)
  const { data: testRecords } = await supabase
    .from('all_appointments')
    .select('id, created_at')
    .eq('lead_name', 'TEST TEST')
    .eq('project_name', 'Premier Vascular')
    .order('created_at', { ascending: true });
  
  if (testRecords && testRecords.length > 1) {
    const duplicateTestIds = testRecords.slice(1).map(r => r.id);
    
    const { error: testDeleteError } = await supabase
      .from('all_appointments')
      .delete()
      .in('id', duplicateTestIds);
    
    if (testDeleteError) {
      console.error('❌ Error deleting TEST TEST duplicates:', testDeleteError);
    } else {
      console.log(`✅ Deleted ${duplicateTestIds.length} TEST TEST duplicate(s)`);
    }
  }
  
  console.log('🎉 Cleanup complete!');
  return { success: true };
};
