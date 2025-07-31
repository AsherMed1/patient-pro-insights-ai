import { supabase } from '@/integrations/supabase/client';

export const updateLarryMcDonaldAppointment = async () => {
  try {
    const patientIntakeNotes = `**Contact**: Name: Larry McDonald | Phone: (217) 721-4221 | Email: larrymc22@yahoo.com | Patient ID: tzOkq9oOhToSor39d8fp 

**Insurance**: Alt Selection: Blue Cross Blue Shield 

**Pathology**: GAE - Duration: 6 months - 1 year, Age Range: 56 and above, Pain Level: 6, Symptoms: Swelling, Stiffness, Sharp Pain, Treatments Tried: Injections, Medications/pain pills, Imaging Done: ☑️ YES.`;

    const { data, error } = await supabase
      .from('all_appointments')
      .update({ 
        patient_intake_notes: patientIntakeNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', '12cd7402-5064-4c15-94c9-1c97bb3c2089')
      .select();

    if (error) {
      console.error('Error updating Larry McDonald appointment:', error);
      return { success: false, error };
    }

    console.log('Successfully updated Larry McDonald appointment:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Error in updateLarryMcDonaldAppointment:', error);
    return { success: false, error };
  }
};