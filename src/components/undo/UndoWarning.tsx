
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { getDisplayName } from '@/utils/importTypeUtils';

interface UndoWarningProps {
  lastImport: any;
}

const UndoWarning = ({ lastImport }: UndoWarningProps) => {
  return (
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
  );
};

export default UndoWarning;
