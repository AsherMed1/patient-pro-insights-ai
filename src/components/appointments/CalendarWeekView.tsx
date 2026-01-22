import React from 'react';
import { AllAppointment } from './types';
import { DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, ChevronRight } from 'lucide-react';

interface CalendarWeekViewProps {
  selectedDate: Date;
  appointmentsByDate: Record<string, DayAppointmentData>;
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
}

function getStatusColor(status: string | null): string {
  const normalizedStatus = (status ?? '').toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'showed':
      return 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700';
    case 'confirmed':
      return 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700';
    case 'cancelled':
    case 'no show':
    case 'noshow':
      return 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700';
    case 'rescheduled':
      return 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700';
    default:
      return 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700';
  }
}

export function CalendarWeekView({
  selectedDate,
  appointmentsByDate,
  onAppointmentClick,
  onDateSelect
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="h-full flex flex-col">
      {/* Week Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">
          Week of {format(weekStart, 'MMMM d, yyyy')}
        </h2>
      </div>

      {/* Days Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 min-h-full">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = appointmentsByDate[dateKey];
            const appointments = dayData?.appointments || [];
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "border-r border-border last:border-r-0 min-h-[400px] flex flex-col",
                  isSelected && "bg-accent/30"
                )}
              >
                {/* Day Header */}
                <button
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "w-full px-2 py-2 border-b border-border text-center hover:bg-accent/50 transition-colors",
                    isSelected && "bg-primary/10",
                    isTodayDate && "ring-2 ring-primary ring-inset"
                  )}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold",
                    isTodayDate && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  {appointments.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] mt-1"
                    >
                      {appointments.length}
                    </Badge>
                  )}
                </button>

                {/* Appointments */}
                <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                  {appointments.slice(0, 5).map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className={cn(
                        "px-2 py-1.5 rounded border cursor-pointer transition-all hover:shadow-sm text-xs",
                        getStatusColor(apt.status)
                      )}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {apt.lead_name?.split(' ')[0] || 'Unknown'}
                        </span>
                      </div>
                      {apt.requested_time && (
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {apt.requested_time}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Show more indicator */}
                  {appointments.length > 5 && (
                    <button
                      onClick={() => onDateSelect(day)}
                      className="w-full text-xs text-primary hover:underline flex items-center justify-center gap-1 py-1"
                    >
                      +{appointments.length - 5} more
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
