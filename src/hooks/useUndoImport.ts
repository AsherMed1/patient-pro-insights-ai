
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { getTableName, getDisplayName } from '@/utils/importTypeUtils';

export const useUndoImport = () => {
  const [loading, setLoading] = useState(false);
  const [lastImport, setLastImport] = useState<any>(null);
  const { toast } = useToast();

  const findLastImport = async (importType: string) => {
    try {
      setLoading(true);
      console.log('Finding last import for type:', importType);
      
      const { data, error } = await supabase
        .from('csv_import_history')
        .select('*')
        .eq('import_type', importType)
        .eq('is_undone', false)
        .order('imported_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error finding last import:', error);
        throw error;
      }

      if (!data) {
        toast({
          title: "No Import Found",
          description: `No recent ${getDisplayName(importType).toLowerCase()} import found to undo`,
          variant: "destructive"
        });
        setLastImport(null);
        return;
      }

      console.log('Found import:', data);
      console.log('Import type from database:', data.import_type);
      console.log('Table name for this import type:', getTableName(data.import_type));
      setLastImport(data);
    } catch (error) {
      console.error('Error finding last import:', error);
      toast({
        title: "Error",
        description: "Failed to find last import",
        variant: "destructive"
      });
      setLastImport(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (tableName: string, batchIds: string[]) => {
    console.log(`Attempting to delete from table: ${tableName} with ${batchIds.length} IDs`);
    
    // Use type assertion to tell TypeScript the table name is valid
    const { error } = await supabase
      .from(tableName as any)
      .delete()
      .in('id', batchIds);
    
    if (error) {
      console.error(`Error deleting from ${tableName}:`, error);
      throw error;
    }
    
    console.log(`Successfully deleted ${batchIds.length} records from ${tableName}`);
  };

  const undoImport = async () => {
    if (!lastImport || !lastImport.imported_record_ids || lastImport.imported_record_ids.length === 0) {
      toast({
        title: "Cannot Undo",
        description: "No record IDs found for this import",
        variant: "destructive"
      });
      return;
    }

    const tableName = getTableName(lastImport.import_type);
    console.log('Import type:', lastImport.import_type);
    console.log('Resolved table name:', tableName);
    
    if (!tableName) {
      toast({
        title: "Error",
        description: "Unknown import type",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const totalRecords = lastImport.imported_record_ids.length;
      console.log(`Starting batch deletion of ${totalRecords} records from ${tableName}`);
      console.log('Import details:', {
        id: lastImport.id,
        import_type: lastImport.import_type,
        file_name: lastImport.file_name,
        imported_at: lastImport.imported_at
      });

      // Delete in batches of 100 to avoid URL length limits and improve reliability
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < lastImport.imported_record_ids.length; i += batchSize) {
        batches.push(lastImport.imported_record_ids.slice(i, i + batchSize));
      }

      console.log(`Processing ${batches.length} batches of up to ${batchSize} records each`);

      // Process batches sequentially to avoid overwhelming the database
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Deleting batch ${i + 1}/${batches.length} (${batch.length} records) from table ${tableName}`);
        
        await deleteBatch(tableName, batch);
        
        // Small delay between batches to be gentle on the database
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('All batches deleted successfully, marking import as undone');

      // Mark the import as undone
      const { error: updateError } = await supabase
        .from('csv_import_history')
        .update({
          is_undone: true,
          undone_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lastImport.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      toast({
        title: "Import Undone",
        description: `Successfully removed ${totalRecords} ${getDisplayName(lastImport.import_type).toLowerCase()} records from ${tableName}`,
      });

      setLastImport(null);

    } catch (error) {
      console.error('Error undoing import:', error);
      toast({
        title: "Error",
        description: `Failed to undo import: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    lastImport,
    findLastImport,
    undoImport
  };
};
