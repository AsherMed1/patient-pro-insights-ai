import { supabase } from '@/integrations/supabase/client';

/**
 * Cleans up duplicate leads in the new_leads table
 * Strategy: Keep the oldest record (first created_at), delete newer duplicates
 */
export const cleanupDuplicateLeads = async () => {
  console.log('🧹 Starting duplicate leads cleanup...');
  
  try {
    // Fetch all leads ordered by created_at
    const { data: allLeads, error: fetchError } = await supabase
      .from('new_leads')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return { success: false, error: fetchError };
    }

    if (!allLeads || allLeads.length === 0) {
      console.log('No leads found');
      return { success: true, deletedCount: 0 };
    }

    console.log(`📊 Total leads: ${allLeads.length}`);

    // Group leads by potential duplicate identifiers
    const seenByContactId = new Map<string, any>();
    const seenByPhone = new Map<string, any>();
    const seenByNameProject = new Map<string, any>();
    
    const duplicateIds: string[] = [];
    const deletionLog: any[] = [];

    for (const lead of allLeads) {
      let isDuplicate = false;
      let duplicateReason = '';
      let keptRecord = null;

      // Check for contact_id duplicates
      if (lead.contact_id) {
        const key = `${lead.project_name}:${lead.contact_id}`;
        if (seenByContactId.has(key)) {
          isDuplicate = true;
          duplicateReason = 'contact_id';
          keptRecord = seenByContactId.get(key);
        } else {
          seenByContactId.set(key, lead);
        }
      }

      // Check for phone number duplicates (only if not already marked duplicate)
      if (!isDuplicate && lead.phone_number) {
        const key = `${lead.project_name}:${lead.phone_number}`;
        if (seenByPhone.has(key)) {
          isDuplicate = true;
          duplicateReason = 'phone_number';
          keptRecord = seenByPhone.get(key);
        } else {
          seenByPhone.set(key, lead);
        }
      }

      // Check for name + project duplicates (only if not already marked duplicate)
      if (!isDuplicate) {
        const key = `${lead.project_name}:${lead.lead_name}`;
        if (seenByNameProject.has(key)) {
          isDuplicate = true;
          duplicateReason = 'name_project';
          keptRecord = seenByNameProject.get(key);
        } else {
          seenByNameProject.set(key, lead);
        }
      }

      // If this is a duplicate, mark it for deletion
      if (isDuplicate) {
        duplicateIds.push(lead.id);
        deletionLog.push({
          deleted_id: lead.id,
          deleted_lead: lead.lead_name,
          deleted_contact_id: lead.contact_id,
          deleted_created_at: lead.created_at,
          kept_id: keptRecord.id,
          kept_created_at: keptRecord.created_at,
          reason: duplicateReason,
          project: lead.project_name
        });
      }
    }

    console.log(`🔍 Found ${duplicateIds.length} duplicate leads`);
    
    if (duplicateIds.length === 0) {
      console.log('✅ No duplicates to clean up');
      return { success: true, deletedCount: 0, log: [] };
    }

    // Log duplicates before deletion
    console.log('📋 Duplicate leads to be deleted:');
    deletionLog.forEach(log => {
      console.log(`  - ${log.deleted_lead} (${log.project})`);
      console.log(`    Reason: ${log.reason}`);
      console.log(`    Deleting: ${log.deleted_id} (created ${log.deleted_created_at})`);
      console.log(`    Keeping: ${log.kept_id} (created ${log.kept_created_at})`);
    });

    // Delete duplicates in batches
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize);
      
      const { error: deleteError } = await supabase
        .from('new_leads')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError);
        return { success: false, error: deleteError, deletedCount: totalDeleted, log: deletionLog };
      }

      totalDeleted += batch.length;
      console.log(`✅ Deleted batch ${i / batchSize + 1}: ${batch.length} records`);
    }

    console.log(`🎉 Successfully deleted ${totalDeleted} duplicate leads`);
    return { success: true, deletedCount: totalDeleted, log: deletionLog };

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
    return { success: false, error };
  }
};
