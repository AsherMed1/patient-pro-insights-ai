import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { parseCSV } from '@/utils/csvParser';
import { trackCsvImport } from '@/utils/csvImportTracker';

interface AdSpendRecord {
  date: string;
  project_name: string;
  spend: number;
}

const AdSpendImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = ['date', 'project_name', 'spend'];
    const sampleData = [
      ['2024-01-01', 'Project Alpha', '150.00'],
      ['2024-01-02', 'Project Beta', '200.50'],
      ['2024-01-03', 'Project Alpha', '175.25']
    ];
    
    const csvContent = [headers, ...sampleData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'ad_spend_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const validateRecord = (record: any, rowIndex: number): { isValid: boolean; error?: string } => {
    if (!record.date || !record.project_name || record.spend === undefined) {
      return { 
        isValid: false, 
        error: `Row ${rowIndex + 1}: Missing required fields (date, project_name, spend)` 
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

    // Validate spend is a number
    const spend = parseFloat(record.spend);
    if (isNaN(spend) || spend < 0) {
      return { 
        isValid: false, 
        error: `Row ${rowIndex + 1}: Spend must be a valid positive number` 
      };
    }

    return { isValid: true };
  };

  const submitAdSpendRecord = async (record: AdSpendRecord): Promise<{ success: boolean; recordId?: string }> => {
    try {
      const response = await fetch('https://bhabbokbhnqioykjimix.supabase.co/functions/v1/facebook-ad-spend-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYWJib2tiaG5xaW95a2ppbWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NDU4MTQsImV4cCI6MjA2NDIyMTgxNH0.2Fo-x0RDwlA1BpEj-Gic3zeRDRL38YJ0PaUpYl6RB5w`
        },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, recordId: result.data?.id };
      }

      return { success: false };
    } catch (error) {
      console.error('Error submitting ad spend record:', error);
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
        errors: [] as Array<{ row: number; error: string }>
      };

      const importedRecordIds: string[] = [];

      // Validate all records first
      const validatedRecords: Array<{ record: AdSpendRecord; rowIndex: number }> = [];
      
      for (let i = 0; i < records.length; i++) {
        const validation = validateRecord(records[i], i);
        if (validation.isValid) {
          validatedRecords.push({
            record: {
              date: records[i].date,
              project_name: records[i].project_name,
              spend: parseFloat(records[i].spend)
            },
            rowIndex: i
          });
        } else {
          results.errors.push({ row: i + 1, error: validation.error! });
        }
      }

      // Submit valid records
      for (const { record } of validatedRecords) {
        const result = await submitAdSpendRecord(record);
        if (result.success && result.recordId) {
          results.success++;
          importedRecordIds.push(result.recordId);
        } else {
          results.errors.push({ 
            row: validatedRecords.findIndex(vr => vr.record === record) + 1, 
            error: 'Failed to save record to database' 
          });
        }
      }

      // Track the import in history
      if (importedRecordIds.length > 0 || results.errors.length > 0) {
        await trackCsvImport({
          importType: 'ad_spend',
          fileName: file.name,
          recordsImported: results.success,
          recordsFailed: results.errors.length,
          importedRecordIds: importedRecordIds,
          importSummary: {
            totalRecords: records.length,
            validRecords: validatedRecords.length,
            errors: results.errors
          }
        });
      }

      setImportResults(results);

      if (results.success > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${results.success} ad spend records`,
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
            Import Ad Spend Data
          </CardTitle>
          <CardDescription>
            Upload CSV files containing ad spend data. The CSV should have columns: date, project_name, spend
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

export default AdSpendImport;
