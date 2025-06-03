
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { Undo2, FileText, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

interface ImportHistoryRecord {
  id: string;
  import_type: 'appointments' | 'leads' | 'calls' | 'ad_spend';
  file_name: string;
  records_imported: number;
  records_failed: number;
  import_summary: any;
  imported_record_ids: string[];
  imported_at: string;
  imported_by: string | null;
  is_undone: boolean;
  undone_at: string | null;
}

const CsvImportHistoryManager = () => {
  const [imports, setImports] = useState<ImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingImport, setUndoingImport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('csv_import_history')
        .select('*')
        .order('imported_at', { ascending: false });

      if (error) throw error;
      setImports(data || []);
    } catch (error) {
      console.error('Error fetching import history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch import history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const undoImport = async (importRecord: ImportHistoryRecord) => {
    if (!importRecord.imported_record_ids || importRecord.imported_record_ids.length === 0) {
      toast({
        title: "Cannot Undo",
        description: "No record IDs found for this import",
        variant: "destructive"
      });
      return;
    }

    setUndoingImport(importRecord.id);

    try {
      // Get the appropriate table name based on import type
      const tableMap = {
        appointments: 'all_appointments',
        leads: 'new_leads',
        calls: 'all_calls',
        ad_spend: 'facebook_ad_spend'
      };

      const tableName = tableMap[importRecord.import_type];
      
      // Delete the imported records
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', importRecord.imported_record_ids);

      if (deleteError) throw deleteError;

      // Mark the import as undone
      const { error: updateError } = await supabase
        .from('csv_import_history')
        .update({
          is_undone: true,
          undone_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', importRecord.id);

      if (updateError) throw updateError;

      // Refresh the list
      await fetchImportHistory();

      toast({
        title: "Import Undone",
        description: `Successfully removed ${importRecord.imported_record_ids.length} records from ${importRecord.import_type}`,
      });

    } catch (error) {
      console.error('Error undoing import:', error);
      toast({
        title: "Error",
        description: "Failed to undo import",
        variant: "destructive"
      });
    } finally {
      setUndoingImport(null);
    }
  };

  const getImportTypeIcon = (type: string) => {
    switch (type) {
      case 'appointments': return '📅';
      case 'leads': return '👤';
      case 'calls': return '📞';
      case 'ad_spend': return '💰';
      default: return '📄';
    }
  };

  const getStatusBadge = (importRecord: ImportHistoryRecord) => {
    if (importRecord.is_undone) {
      return <Badge variant="destructive">Undone</Badge>;
    }
    if (importRecord.records_failed > 0) {
      return <Badge variant="secondary">Partial Success</Badge>;
    }
    return <Badge variant="default">Success</Badge>;
  };

  const filteredImports = imports.filter(imp => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return !imp.is_undone;
    if (activeTab === "undone") return imp.is_undone;
    return imp.import_type === activeTab;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV Import History
          </CardTitle>
          <CardDescription>
            View and manage all CSV import operations. You can undo imports to remove their data.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="undone">Undone</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="ad_spend">Ad Spend</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Import Records ({filteredImports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading import history...</div>
                </div>
              ) : filteredImports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No import records found</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredImports.map((importRecord) => (
                      <TableRow key={importRecord.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getImportTypeIcon(importRecord.import_type)}
                            </span>
                            <span className="capitalize">{importRecord.import_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {importRecord.file_name}
                        </TableCell>
                        <TableCell>
                          {formatDateTimeForTable(importRecord.imported_at)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-sm">{importRecord.records_imported} imported</span>
                            </div>
                            {importRecord.records_failed > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-sm">{importRecord.records_failed} failed</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(importRecord)}
                          {importRecord.is_undone && importRecord.undone_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Undone: {formatDateTimeForTable(importRecord.undone_at)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!importRecord.is_undone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => undoImport(importRecord)}
                              disabled={undoingImport === importRecord.id}
                              className="flex items-center gap-1"
                            >
                              {undoingImport === importRecord.id ? (
                                <span className="text-xs">Undoing...</span>
                              ) : (
                                <>
                                  <Undo2 className="h-3 w-3" />
                                  <span>Undo</span>
                                </>
                              )}
                            </Button>
                          )}
                          {importRecord.is_undone && (
                            <Badge variant="outline" className="text-gray-500">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Removed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CsvImportHistoryManager;
