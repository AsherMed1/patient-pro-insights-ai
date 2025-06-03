
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { parseCSV } from '@/utils/csvParser';

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

const AllCallsImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: Array<{ row: number; error: string }>;
    skipped?: number;
  } | null>(null);
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

  const validateRecord = (record: any, rowIndex: number): { isValid: boolean; error?: string } => {
    // Check required fields
    if (!record.lead_name || !record.lead_phone_number || !record.project_name || 
        !record.date || !record.call_datetime || !record.direction || !record.status) {
      return { 
        isValid: false, 
        error: `Row ${rowIndex + 1}: Missing required fields (lead_name, lead_phone_number, project_name, date, call_datetime, direction, status)` 
      };
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record.date)) {
      return { 
        isValid: false, 
        error: `Row ${rowIndex + 1}: Invalid date format. Use YYYY-MM-DD` 
      };
    }

    // Validate call_datetime format (ISO 8601)
    const callDateTime = new Date(record.call_datetime);
    if (isNaN(callDateTime.getTime())) {
      return { 
        isValid: false, 
        error: `Row ${rowIndex + 1}: Invalid call_datetime format. Use ISO 8601 format (e.g., 2024-01-15T14:30:00Z)` 
      };
    }

    // Validate direction
    const validDirections = ['inbound', 'outbound'];
    if (!validDirections.includes(record.direction.toLowerCase())) {
      return { 
        isValid: false, 
        error: `Row ${rowIndex + 1}: Invalid direction. Must be 'inbound' or 'outbound'` 
      };
    }

    // Validate duration_seconds if provided
    if (record.duration_seconds && record.duration_seconds !== '') {
      const duration = parseInt(record.duration_seconds);
      if (isNaN(duration) || duration < 0) {
        return { 
          isValid: false, 
          error: `Row ${rowIndex + 1}: Duration must be a valid non-negative number` 
        };
      }
    }

    return { isValid: true };
  };

  const submitCallRecord = async (record: CallRecord): Promise<{ success: boolean; isDuplicate?: boolean }> => {
    try {
      const response = await fetch('https://bhabbokbhnqioykjimix.supabase.co/functions/v1/all-calls-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYWJib2tiaG5xaW95a2ppbWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NDU4MTQsImV4cCI6MjA2NDIyMTgxNH0.2Fo-x0RDwlA1BpEj-Gic3zeRDRL38YJ0PaUpYl6RB5w`
        },
        body: JSON.stringify(record)
      });

      if (response.status === 409) {
        // Conflict - likely a duplicate
        return { success: false, isDuplicate: true };
      }

      return { success: response.ok };
    } catch (error) {
      console.error('Error submitting call record:', error);
      return { success: false };
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        toast({
          title: "Error",
          description: "No valid records found in CSV file",
          variant: "destructive"
        });
        return;
      }

      const results = {
        success: 0,
        errors: [] as Array<{ row: number; error: string }>,
        skipped: 0
      };

      // Validate all records first
      const validatedRecords: Array<{ record: CallRecord; rowIndex: number }> = [];
      
      for (let i = 0; i < records.length; i++) {
        const validation = validateRecord(records[i], i);
        if (validation.isValid) {
          validatedRecords.push({
            record: {
              lead_name: records[i].lead_name,
              lead_phone_number: records[i].lead_phone_number,
              project_name: records[i].project_name,
              date: records[i].date,
              call_datetime: records[i].call_datetime,
              direction: records[i].direction,
              status: records[i].status,
              duration_seconds: records[i].duration_seconds ? parseInt(records[i].duration_seconds) : 0,
              agent: records[i].agent || null,
              recording_url: records[i].recording_url || null,
              call_summary: records[i].call_summary || null
            },
            rowIndex: i
          });
        } else {
          results.errors.push({ row: i + 1, error: validation.error! });
        }
      }

      // Submit valid records
      for (const { record, rowIndex } of validatedRecords) {
        const result = await submitCallRecord(record);
        if (result.success) {
          results.success++;
        } else if (result.isDuplicate) {
          results.skipped++;
        } else {
          results.errors.push({ 
            row: rowIndex + 1, 
            error: 'Failed to save record to database' 
          });
        }
      }

      setImportResults(results);

      if (results.success > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${results.success} call records${results.skipped ? `, skipped ${results.skipped} duplicates` : ''}`,
        });
      }

      if (results.errors.length > 0) {
        toast({
          title: "Import Warnings",
          description: `${results.errors.length} records had errors`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error processing CSV:', error);
      toast({
        title: "Error",
        description: "Failed to process CSV file",
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
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                <div className="text-sm text-green-700">Successfully Imported</div>
              </div>
              {importResults.skipped !== undefined && importResults.skipped > 0 && (
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                  <div className="text-sm text-yellow-700">Skipped (Duplicates)</div>
                </div>
              )}
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
                      {error.error}
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
