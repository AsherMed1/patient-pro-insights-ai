import { supabase } from "@/integrations/supabase/client";

export const updateWillodeneBrownIntake = async () => {
  console.log('Updating Willodene Brown intake notes...');
  
  const formattedNotes = `Contact: Name: Willodene Brown | Phone: (478) 832-4777 | Email: willodenebrown60@gmail.com | DOB: Nov 15th 1960 | Address: 901 Perimeter Road, Perry Georgia 31069 | Patient ID: OhD8XxBEuSkjUbyjWwUH /n Insurance: Plan: 991213471-00 | Group #: 72866 | Alt Selection: United Healthcare | Notes: Mostly the right knee. Can't walk without a walker. Was going to an orthopedic some years ago getting those injections the ones you get three one every week or so cepral injection I know I missed spelled it. But it's the injections where they cushion my knees injected it through a needle. /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: NO | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Dull Ache, Sharp Pain, Swelling | Treatments Tried: Injections | Imaging Done: YES | Other: NO`;

  const { data, error } = await supabase
    .from('all_appointments')
    .update({ 
      patient_intake_notes: formattedNotes
    })
    .eq('lead_name', 'Willodene Brown')
    .eq('project_name', 'Premier Vascular')
    .select();

  if (error) {
    console.error('Error updating Willodene Brown intake notes:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully updated Willodene Brown intake notes');
  return { success: true, data };
};
