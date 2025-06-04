
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AppointmentsFiltersProps {
  onStatusFilter?: (status: string | null) => void;
  onDateFilter?: (date: Date | null) => void;
  onDateRangeFilter?: (startDate: Date | null, endDate: Date | null) => void;
}

const AppointmentsFilters = ({
  onStatusFilter,
  onDateFilter,
  onDateRangeFilter
}: AppointmentsFiltersProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });

  const statusOptions = [
    'Showed',
    'No Show', 
    'Cancelled',
    'Rescheduled',
    'Confirmed',
    'Welcome Call',
    'Won'
  ];

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

  const clearFilters = () => {
    setSelectedStatus(null);
    setSelectedDate(null);
    setDateRange({ start: null, end: null });
    onStatusFilter?.(null);
    onDateFilter?.(null);
    onDateRangeFilter?.(null, null);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
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
