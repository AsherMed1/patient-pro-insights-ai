import { supabase } from "@/integrations/supabase/client";

// Helper function to calculate age from DOB
const calculateAge = (dobString: string | null): number | null => {
  if (!dobString) return null;
  
  try {
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    
    const today = new Date();
    if (dob > today) return null; // Future date
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
};

export const backfillDemographics = async () => {
  console.log('🔄 Starting demographics backfill...');
  
  try {
    // Fetch all appointments that have a DOB but missing parsed_demographics.dob
    const { data: appointments, error: fetchError } = await supabase
      .from('all_appointments')
      .select('id, dob, parsed_demographics')
      .not('dob', 'is', null);
    
    if (fetchError) {
      console.error('❌ Error fetching appointments:', fetchError);
      return { success: false, error: fetchError };
    }
    
    if (!appointments || appointments.length === 0) {
      console.log('ℹ️ No appointments found with DOB');
      return { success: true, updated: 0 };
    }
    
    console.log(`📊 Found ${appointments.length} appointments with DOB`);
    
    let updateCount = 0;
    const errors: any[] = [];
    
    // Update each appointment
    for (const appointment of appointments) {
      const demographics = appointment.parsed_demographics as any;
      
      // Skip if parsed_demographics already has dob
      if (demographics?.dob) {
        console.log(`⏭️ Skipping ${appointment.id} - demographics already populated`);
        continue;
      }
      
      const age = calculateAge(appointment.dob);
      const existingGender = demographics?.gender || null;
      
      const updatedDemographics = {
        dob: appointment.dob,
        age: age,
        gender: existingGender
      };
      
      const { error: updateError } = await supabase
        .from('all_appointments')
        .update({
          parsed_demographics: updatedDemographics
        })
        .eq('id', appointment.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${appointment.id}:`, updateError);
        errors.push({ id: appointment.id, error: updateError });
      } else {
        updateCount++;
        console.log(`✅ Updated ${appointment.id} - DOB: ${appointment.dob}, Age: ${age}`);
      }
    }
    
    console.log(`\n📈 Backfill complete:`);
    console.log(`   ✅ Updated: ${updateCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Failed updates:', errors);
    }
    
    return {
      success: errors.length === 0,
      updated: updateCount,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    console.error('❌ Unexpected error during backfill:', error);
    return { success: false, error };
  }
};
