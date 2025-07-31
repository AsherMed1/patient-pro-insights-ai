import { supabase } from "@/integrations/supabase/client";

export const updateDeborahRecord = async () => {
  const formattedNotes = `Contact: Name: Deborah Wampler, Phone: (208) 809-7215, Email: wampler.deborah@yahoo.com, Patient ID: ZMQXu8Q0eF7XCUfMfCy6 /n Insurance: Alt Selection: Humana /n Pathology: Duration: Over 1 year, OA or TKR Diagnosed: YES, Trauma-related Onset: NO, Pain Level: 8, Symptoms: Stiffness, Swelling, Sharp Pain, Treatments Tried: Injections, Physical therapy, Knee replacement, Medications/pain pills, Imaging Done: YES`;

  const { data, error } = await supabase
    .from('new_leads')
    .update({ patient_intake_notes: formattedNotes })
    .eq('contact_id', 'ZMQXu8Q0eF7XCUfMfCy6')
    .select();

  if (error) {
    console.error('Error updating Deborah record:', error);
    return;
  }

  console.log('Successfully updated Deborah record:', data);
  return data;
};