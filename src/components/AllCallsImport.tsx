
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { parseCSV } from '@/utils/csvParser';
import { trackCsvImport } from '@/utils/csvImportTracker';

interface CallRecord {
  lead_name: string;
  lead_phone_number: string;
  project_name: string;
  date: string;
  call_datetime: string;
  direction: string;
  status: string;
  duration_seconds?: number;
  agent?: string;
  recording_url?: string;
  call_summary?: string;
}

interface FailedRecord {
  originalData: any;
  error: string;
  rowIndex: number;
}

interface ImportResult {
  success: number;
  errors: string[];
  failedRecords: FailedRecord[];
  skipped?: number;
}

const AllCallsImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      'lead_name', 
      'lead_phone_number', 
      'project_name', 
      'date', 
      'call_datetime', 
      'direction', 
      'status',
      'duration_seconds',
      'agent',
      'recording_url',
      'call_summary'
    ];
    const sampleData = [
      [
        'John Doe', 
        '+1234567890', 
        'Medical Center Campaign', 
        '2024-01-15', 
        '2024-01-15T14:30:00Z', 
        'outbound', 
        'lead_answered',
        '180',
        'Agent Smith',
        'https://example.com/recording.mp3',
        'Lead interested in procedure'
      ],
      [
        'Jane Smith', 
        '+1987654321', 
        'Dental Practice Campaign', 
        '2024-01-15', 
        '2024-01-15T15:45:00Z', 
        'inbound', 
        'no_answer',
        '0',
        'Agent Jones',
        '',
        'No answer, left voicemail'
      ]
    ];
    
    const csvContent = [headers, ...sampleData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'all_calls_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const validateAndTransformCallRow = (row: any, rowIndex: number): { record?: CallRecord; error?: string } => {
    // Check required fields
    if (!row.lead_name || !row.lead_phone_number || !row.project_name || 
        !row.date || !row.call_datetime || !row.direction || !row.status) {
      return { 
        error: `Missing required fields (lead_name, lead_phone_number, project_name, date, call_datetime, direction, status)` 
      };
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row.date)) {
      return { 
        error: `Invalid date format. Use YYYY-MM-DD` 
      };
    }

    // Validate call_datetime format (ISO 8601)
    const callDateTime = new Date(row.call_datetime);
    if (isNaN(callDateTime.getTime())) {
      return { 
        error: `Invalid call_datetime format. Use ISO 8601 format (e.g., 2024-01-15T14:30:00Z)` 
      };
    }

    // Validate direction
    const validDirections = ['inbound', 'outbound'];
    if (!validDirections.includes(row.direction.toLowerCase())) {
      return { 
        error: `Invalid direction. Must be 'inbound' or 'outbound'` 
      };
    }

    // Validate duration_seconds if provided
    let durationSeconds = 0;
    if (row.duration_seconds && row.duration_seconds !== '') {
      const duration = parseInt(row.duration_seconds);
      if (isNaN(duration) || duration < 0) {
        return { 
          error: `Duration must be a valid non-negative number` 
        };
      }
      durationSeconds = duration;
    }

    return {
      record: {
        lead_name: row.lead_name,
        lead_phone_number: row.lead_phone_number,
        project_name: row.project_name,
        date: row.date,
        call_datetime: callDateTime.toISOString(),
        direction: row.direction.toLowerCase(),
        status: row.status,
        duration_seconds: durationSeconds,
        agent: row.agent || null,
        recording_url: row.recording_url || null,
        call_summary: row.call_summary || null
      }
    };
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('No data found in CSV file');
      }

      const errors: string[] = [];
      const validRows: any[] = [];
      const failedRecords: FailedRecord[] = [];
      const importedRecordIds: string[] = [];

      // Validate and transform each row
      rows.forEach((row, index) => {
        const result = validateAndTransformCallRow(row, index);
        if (result.error) {
          const errorMessage = `Row ${index + 2}: ${result.error}`;
          errors.push(errorMessage);
          failedRecords.push({
            originalData: row,
            error: result.error,
            rowIndex: index + 2
          });
        } else if (result.record) {
          validRows.push(result.record);
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
            .from('all_calls')
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
          importType: 'calls',
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

      setImportResults({
        success: successCount,
        errors,
        failedRecords
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} call records${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import All Calls Data
          </CardTitle>
          <CardDescription>
            Upload CSV files containing call records. Required columns: lead_name, lead_phone_number, project_name, date, call_datetime, direction, status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={importing}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || importing}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResults.errors.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                <div className="text-sm text-green-700">Successfully Imported</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                <div className="text-sm text-red-700">Errors</div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-700">Errors:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResults.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AllCallsImport;
