import React from 'react';
import { AllAppointment } from './types';
import { DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getEventTypeFromCalendar } from './calendarUtils';

interface CalendarMonthViewProps {
  month: Date;
  appointmentsByDate: Record<string, DayAppointmentData>;
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarMonthView({
  month,
  appointmentsByDate,
  onAppointmentClick,
  onDateSelect,
  selectedDate
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Build weeks array
  const weeks: Date[][] = [];
  let currentDay = calendarStart;
  
  while (currentDay <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    weeks.push(week);
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAYS.map(day => (
          <div 
            key={day} 
            className="py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 auto-rows-fr min-h-full">
          {weeks.flat().map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = appointmentsByDate[dateKey];
            const appointments = dayData?.appointments || [];
            const isCurrentMonth = isSameMonth(day, month);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "min-h-[100px] p-1 border-b border-r border-border cursor-pointer transition-colors",
                  "hover:bg-accent/50",
                  !isCurrentMonth && "bg-muted/20",
                  isSelected && "bg-primary/5 ring-1 ring-primary ring-inset"
                )}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className={cn(
                    "text-sm font-medium",
                    !isCurrentMonth && "text-muted-foreground/50",
                    isTodayDate && "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {appointments.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{appointments.length - 3}
                    </span>
                  )}
                </div>

                {/* Event Previews - Max 3 */}
                <div className="space-y-0.5">
                  {appointments.slice(0, 3).map(apt => {
                    const eventType = getEventTypeFromCalendar(apt.calendar_name);
                    
                    return (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded-sm text-[11px] truncate cursor-pointer",
                          "border-l-2 hover:shadow-sm transition-shadow",
                          eventType.borderColor,
                          eventType.bgColor
                        )}
                      >
                        <span className={cn("font-medium", eventType.textColor)}>
                          {apt.lead_name || 'Unknown'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}