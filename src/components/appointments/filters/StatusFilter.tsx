
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatusFilterProps {
  selectedStatus: string | null;
  onStatusChange: (status: string) => void;
}

const StatusFilter = ({ selectedStatus, onStatusChange }: StatusFilterProps) => {
  const statusOptions = [
    'Showed',
    'No Show', 
    'Cancelled',
    'Rescheduled',
    'Confirmed',
    'Welcome Call',
    'Won'
  ];

  return (
    <div className="flex-1 min-w-[200px]">
      <label className="text-sm font-medium mb-2 block">Filter by Status</label>
      <Select value={selectedStatus || 'all'} onValueChange={onStatusChange}>
        <SelectTrigger>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statusOptions.map(status => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StatusFilter;
