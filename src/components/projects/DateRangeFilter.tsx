import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

const DateRangeFilter = ({ dateRange, onDateRangeChange, className }: DateRangeFilterProps) => {
  const presetRanges = [
    {
      label: "Today",
      value: "today",
      getRange: () => {
        const today = new Date();
        return { from: today, to: today };
      }
    },
    {
      label: "Last 7 Days",
      value: "last7",
      getRange: () => {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        return { from: weekAgo, to: today };
      }
    },
    {
      label: "Last 30 Days",
      value: "last30",
      getRange: () => {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setDate(today.getDate() - 30);
        return { from: monthAgo, to: today };
      }
    },
    {
      label: "This Month",
      value: "thisMonth",
      getRange: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: firstDay, to: today };
      }
    },
    {
      label: "Last Month",
      value: "lastMonth",
      getRange: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: firstDay, to: lastDay };
      }
    },
    {
      label: "All Time",
      value: "all",
      getRange: () => ({ from: undefined, to: undefined })
    }
  ];

  const handlePresetChange = (value: string) => {
    const preset = presetRanges.find(p => p.value === value);
    if (preset) {
      onDateRangeChange(preset.getRange());
    }
  };

  const getDateRangeText = () => {
    if (!dateRange.from && !dateRange.to) return 'All time';
    if (dateRange.from && !dateRange.to) {
      return `From ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    if (!dateRange.from && dateRange.to) {
      return `Until ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "MMM dd, yyyy");
      }
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    return 'Select date range';
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Time Period:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Quick Preset Selector */}
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Quick select" />
              </SelectTrigger>
              <SelectContent>
                {presetRanges.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            <div className="flex gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[120px] justify-start text-left font-normal text-xs",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateRange.from ? format(dateRange.from, "MMM dd") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[120px] justify-start text-left font-normal text-xs",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateRange.to ? format(dateRange.to, "MMM dd") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
              className="text-xs"
            >
              Clear
            </Button>
          </div>

          <div className="text-xs text-muted-foreground ml-auto">
            Showing: <span className="font-medium">{getDateRangeText()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DateRangeFilter;