import { supabase } from "@/integrations/supabase/client";

export const updateDianaJohnsonIntake = async () => {
  console.log('Updating Diana Johnson intake notes...');
  
  const formattedNotes = `Contact: Name: Diana Johnson | Phone: (210) 840-9713 | Email: ladyslicktexas@yahoo.com | DOB: Jan 11th 1960 | Address: 201 Custer Dr, Warner Robins Georgia 31093 | Patient ID: 09izp4moKoUrOD8LN6pS /n Insurance: Plan: United Healthcare Medicare/Blue Cross Blue Shield | Group #: 72872H3256002-000/GA80392DAS | Alt Selection: Blue Cross | Notes: Both knees for 5-6y. Taking hydrocodone as needed, spasm meds. Tried injections before but does not work. Swelling and pain every day, all day. /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy | Imaging Done: YES`;

  const { data, error } = await supabase
    .from('all_appointments')
    .update({ 
      patient_intake_notes: formattedNotes
    })
    .eq('lead_name', 'Diana Johnson')
    .eq('project_name', 'Premier Vascular')
    .select();

  if (error) {
    console.error('Error updating Diana Johnson intake notes:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully updated Diana Johnson intake notes');
  return { success: true, data };
};
