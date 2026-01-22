import React from 'react';
import { AllAppointment } from './types';
import { DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';
import { getEventTypeFromCalendar } from './calendarUtils';

interface CalendarWeekViewProps {
  selectedDate: Date;
  appointmentsByDate: Record<string, DayAppointmentData>;
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
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
    <div className="h-full flex flex-col bg-card">
      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1">
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
                "border-r border-border last:border-r-0 flex flex-col",
                isSelected && "bg-primary/5"
              )}
            >
              {/* Day Header */}
              <button
                onClick={() => onDateSelect(day)}
                className={cn(
                  "w-full px-2 py-3 border-b border-border text-center hover:bg-accent/50 transition-colors"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-xl font-semibold mt-1",
                  isTodayDate && "bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto"
                )}>
                  {format(day, 'd')}
                </div>
                {appointments.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {appointments.length} event{appointments.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>

              {/* Appointments */}
              <ScrollArea className="flex-1">
                <div className="p-1.5 space-y-1">
                  {appointments.slice(0, 8).map(apt => {
                    const eventType = getEventTypeFromCalendar(apt.calendar_name);
                    
                    return (
                      <div
                        key={apt.id}
                        onClick={() => onAppointmentClick(apt)}
                        className={cn(
                          "px-2 py-1.5 rounded cursor-pointer transition-all hover:shadow-md",
                          "border-l-[3px]",
                          eventType.borderColor,
                          eventType.bgColor
                        )}
                      >
                        <div className={cn("text-xs font-medium truncate", eventType.textColor)}>
                          {apt.lead_name || 'Unknown'}
                        </div>
                        {apt.requested_time && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {apt.requested_time}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Show more indicator */}
                  {appointments.length > 8 && (
                    <button
                      onClick={() => onDateSelect(day)}
                      className="w-full text-xs text-primary hover:underline flex items-center justify-center gap-0.5 py-1"
                    >
                      +{appointments.length - 8} more
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}