import { supabase } from '@/integrations/supabase/client';

export const cleanupBrendaMaddoxDuplicates = async () => {
  console.log('🧹 Starting Brenda Maddox duplicate cleanup...');
  
  const originalId = 'd6068310-e0c7-461a-aaa0-2be3a659128d';
  
  // Get all Brenda Maddox records to identify duplicates
  const { data: allRecords, error: fetchError } = await supabase
    .from('all_appointments')
    .select('id')
    .eq('project_name', 'Premier Vascular')
    .eq('lead_name', 'Brenda Maddox')
    .neq('id', originalId);
  
  if (fetchError) {
    console.error('❌ Error fetching duplicates:', fetchError);
    return { success: false, error: fetchError };
  }
  
  console.log(`Found ${allRecords?.length || 0} duplicates to delete`);
  
  if (!allRecords || allRecords.length === 0) {
    console.log('✅ No duplicates found');
    return { success: true, deletedCount: 0 };
  }
  
  const duplicateIds = allRecords.map(r => r.id);
  
  // Delete in batches of 50 to avoid timeouts
  let deletedCount = 0;
  for (let i = 0; i < duplicateIds.length; i += 50) {
    const batch = duplicateIds.slice(i, i + 50);
    const { error: deleteError } = await supabase
      .from('all_appointments')
      .delete()
      .in('id', batch);
    
    if (deleteError) {
      console.error(`❌ Error deleting batch ${i / 50 + 1}:`, deleteError);
    } else {
      deletedCount += batch.length;
      console.log(`✅ Deleted batch ${i / 50 + 1}: ${batch.length} records`);
    }
  }
  
  console.log(`🎉 Cleanup complete! Deleted ${deletedCount} duplicates`);
  return { success: true, deletedCount };
};
