
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
  searchTerm?: string;
  selectedStatus?: string | null;
  selectedDate?: Date | null;
  dateRange?: { start: Date | null; end: Date | null };
  selectedTag?: string | null;
  availableTags?: any[];
}

const AppointmentsFilters = ({
  onStatusFilter,
  onDateFilter,
  onDateRangeFilter,
  onSearchFilter,
  onTagFilter,
  onSortChange,
  projectName,
  searchTerm = '',
  selectedStatus = null,
  selectedDate = null,
  dateRange = { start: null, end: null },
  selectedTag = null,
  availableTags = []
}: AppointmentsFiltersProps) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchFilter) {
      onSearchFilter(e.target.value);
    }
  };

  const handleStatusChange = (status: string) => {
    if (onStatusFilter) {
      onStatusFilter(status === 'all' ? null : status);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (onDateFilter) {
      onDateFilter(date || null);
    }
  };

  const handleDateRangeChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (onDateRangeFilter) {
      if (type === 'start') {
        onDateRangeFilter(date || null, dateRange.end);
      } else {
        onDateRangeFilter(dateRange.start, date || null);
      }
    }
  };

  const handleTagChange = (tagId: string) => {
    if (onTagFilter) {
      onTagFilter(tagId === 'all' ? null : tagId);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {onSearchFilter && (
            <SearchFilter 
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange} 
            />
          )}
          
          {onStatusFilter && (
            <StatusFilter 
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange} 
            />
          )}
          
          {onDateFilter && (
            <DateFilter 
              selectedDate={selectedDate}
              onDateChange={handleDateChange} 
            />
          )}
          
          {onDateRangeFilter && (
            <DateRangeFilter 
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange} 
            />
          )}
          
          {onTagFilter && availableTags.length > 0 && (
            <TagFilter 
              selectedTag={selectedTag}
              availableTags={availableTags}
              onTagChange={handleTagChange}
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
