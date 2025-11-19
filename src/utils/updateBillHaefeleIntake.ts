import { supabase } from "@/integrations/supabase/client";

export const updateBillHaefeleIntake = async () => {
  console.log('Updating Bill Haefele intake notes...');
  
  const formattedNotes = `Contact: Name: Bill Haefele | Phone: (229) 539-0318 | Email: whaefele@yahoo.com | DOB: May 9th 1966 | Address: 17562 Adel Hwy, Barney Georgia 31625 | Patient ID: zH2MleoweQYoWqdsGJ9U /n Insurance: Plan: BCBS | Group #: 400014 | Alt Selection: Blue Cross | Upload: https://services.leadconnectorhq.com/documents/download/VHthASTYYbuRxWg0BtT9 /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 8 | Symptoms: Sharp Pain, Swelling, Stiffness, Dull Ache, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy | Imaging Done: YES`;

  const { data, error } = await supabase
    .from('all_appointments')
    .update({ 
      patient_intake_notes: formattedNotes,
      insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/VHthASTYYbuRxWg0BtT9'
    })
    .eq('lead_name', 'Bill Haefele')
    .eq('project_name', 'Premier Vascular')
    .select();

  if (error) {
    console.error('Error updating Bill Haefele intake notes:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully updated Bill Haefele intake notes');
  return { success: true, data };
};
