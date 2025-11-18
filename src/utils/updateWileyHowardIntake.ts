import { supabase } from '@/integrations/supabase/client';

export const updateWileyHowardIntake = async () => {
  console.log('Updating Wiley Howard appointment...');
  
  const appointmentId = '66a85ed7-b2a1-43a4-baa4-99e10739f9df';
  
  const updates = {
    parsed_contact_info: {
      name: "Wiley Howard",
      phone: "(919) 622-1925",
      email: "ansonhoward@gmail.com",
      address: "1216 Brookside Drive, Lansing Michigan 48917"
    },
    parsed_demographics: {
      dob: "1965-09-22",
      age: 59,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Humana",
      plan: "(80840)9140461101",
      alternate_selection: "Humana"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 7,
      symptoms: "Dull Ache, Sharp Pain, Stiffness, Swelling",
      treatments_tried: "Injections, Physical therapy",
      imaging_done: "YES"
    },
    ghl_id: "ucwghFxyYPoBHXCFSSCC",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/oZuoSNQG162wUWrxHFr2",
    detected_insurance_provider: "Humana",
    detected_insurance_plan: "(80840)9140461101",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Wiley Howard appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Wiley Howard appointment:', data);
  return { success: true, data };
};
