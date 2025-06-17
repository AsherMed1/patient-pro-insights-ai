
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SortFilterProps {
  onSortChange: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void;
}

const SortFilter = ({ onSortChange }: SortFilterProps) => {
  const handleSortChange = (value: string) => {
    if (value === 'none') {
      onSortChange(null, 'asc');
      return;
    }
    
    const [sortBy, sortOrder] = value.split('-');
    onSortChange(sortBy, sortOrder as 'asc' | 'desc');
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium">Sort by:</label>
      <Select onValueChange={handleSortChange} defaultValue="none">
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select sorting option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Default (no sorting)</SelectItem>
          <SelectItem value="date_of_appointment-asc">
            <div className="flex items-center space-x-2">
              <ArrowUp className="h-3 w-3" />
              <span>Appointment Date (Closest first)</span>
            </div>
          </SelectItem>
          <SelectItem value="date_of_appointment-desc">
            <div className="flex items-center space-x-2">
              <ArrowDown className="h-3 w-3" />
              <span>Appointment Date (Furthest first)</span>
            </div>
          </SelectItem>
          <SelectItem value="date_appointment_created-asc">
            <div className="flex items-center space-x-2">
              <ArrowUp className="h-3 w-3" />
              <span>Date Confirmed (Closest first)</span>
            </div>
          </SelectItem>
          <SelectItem value="date_appointment_created-desc">
            <div className="flex items-center space-x-2">
              <ArrowDown className="h-3 w-3" />
              <span>Date Confirmed (Furthest first)</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default SortFilter;
