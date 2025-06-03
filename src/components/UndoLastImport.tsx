
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Undo2 } from 'lucide-react';
import { useUndoImport } from '@/hooks/useUndoImport';
import { getDisplayName } from '@/utils/importTypeUtils';
import ImportTypeSelector from '@/components/undo/ImportTypeSelector';
import ImportDetails from '@/components/undo/ImportDetails';
import UndoWarning from '@/components/undo/UndoWarning';

const UndoLastImport = () => {
  const [importType, setImportType] = useState<string>('appointments');
  const { loading, lastImport, findLastImport, undoImport } = useUndoImport();

  useEffect(() => {
    findLastImport(importType);
  }, [importType]);

  const handleRefresh = () => {
    findLastImport(importType);
  };

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
          <ImportTypeSelector 
            importType={importType} 
            onImportTypeChange={setImportType} 
          />

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
                onClick={handleRefresh}
                className="mt-4"
              >
                Refresh
              </Button>
            </div>
          )}

          {!loading && lastImport && (
            <div className="space-y-4">
              <ImportDetails lastImport={lastImport} />
              <UndoWarning lastImport={lastImport} />
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
