
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImportTypeSelectorProps {
  importType: string;
  onImportTypeChange: (value: string) => void;
}

const ImportTypeSelector = ({ importType, onImportTypeChange }: ImportTypeSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Import Type</label>
      <Select value={importType} onValueChange={onImportTypeChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select import type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="appointments">Appointments</SelectItem>
          <SelectItem value="calls">Calls</SelectItem>
          <SelectItem value="leads">Leads</SelectItem>
          <SelectItem value="ad_spend">Ad Spend</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ImportTypeSelector;
