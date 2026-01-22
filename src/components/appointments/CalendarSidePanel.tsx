import React, { useState, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays, List, Calendar as CalendarIcon } from 'lucide-react';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { format, isSameDay, startOfMonth } from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CalendarSidePanelProps {
  projectName: string;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function CalendarSidePanel({
  projectName,
  selectedDate,
  onDateSelect,
  viewMode,
  onViewModeChange,
  isCollapsed,
  onToggleCollapse
}: CalendarSidePanelProps) {
  const [calendarMonth, setCalendarMonth] = useState<Date>(selectedDate || new Date());

  const { appointmentsByDate, loading } = useCalendarAppointments({
    projectName,
    month: calendarMonth,
    viewMode: 'month'
  });

  // Create modifiers for dates with appointments
  const datesWithAppointments = useMemo(() => {
    return Object.keys(appointmentsByDate).map(dateStr => new Date(dateStr + 'T12:00:00'));
  }, [appointmentsByDate]);

  const getAppointmentCount = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return appointmentsByDate[dateKey]?.count || 0;
  };

  // Custom day content to show appointment indicators
  const renderDay = (day: Date) => {
    const count = getAppointmentCount(day);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{format(day, 'd')}</span>
        {count > 0 && (
          <span 
            className={cn(
              "absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5",
              isSelected && "bottom-1"
            )}
          >
            {count <= 3 ? (
              Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                <span 
                  key={i} 
                  className={cn(
                    "w-1 h-1 rounded-full",
                    count === 1 && "bg-emerald-500",
                    count === 2 && "bg-amber-500",
                    count >= 3 && "bg-red-500"
                  )} 
                />
              ))
            ) : (
              <span className="text-[8px] font-medium text-red-500">{count}</span>
            )}
          </span>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 bg-card border border-border/50 rounded-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-2">
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('day')}
            title="Day View"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('week')}
            title="Week View"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('month')}
            title="Month View"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 space-y-4">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Calendar</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* View Mode Toggle */}
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(value) => value && onViewModeChange(value as 'day' | 'week' | 'month')}
        className="justify-start"
      >
        <ToggleGroupItem value="day" aria-label="Day view" className="text-xs px-3">
          Day
        </ToggleGroupItem>
        <ToggleGroupItem value="week" aria-label="Week view" className="text-xs px-3">
          Week
        </ToggleGroupItem>
        <ToggleGroupItem value="month" aria-label="Month view" className="text-xs px-3">
          Month
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Mini Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        month={calendarMonth}
        onMonthChange={setCalendarMonth}
        className="rounded-md border-0 p-0 pointer-events-auto"
        classNames={{
          months: "flex flex-col",
          month: "space-y-2",
          caption: "flex justify-center pt-1 relative items-center text-sm",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center",
          nav_button_previous: "absolute left-0",
          nav_button_next: "absolute right-0",
          table: "w-full border-collapse",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.7rem]",
          row: "flex w-full mt-1",
          cell: "h-8 w-8 text-center text-xs p-0 relative",
          day: "h-8 w-8 p-0 font-normal text-xs hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
          day_range_end: "day-range-end",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          day_today: "bg-accent/50 text-accent-foreground",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50",
          day_hidden: "invisible",
        }}
        modifiers={{
          hasAppointments: datesWithAppointments
        }}
        modifiersClassNames={{
          hasAppointments: "font-semibold"
        }}
        components={{
          DayContent: ({ date }) => renderDay(date)
        }}
      />

      {/* Legend */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2">Appointments</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">1</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">2</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">3+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
