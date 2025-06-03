
import { supabase } from '@/integrations/supabase/client';

export interface ImportTrackingData {
  importType: 'appointments' | 'leads' | 'calls' | 'ad_spend';
  fileName: string;
  recordsImported: number;
  recordsFailed: number;
  importedRecordIds: string[];
  importSummary?: any;
  importedBy?: string;
}

export const trackCsvImport = async (data: ImportTrackingData): Promise<string | null> => {
  try {
    const { data: result, error } = await supabase
      .from('csv_import_history')
      .insert([{
        import_type: data.importType,
        file_name: data.fileName,
        records_imported: data.recordsImported,
        records_failed: data.recordsFailed,
        imported_record_ids: data.importedRecordIds,
        import_summary: data.importSummary || {},
        imported_by: data.importedBy || 'System',
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Error tracking CSV import:', error);
      return null;
    }

    return result.id;
  } catch (error) {
    console.error('Error tracking CSV import:', error);
    return null;
  }
};
