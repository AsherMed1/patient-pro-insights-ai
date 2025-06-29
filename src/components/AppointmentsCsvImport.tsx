
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { parseCSV } from '@/utils/csvParser';
import { validateAndTransformAppointmentRow } from '@/utils/appointmentValidator';
import { trackCsvImport } from '@/utils/csvImportTracker';
import { exportFailedRecordsToCsv } from '@/utils/failedRecordsExporter';
import CsvFileUpload from './appointments/CsvFileUpload';
import ImportResult from './appointments/ImportResult';
import ImportGuidelines from './appointments/ImportGuidelines';

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

const AppointmentsCsvImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a CSV file to import",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('No data found in CSV file');
      }

      // Extract headers from the first row for export purposes
      const originalHeaders = Object.keys(rows[0]);

      const errors: string[] = [];
      const validRows: any[] = [];
      const failedRecords: FailedRecord[] = [];
      const importedRecordIds: string[] = [];

      // Validate and transform each row
      rows.forEach((row, index) => {
        try {
          const transformedRow = validateAndTransformAppointmentRow(row);
          validRows.push(transformedRow);
        } catch (error) {
          const errorMessage = `Row ${index + 2}: ${error.message}`;
          errors.push(errorMessage);
          failedRecords.push({
            originalData: row,
            error: error.message,
            rowIndex: index + 2
          });
        }
      });

      // Get unique project names to ensure they exist
      const projectNames = [...new Set(validRows.map(row => row.project_name))];
      for (const projectName of projectNames) {
        const { data: existingProject } = await supabase
          .from('projects')
          .select('id')
          .eq('project_name', projectName)
          .maybeSingle();

        if (!existingProject) {
          await supabase
            .from('projects')
            .insert([{ project_name: projectName }]);
        }
      }

      // Insert valid rows in batches
      let successCount = 0;
      const batchSize = 100;
      
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('all_appointments')
            .insert(batch)
            .select('id');

          if (error) throw error;
          
          successCount += batch.length;
          if (data) {
            importedRecordIds.push(...data.map(record => record.id));
          }
        } catch (error) {
          console.error('Batch insert error:', error);
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        }
      }

      // Track the import in history
      if (importedRecordIds.length > 0 || errors.length > 0) {
        await trackCsvImport({
          importType: 'appointments',
          fileName: file.name,
          recordsImported: successCount,
          recordsFailed: failedRecords.length,
          importedRecordIds: importedRecordIds,
          importSummary: {
            totalRecords: rows.length,
            validRecords: validRows.length,
            batchesProcessed: Math.ceil(validRows.length / batchSize),
            errors: errors,
            failedRecordsCount: failedRecords.length
          }
        });
      }

      setResult({
        success: successCount,
        errors,
        failedRecords,
        originalHeaders
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} appointments${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadFailedRecords = () => {
    if (result?.failedRecords && result.originalHeaders) {
      exportFailedRecordsToCsv(result.failedRecords, result.originalHeaders);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Import Appointments from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file to import historical appointments data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CsvFileUpload
          file={file}
          onFileChange={setFile}
          onImport={handleImport}
          importing={importing}
        />

        {result && (
          <ImportResult 
            result={result} 
            onDownloadFailedRecords={handleDownloadFailedRecords}
          />
        )}

        <ImportGuidelines />
      </CardContent>
    </Card>
  );
};

export default AppointmentsCsvImport;
