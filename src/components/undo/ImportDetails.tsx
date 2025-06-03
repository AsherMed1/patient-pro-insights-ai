
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { getEmoji, getDisplayName } from '@/utils/importTypeUtils';

interface ImportDetailsProps {
  lastImport: any;
}

const ImportDetails = ({ lastImport }: ImportDetailsProps) => {
  return (
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
  );
};

export default ImportDetails;
