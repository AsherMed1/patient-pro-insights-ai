import { supabase } from "@/integrations/supabase/client";

/**
 * Deletes all duplicate Premier Vascular appointments that were created on November 17, 2025
 * after 15:36:57 UTC. These duplicates were created by the auto-reconciliation script.
 * 
 * Expected: Delete 40 duplicate appointments
 * Result: Total should be 155 appointments (matching CSV source of truth)
 */
export async function deleteNovember17Duplicates() {
  console.log("🧹 Starting cleanup of November 17, 2025 duplicate appointments...");
  
  try {
    // First, query to see what we're about to delete
    const { data: duplicatesToDelete, error: queryError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, date_of_appointment, created_at')
      .eq('project_name', 'Premier Vascular')
      .gte('created_at', '2025-11-17 15:36:57+00')
      .order('created_at', { ascending: true });

    if (queryError) {
      console.error("❌ Error querying duplicates:", queryError);
      return { success: false, error: queryError };
    }

    console.log(`📋 Found ${duplicatesToDelete?.length || 0} duplicate appointments to delete:`);
    duplicatesToDelete?.forEach((appt, index) => {
      console.log(`  ${index + 1}. ${appt.lead_name} - ${appt.date_of_appointment} (ID: ${appt.id}, Created: ${appt.created_at})`);
    });

    // Delete the duplicates
    const { data: deletedData, error: deleteError } = await supabase
      .from('all_appointments')
      .delete()
      .eq('project_name', 'Premier Vascular')
      .gte('created_at', '2025-11-17 15:36:57+00')
      .select();

    if (deleteError) {
      console.error("❌ Error deleting duplicates:", deleteError);
      return { success: false, error: deleteError };
    }

    console.log(`✅ Successfully deleted ${deletedData?.length || 0} duplicate appointments`);

    // Verify final count
    const { count: finalCount, error: countError } = await supabase
      .from('all_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('project_name', 'Premier Vascular');

    if (countError) {
      console.error("❌ Error counting final appointments:", countError);
    } else {
      console.log(`📊 Final Premier Vascular appointment count: ${finalCount}`);
      if (finalCount === 155) {
        console.log("✅ Perfect! Count matches CSV source of truth (155 appointments)");
      } else {
        console.warn(`⚠️ Warning: Expected 155 appointments, but found ${finalCount}`);
      }
    }

    return {
      success: true,
      deletedCount: deletedData?.length || 0,
      finalCount,
      deletedAppointments: duplicatesToDelete
    };

  } catch (error) {
    console.error("❌ Unexpected error during cleanup:", error);
    return { success: false, error };
  }
}

// Execute the cleanup immediately (one-time script)
// DISABLED: This was auto-deleting new appointments
// Call manually if needed: deleteNovember17Duplicates();
