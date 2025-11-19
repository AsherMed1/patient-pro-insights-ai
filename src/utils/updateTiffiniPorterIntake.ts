import { supabase } from "@/integrations/supabase/client";

export const updateTiffiniPorterIntake = async () => {
  console.log('Updating Tiffini Porter intake notes...');
  
  const formattedNotes = `Contact: Name: Tiffini Porter | Phone: (770) 866-5081 | Email: tiffinime@gmail.com | DOB: Apr 7th 1973 | Address: 624 East Mcintosh Road, Griffin Georgia 30223 | Patient ID: Z64ylExpfnbgOnDQ49P9 /n Insurance: Plan: Blue Cross | Group #: 95868 | Alt Selection: Blue Cross | Notes: Has had Xray of Knee in March 26, 2025 /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 6 | Symptoms: Swelling, Stiffness, Dull Ache, Instability or weakness | Treatments Tried: Medications/pain pills | Imaging Done: YES | Other: NO`;

  const { data, error } = await supabase
    .from('all_appointments')
    .update({ 
      patient_intake_notes: formattedNotes
    })
    .eq('lead_name', 'Tiffini Porter')
    .eq('project_name', 'Premier Vascular')
    .select();

  if (error) {
    console.error('Error updating Tiffini Porter intake notes:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully updated Tiffini Porter intake notes');
  return { success: true, data };
};
