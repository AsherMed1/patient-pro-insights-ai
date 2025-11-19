import { supabase } from "@/integrations/supabase/client";

const DUPLICATE_NAMES = ['Diana Johnson', 'Tiffini Porter', 'Bill Haefele'];

export async function cleanupDuplicateAppointments() {
  console.log("🧹 Starting cleanup of duplicate Premier Vascular appointments...");
  
  let totalDeleted = 0;

  for (const leadName of DUPLICATE_NAMES) {
    console.log(`\n📋 Processing duplicates for: ${leadName}`);
    
    // Fetch all appointments for this person, ordered by created_at
    const { data: appointments, error: fetchError } = await supabase
      .from('all_appointments')
      .select('id, created_at, lead_name')
      .eq('project_name', 'Premier Vascular')
      .eq('lead_name', leadName)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error(`❌ Error fetching ${leadName}:`, fetchError);
      continue;
    }

    if (!appointments || appointments.length <= 1) {
      console.log(`✅ No duplicates found for ${leadName}`);
      continue;
    }

    console.log(`Found ${appointments.length} appointments for ${leadName}`);
    
    // Keep the first (oldest) one, delete the rest
    const [keepAppointment, ...duplicatesToDelete] = appointments;
    const duplicateIds = duplicatesToDelete.map(a => a.id);

    console.log(`Keeping: ${keepAppointment.id} (created: ${keepAppointment.created_at})`);
    console.log(`Deleting ${duplicateIds.length} duplicates...`);

    // Delete duplicates
    const { error: deleteError } = await supabase
      .from('all_appointments')
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      console.error(`❌ Failed to delete duplicates for ${leadName}:`, deleteError);
    } else {
      console.log(`✅ Deleted ${duplicateIds.length} duplicates for ${leadName}`);
      totalDeleted += duplicateIds.length;
    }
  }

  console.log(`\n🎉 Cleanup complete! Total deleted: ${totalDeleted} duplicates`);
  
  // Verify final counts
  console.log("\n🔍 Verifying final counts...");
  for (const leadName of DUPLICATE_NAMES) {
    const { count } = await supabase
      .from('all_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('project_name', 'Premier Vascular')
      .eq('lead_name', leadName);
    
    console.log(`${leadName}: ${count} appointment(s)`);
  }

  return { success: true, totalDeleted };
}

// Auto-run in dev mode
if (import.meta.env.DEV) {
  console.log("💡 To run cleanup: import { cleanupDuplicateAppointments } from '@/utils/cleanupDuplicateAppointments' and call it");
}
