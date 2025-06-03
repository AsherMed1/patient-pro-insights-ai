
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { Undo2, AlertTriangle } from 'lucide-react';

const UndoLastImport = () => {
  const [loading, setLoading] = useState(false);
  const [lastImport, setLastImport] = useState<any>(null);
  const [importType, setImportType] = useState<string>('appointments');
  const { toast } = useToast();

  const getTableName = (type: string) => {
    switch (type) {
      case 'appointments':
        return 'all_appointments';
      case 'calls':
        return 'all_calls';
      case 'leads':
        return 'new_leads';
      case 'ad_spend':
        return 'facebook_ad_spend';
      default:
        return null;
    }
  };

  const getDisplayName = (type: string) => {
    switch (type) {
      case 'appointments':
        return 'Appointments';
      case 'calls':
        return 'Calls';
      case 'leads':
        return 'Leads';
      case 'ad_spend':
        return 'Ad Spend';
      default:
        return type;
    }
  };

  const getEmoji = (type: string) => {
    switch (type) {
      case 'appointments':
        return '📅';
      case 'calls':
        return '📞';
      case 'leads':
        return '👤';
      case 'ad_spend':
        return '💰';
      default:
        return '📄';
    }
  };

  const findLastImport = async () => {
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

  React.useEffect(() => {
    findLastImport();
  }, [importType]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Undo Last Import
          </CardTitle>
          <CardDescription>
            Select import type and undo your most recent CSV import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Import Type</label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select import type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointments">Appointments</SelectItem>
                <SelectItem value="calls">Calls</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="ad_spend">Ad Spend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading...</div>
            </div>
          )}

          {!loading && !lastImport && (
            <div className="text-center py-8">
              <div className="text-gray-500">
                No recent {getDisplayName(importType).toLowerCase()} import found to undo
              </div>
              <Button 
                variant="outline" 
                onClick={findLastImport}
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
                      {getEmoji(lastImport.import_type)} {lastImport.file_name}
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
                      This will permanently delete {lastImport.imported_record_ids?.length || 0} {getDisplayName(lastImport.import_type).toLowerCase()} records 
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
