
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
      console.log(`Deleting ${lastImport.imported_record_ids.length} records from ${tableName}`);

      // Delete the imported records
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', lastImport.imported_record_ids);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

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
        description: `Successfully removed ${lastImport.imported_record_ids.length} ${getDisplayName(lastImport.import_type).toLowerCase()} records`,
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
