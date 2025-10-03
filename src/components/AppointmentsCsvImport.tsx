
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

interface CsvImportResult {
  success: number;
  errors: string[];
}

const AppointmentsCsvImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      'date_appointment_created',
      'date_of_appointment',
      'project_name',
      'lead_name',
      'lead_email',
      'lead_phone_number',
      'calendar_name',
      'requested_time',
      'stage_booked',
      'showed',
      'confirmed',
      'agent',
      'agent_number',
      'ghl_id',
      'confirmed_number',
      'status',
      'procedure_ordered'
    ];

    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'appointments_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Handle CSV with quoted values that may contain commas
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        row[header] = value === '' ? null : value;
      });

      rows.push(row);
    }

    return rows;
  };

  const parseDateString = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    try {
      // Handle various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch {
      return null;
    }
  };

  const validateAndTransformRow = (row: any): any => {
    // Support both standard format and Premier Vascular format
    const isStandardFormat = 'date_appointment_created' in row && 'project_name' in row;
    const isPremierFormat = 'Appt Date' in row || 'First Name' in row;

    let transformedRow: any = {};

    if (isStandardFormat) {
      // Standard format
      if (!row.date_appointment_created || !row.project_name || !row.lead_name) {
        throw new Error('Missing required fields: date_appointment_created, project_name, or lead_name');
      }

      transformedRow = {
        date_appointment_created: row.date_appointment_created,
        date_of_appointment: row.date_of_appointment || null,
        project_name: row.project_name,
        lead_name: row.lead_name,
        lead_email: row.lead_email || null,
        lead_phone_number: row.lead_phone_number || null,
        calendar_name: row.calendar_name || null,
        requested_time: row.requested_time || null,
        stage_booked: row.stage_booked || null,
        showed: row.showed === 'true' || row.showed === '1' ? true : row.showed === 'false' || row.showed === '0' ? false : null,
        confirmed: row.confirmed === 'true' || row.confirmed === '1' ? true : row.confirmed === 'false' || row.confirmed === '0' ? false : null,
        agent: row.agent || null,
        agent_number: row.agent_number || null,
        ghl_id: row.ghl_id || null,
        confirmed_number: row.confirmed_number || null,
        status: row.status || null,
        procedure_ordered: row.procedure_ordered === 'true' || row.procedure_ordered === '1' ? true : row.procedure_ordered === 'false' || row.procedure_ordered === '0' ? false : null,
        dob: row.dob || null,
        detected_insurance_provider: row.detected_insurance_provider || null,
        detected_insurance_id: row.detected_insurance_id || null,
        detected_insurance_plan: row.detected_insurance_plan || null,
        patient_intake_notes: row.patient_intake_notes || row.notes || null
      };
    } else if (isPremierFormat) {
      // Premier Vascular format
      const firstName = row['First Name'] || '';
      const lastName = row['Last Name'] || '';
      const leadName = `${firstName} ${lastName}`.trim();
      
      if (!leadName) {
        throw new Error('Missing First Name and Last Name');
      }

      const apptDate = parseDateString(row['Appt Date']);
      const createdDate = parseDateString(row['Created Date']) || parseDateString(row['Appt Date']);
      
      transformedRow = {
        date_appointment_created: createdDate || new Date().toISOString().split('T')[0],
        date_of_appointment: apptDate,
        project_name: 'Premier Vascular', // Default to Premier Vascular
        lead_name: leadName,
        lead_email: row['Email'] || null,
        lead_phone_number: row['Phone #']?.replace(/\D/g, '') || null, // Remove non-digits
        calendar_name: row['Calendar Location'] || null,
        requested_time: null,
        stage_booked: null,
        showed: row['Status']?.toLowerCase().includes('showed') ? true : null,
        confirmed: null,
        agent: null,
        agent_number: null,
        ghl_id: null,
        confirmed_number: null,
        status: row['Status'] || null,
        procedure_ordered: row['Procedure Ordered'] === 'TRUE' || row['Procedure Ordered'] === 'true' || row['Procedure Ordered'] === '1',
        dob: parseDateString(row['DOB']),
        detected_insurance_provider: row['Insurance Provider'] || null,
        detected_insurance_id: row['Insurance ID'] || null,
        detected_insurance_plan: row['Insurance Plan'] || null,
        patient_intake_notes: [
          row['Notes'],
          row['Clinic Notes'],
          row['Address'] ? `Address: ${row['Address']}` : null,
          row['Group #'] ? `Group #: ${row['Group #']}` : null
        ].filter(Boolean).join('\n\n') || null
      };
    } else {
      throw new Error('Unrecognized CSV format');
    }

    return transformedRow;
  };

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

      const errors: string[] = [];
      const validRows: any[] = [];

      // Validate and transform each row
      rows.forEach((row, index) => {
        try {
          const transformedRow = validateAndTransformRow(row);
          validRows.push(transformedRow);
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error.message}`);
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
          const { error } = await supabase
            .from('all_appointments')
            .insert(batch);

          if (error) throw error;
          successCount += batch.length;
        } catch (error) {
          console.error('Batch insert error:', error);
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        }
      }

      setResult({
        success: successCount,
        errors
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

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Import Appointments from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file to import historical appointments data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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
        </div>

        {result && (
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
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Required fields:</strong> date_appointment_created, project_name, lead_name</p>
          <p><strong>Date format:</strong> YYYY-MM-DD</p>
          <p><strong>Time format:</strong> HH:MM:SS</p>
          <p><strong>Boolean fields:</strong> Use 'true'/'false' or '1'/'0'</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentsCsvImport;
