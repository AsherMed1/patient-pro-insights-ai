import { supabase } from "@/integrations/supabase/client";

const DUPLICATE_IDS = [
  'ede1aa24-a29d-4157-a5e0-f24842b272c4',
  '90994181-7d1d-4bae-9c58-f8b63bac79b4',
  'cb8833b6-df89-4ca7-9ad0-dbac6811d6e2',
  'cd2d7fee-4b21-4a63-8c40-737b5041a99e',
  '2e7c8e2f-a040-453a-b657-2008a97f1d01'
];

const INVALID_ID = 'cd22674a-3402-4906-9164-447253abf8d9';

export async function cleanupDuplicateAppointments() {
  console.log("🧹 Starting cleanup of duplicate and invalid appointments...");
  
  // Delete 5 duplicate Star Shamaine Higgins entries
  console.log(`\n📋 Deleting ${DUPLICATE_IDS.length} duplicate Star Shamaine Higgins entries...`);
  const { error: duplicatesError } = await supabase
    .from('all_appointments')
    .delete()
    .in('id', DUPLICATE_IDS);

  if (duplicatesError) {
    console.error("❌ Failed to delete duplicates:", duplicatesError);
    return { success: false, error: duplicatesError };
  }
  console.log(`✅ Deleted ${DUPLICATE_IDS.length} duplicate entries`);

  // Delete Jerry Boss entry (not in CSV)
  console.log("\n📋 Deleting invalid Jerry Boss entry...");
  const { error: invalidError } = await supabase
    .from('all_appointments')
    .delete()
    .eq('id', INVALID_ID);

  if (invalidError) {
    console.error("❌ Failed to delete Jerry Boss:", invalidError);
    return { success: false, error: invalidError };
  }
  console.log("✅ Deleted Jerry Boss entry");

  // Verify final counts
  console.log("\n🔍 Verifying final counts...");
  
  const { count: totalCount, error: countError } = await supabase
    .from('all_appointments')
    .select('*', { count: 'exact', head: true })
    .eq('project_name', 'Premier Vascular');

  if (countError) {
    console.error("❌ Failed to verify count:", countError);
    return { success: false, error: countError };
  }

  const { count: starCount } = await supabase
    .from('all_appointments')
    .select('*', { count: 'exact', head: true })
    .eq('project_name', 'Premier Vascular')
    .eq('lead_name', 'Star Shamaine Higgins');

  console.log("\n📊 Final Results:");
  console.log(`✅ Total Premier Vascular appointments: ${totalCount}`);
  console.log(`✅ Star Shamaine Higgins entries: ${starCount}`);
  console.log(`${totalCount === 155 ? '✅' : '⚠️'} Expected count: 155 (${totalCount === 155 ? 'MATCH' : 'MISMATCH'})`);

  return { 
    success: true, 
    totalCount, 
    starCount,
    deletedDuplicates: DUPLICATE_IDS.length,
    deletedInvalid: 1
  };
}

// Auto-run in dev mode
if (import.meta.env.DEV) {
  console.log("💡 To run cleanup: import { cleanupDuplicateAppointments } from '@/utils/cleanupDuplicateAppointments' and call it");
}
