
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import AppointmentsCsvImport from '../AppointmentsCsvImport';

interface AppointmentsImportSectionProps {
  onImportComplete: () => void;
}

const AppointmentsImportSection = ({ onImportComplete }: AppointmentsImportSectionProps) => {
  const [showImport, setShowImport] = useState(false);

  const handleImportComplete = () => {
    setShowImport(false);
    onImportComplete();
  };

  if (showImport) {
    return (
      <div className="space-y-4">
        <AppointmentsCsvImport />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(false)}>
            Cancel
          </Button>
          <Button onClick={handleImportComplete}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Import Historical Appointments</CardTitle>
            <CardDescription>Upload past appointments data from CSV file</CardDescription>
          </div>
          <Button 
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
};

export default AppointmentsImportSection;
