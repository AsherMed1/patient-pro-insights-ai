
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Upload } from 'lucide-react';
import { downloadAppointmentTemplate } from '@/utils/appointmentTemplate';

interface CsvFileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onImport: () => void;
  importing: boolean;
}

const CsvFileUpload = ({ file, onFileChange, onImport, importing }: CsvFileUploadProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="csv-file">CSV File</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          disabled={importing}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={downloadAppointmentTemplate}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Template
        </Button>
        <Button 
          onClick={onImport} 
          disabled={!file || importing}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importing...' : 'Import CSV'}
        </Button>
      </div>
    </div>
  );
};

export default CsvFileUpload;
