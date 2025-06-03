
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { trackCsvImport } from '@/utils/csvImportTracker';

interface CsvImportResult {
  success: number;
  errors: string[];
}

const LeadsCsvImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      'lead_name',
      'project_name', 
      'date',
      'times_called',
      'first_name',
      'last_name',
      'phone_number',
      'email',
      'dob',
      'status',
      'procedure_ordered',
      'appt_date',
      'calendar_location',
      'insurance_provider',
      'insurance_id',
      'insurance_plan',
      'group_number',
      'address',
      'notes',
      'knee_pain_duration',
      'knee_osteoarthritis_diagnosis',
      'gae_candidate',
      'trauma_injury_onset',
      'pain_severity_scale',
      'symptoms_description',
      'knee_treatments_tried',
      'fever_chills',
      'knee_imaging',
      'heel_morning_pain',
      'heel_pain_improves_rest',
      'heel_pain_duration',
      'heel_pain_exercise_frequency',
      'plantar_fasciitis_treatments',
      'plantar_fasciitis_mobility_impact',
      'plantar_fasciitis_imaging'
    ];

    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leads_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        row[header] = value === '' ? null : value;
      });

      rows.push(row);
    }

    return rows;
  };

  const validateAndTransformRow = (row: any): any => {
    // Required fields validation
    if (!row.lead_name || !row.project_name || !row.date) {
      throw new Error('Missing required fields: lead_name, project_name, or date');
    }

    // Transform and validate data types
    const transformedRow: any = {
      lead_name: row.lead_name,
      project_name: row.project_name,
      date: row.date,
      times_called: row.times_called ? parseInt(row.times_called) || 0 : 0,
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      phone_number: row.phone_number || null,
      email: row.email || null,
      dob: row.dob || null,
      status: row.status || null,
      procedure_ordered: row.procedure_ordered === 'true' || row.procedure_ordered === '1',
      appt_date: row.appt_date || null,
      calendar_location: row.calendar_location || null,
      insurance_provider: row.insurance_provider || null,
      insurance_id: row.insurance_id || null,
      insurance_plan: row.insurance_plan || null,
      group_number: row.group_number || null,
      address: row.address || null,
      notes: row.notes || null,
      knee_pain_duration: row.knee_pain_duration || null,
      knee_osteoarthritis_diagnosis: row.knee_osteoarthritis_diagnosis === 'true' || row.knee_osteoarthritis_diagnosis === '1',
      gae_candidate: row.gae_candidate === 'true' || row.gae_candidate === '1',
      trauma_injury_onset: row.trauma_injury_onset === 'true' || row.trauma_injury_onset === '1',
      pain_severity_scale: row.pain_severity_scale ? parseInt(row.pain_severity_scale) || null : null,
      symptoms_description: row.symptoms_description || null,
      knee_treatments_tried: row.knee_treatments_tried || null,
      fever_chills: row.fever_chills === 'true' || row.fever_chills === '1',
      knee_imaging: row.knee_imaging === 'true' || row.knee_imaging === '1',
      heel_morning_pain: row.heel_morning_pain === 'true' || row.heel_morning_pain === '1',
      heel_pain_improves_rest: row.heel_pain_improves_rest === 'true' || row.heel_pain_improves_rest === '1',
      heel_pain_duration: row.heel_pain_duration || null,
      heel_pain_exercise_frequency: row.heel_pain_exercise_frequency || null,
      plantar_fasciitis_treatments: row.plantar_fasciitis_treatments || null,
      plantar_fasciitis_mobility_impact: row.plantar_fasciitis_mobility_impact === 'true' || row.plantar_fasciitis_mobility_impact === '1',
      plantar_fasciitis_imaging: row.plantar_fasciitis_imaging === 'true' || row.plantar_fasciitis_imaging === '1'
    };

    // Validate pain severity scale
    if (transformedRow.pain_severity_scale !== null && 
        (transformedRow.pain_severity_scale < 1 || transformedRow.pain_severity_scale > 10)) {
      throw new Error('Pain severity scale must be between 1 and 10');
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
      const importedRecordIds: string[] = [];

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
          const { data, error } = await supabase
            .from('new_leads')
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
      console.log('About to track import with:', {
        importType: 'leads',
        fileName: file.name,
        recordsImported: successCount,
        recordsFailed: errors.length,
        importedRecordIds: importedRecordIds
      });

      const trackingResult = await trackCsvImport({
        importType: 'leads',
        fileName: file.name,
        recordsImported: successCount,
        recordsFailed: errors.length,
        importedRecordIds: importedRecordIds,
        importSummary: {
          totalRecords: rows.length,
          validRecords: validRows.length,
          batchesProcessed: Math.ceil(validRows.length / batchSize),
          errors: errors
        }
      });

      console.log('Import tracking result:', trackingResult);

      setResult({
        success: successCount,
        errors
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} leads${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
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
        <CardTitle>Import Leads from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file to import historical leads data
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
                Successfully imported {result.success} leads
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
          <p><strong>Required fields:</strong> lead_name, project_name, date</p>
          <p><strong>Date format:</strong> YYYY-MM-DD</p>
          <p><strong>Boolean fields:</strong> Use 'true'/'false' or '1'/'0'</p>
          <p><strong>Pain severity scale:</strong> Must be between 1-10</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsCsvImport;
