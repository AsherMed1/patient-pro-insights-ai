
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { Undo2, AlertTriangle } from 'lucide-react';

const UndoLastImport = () => {
  const [loading, setLoading] = useState(false);
  const [lastImport, setLastImport] = useState<any>(null);
  const { toast } = useToast();

  const findLastCallsImport = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('csv_import_history')
        .select('*')
        .eq('import_type', 'calls')
        .eq('is_undone', false)
        .order('imported_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        toast({
          title: "No Import Found",
          description: "No recent calls import found to undo",
          variant: "destructive"
        });
        return;
      }

      setLastImport(data);
    } catch (error) {
      console.error('Error finding last import:', error);
      toast({
        title: "Error",
        description: "Failed to find last import",
        variant: "destructive"
      });
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

    try {
      setLoading(true);

      // Delete the imported call records
      const { error: deleteError } = await supabase
        .from('all_calls')
        .delete()
        .in('id', lastImport.imported_record_ids);

      if (deleteError) throw deleteError;

      // Mark the import as undone
      const { error: updateError } = await supabase
        .from('csv_import_history')
        .update({
          is_undone: true,
          undone_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lastImport.id);

      if (updateError) throw updateError;

      toast({
        title: "Import Undone",
        description: `Successfully removed ${lastImport.imported_record_ids.length} call records`,
      });

      setLastImport(null);

    } catch (error) {
      console.error('Error undoing import:', error);
      toast({
        title: "Error",
        description: "Failed to undo import",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    findLastCallsImport();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Undo Last Calls Import
          </CardTitle>
          <CardDescription>
            Find and undo your most recent calls CSV import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading...</div>
            </div>
          )}

          {!loading && !lastImport && (
            <div className="text-center py-8">
              <div className="text-gray-500">No recent calls import found to undo</div>
              <Button 
                variant="outline" 
                onClick={findLastCallsImport}
                className="mt-4"
              >
                Refresh
              </Button>
            </div>
          )}

          {!loading && lastImport && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="font-medium">
                      📞 {lastImport.file_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Imported: {formatDateTimeForTable(lastImport.imported_at)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-medium text-green-600">
                          {lastImport.records_imported} imported
                        </span>
                      </div>
                      {lastImport.records_failed > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-red-600">
                            {lastImport.records_failed} failed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800">Warning</div>
                    <div className="text-sm text-yellow-700 mt-1">
                      This will permanently delete {lastImport.imported_record_ids?.length || 0} call records 
                      from your database. This action cannot be reversed.
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                variant="destructive" 
                onClick={undoImport}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Undoing Import...' : `Undo Import (Delete ${lastImport.imported_record_ids?.length || 0} Records)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UndoLastImport;
