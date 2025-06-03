
import React from 'react';
import { AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FailedRecord {
  originalData: any;
  error: string;
  rowIndex: number;
}

interface CsvImportResult {
  success: number;
  errors: string[];
  failedRecords: FailedRecord[];
  originalHeaders: string[];
}

interface ImportResultProps {
  result: CsvImportResult;
  onDownloadFailedRecords?: () => void;
}

const ImportResult = ({ result, onDownloadFailedRecords }: ImportResultProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">
          Successfully imported {result.success} appointments
        </span>
      </div>

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                {result.errors.length} errors occurred:
              </span>
            </div>
            {result.failedRecords && result.failedRecords.length > 0 && onDownloadFailedRecords && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadFailedRecords}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Failed Records
              </Button>
            )}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
            {result.errors.map((error, index) => (
              <div key={index} className="text-sm text-red-700">
                {error}
              </div>
            ))}
          </div>
          {result.failedRecords && result.failedRecords.length > 0 && (
            <div className="text-sm text-gray-600 mt-2">
              💡 Download the failed records CSV to fix issues and re-import
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportResult;
