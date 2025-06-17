
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface AppointmentsHeaderProps {
  projectFilter?: string;
  totalRecords: number;
  filteredCount: number;
  isProjectPortal?: boolean;
}

const AppointmentsHeader = ({
  projectFilter,
  totalRecords,
  filteredCount,
  isProjectPortal = false
}: AppointmentsHeaderProps) => {
  return (
    <CardHeader className="pb-4">
      <CardTitle className="text-xl md:text-2xl flex items-center justify-between">
        <span>
          {projectFilter ? `${projectFilter} Appointments` : 'All Appointments'}
        </span>
        <div className="text-sm font-normal text-muted-foreground">
          {filteredCount} of {totalRecords} appointments
        </div>
      </CardTitle>
      <CardDescription className="text-sm">
        Manage and track appointment statuses
        {isProjectPortal && ' (Confirmed appointments only)'}
        {projectFilter && ` for ${projectFilter}`}
        <span className="block text-xs text-muted-foreground mt-1">
          Times displayed in Central Time Zone
        </span>
      </CardDescription>
    </CardHeader>
  );
};

export default AppointmentsHeader;
