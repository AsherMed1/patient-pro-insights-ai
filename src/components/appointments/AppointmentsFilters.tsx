
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import SearchFilter from './filters/SearchFilter';
import StatusFilter from './filters/StatusFilter';
import TagFilter from './filters/TagFilter';
import DateFilter from './filters/DateFilter';
import DateRangeFilter from './filters/DateRangeFilter';
import { useProjectTags } from './filters/hooks/useProjectTags';

interface AppointmentsFiltersProps {
  onStatusFilter?: (status: string | null) => void;
  onDateFilter?: (date: Date | null) => void;
  onDateRangeFilter?: (startDate: Date | null, endDate: Date | null) => void;
  onSearchFilter?: (searchTerm: string) => void;
  onTagFilter?: (tagId: string | null) => void;
  projectName?: string;
}

const AppointmentsFilters = ({
  onStatusFilter,
  onDateFilter,
  onDateRangeFilter,
  onSearchFilter,
  onTagFilter,
  projectName
}: AppointmentsFiltersProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { availableTags } = useProjectTags(projectName);

  const handleStatusChange = (status: string) => {
    const newStatus = status === 'all' ? null : status;
    setSelectedStatus(newStatus);
    onStatusFilter?.(newStatus);
  };

  const handleDateChange = (date: Date | undefined) => {
    const newDate = date || null;
    setSelectedDate(newDate);
    onDateFilter?.(newDate);
  };

  const handleDateRangeChange = (type: 'start' | 'end', date: Date | undefined) => {
    const newDate = date || null;
    const newDateRange = {
      ...dateRange,
      [type]: newDate
    };
    setDateRange(newDateRange);
    onDateRangeFilter?.(newDateRange.start, newDateRange.end);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchFilter?.(value);
  };

  const handleTagChange = (tagId: string) => {
    const newTagId = tagId === 'all' ? null : tagId;
    setSelectedTag(newTagId);
    onTagFilter?.(newTagId);
  };

  const clearFilters = () => {
    setSelectedStatus(null);
    setSelectedDate(null);
    setDateRange({ start: null, end: null });
    setSearchTerm('');
    setSelectedTag(null);
    onStatusFilter?.(null);
    onDateFilter?.(null);
    onDateRangeFilter?.(null, null);
    onSearchFilter?.('');
    onTagFilter?.(null);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <SearchFilter 
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
          />

          <StatusFilter 
            selectedStatus={selectedStatus}
            onStatusChange={handleStatusChange}
          />

          {onTagFilter && (
            <TagFilter
              selectedTag={selectedTag}
              availableTags={availableTags}
              onTagChange={handleTagChange}
            />
          )}

          <DateFilter 
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />

          <DateRangeFilter 
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />

          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentsFilters;
