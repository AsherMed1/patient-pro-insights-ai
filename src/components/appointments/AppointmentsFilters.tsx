
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import StatusFilter from './filters/StatusFilter';
import DateFilter from './filters/DateFilter';
import DateRangeFilter from './filters/DateRangeFilter';
import SearchFilter from './filters/SearchFilter';
import TagFilter from './filters/TagFilter';
import SortFilter from './filters/SortFilter';

interface AppointmentsFiltersProps {
  onStatusFilter?: (status: string | null) => void;
  onDateFilter?: (date: Date | null) => void;
  onDateRangeFilter?: (startDate: Date | null, endDate: Date | null) => void;
  onSearchFilter?: (searchTerm: string) => void;
  onTagFilter?: (tagId: string | null) => void;
  onSortChange?: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void;
  projectName?: string;
}

const AppointmentsFilters = ({
  onStatusFilter,
  onDateFilter,
  onDateRangeFilter,
  onSearchFilter,
  onTagFilter,
  onSortChange,
  projectName
}: AppointmentsFiltersProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {onSearchFilter && (
            <SearchFilter onSearchChange={onSearchFilter} />
          )}
          
          {onStatusFilter && (
            <StatusFilter onStatusChange={onStatusFilter} />
          )}
          
          {onDateFilter && (
            <DateFilter onDateChange={onDateFilter} />
          )}
          
          {onDateRangeFilter && (
            <DateRangeFilter onDateRangeChange={onDateRangeFilter} />
          )}
          
          {onTagFilter && projectName && (
            <TagFilter 
              onTagChange={onTagFilter}
              projectName={projectName}
            />
          )}
          
          {onSortChange && (
            <SortFilter onSortChange={onSortChange} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentsFilters;
