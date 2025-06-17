
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { ProjectTag } from '@/components/projects/types/tagTypes';

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
  const [availableTags, setAvailableTags] = useState<ProjectTag[]>([]);

  const statusOptions = [
    'Showed',
    'No Show', 
    'Cancelled',
    'Rescheduled',
    'Confirmed',
    'Welcome Call',
    'Won'
  ];

  useEffect(() => {
    if (projectName && onTagFilter) {
      fetchProjectTags();
    }
  }, [projectName]);

  const fetchProjectTags = async () => {
    if (!projectName) return;

    try {
      // Get project ID first
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('project_name', projectName)
        .single();

      if (!project) return;

      // Fetch tags for this project
      const { data: tags, error } = await supabase
        .from('project_tags')
        .select('*')
        .eq('project_id', project.id)
        .order('tag_name');

      if (error) throw error;

      setAvailableTags(tags || []);
    } catch (error) {
      console.error('Error fetching project tags:', error);
    }
  };

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
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Search by Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search appointments by lead name..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Filter by Status</label>
            <Select value={selectedStatus || 'all'} onValueChange={handleStatusChange}>
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

          {onTagFilter && availableTags.length > 0 && (
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Filter by Tag</label>
              <Select value={selectedTag || 'all'} onValueChange={handleTagChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.tag_color }}
                        />
                        <span>{tag.tag_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Filter by Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateRange.start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.start ? format(dateRange.start, "MMM dd") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => handleDateRangeChange('start', date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateRange.end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.end ? format(dateRange.end, "MMM dd") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => handleDateRangeChange('end', date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

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
