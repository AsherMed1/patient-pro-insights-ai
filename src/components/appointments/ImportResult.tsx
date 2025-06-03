
import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface CsvImportResult {
  success: number;
  errors: string[];
}

interface ImportResultProps {
  result: CsvImportResult;
}

const ImportResult = ({ result }: ImportResultProps) => {
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
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              {result.errors.length} errors occurred:
            </span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
            {result.errors.map((error, index) => (
              <div key={index} className="text-sm text-red-700">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportResult;
