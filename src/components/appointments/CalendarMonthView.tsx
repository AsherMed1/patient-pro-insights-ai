import React from 'react';
import { AllAppointment } from './types';
import { DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';

interface CalendarMonthViewProps {
  month: Date;
  appointmentsByDate: Record<string, DayAppointmentData>;
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

function getStatusDot(status: string | null): string {
  const normalizedStatus = (status ?? '').toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'showed':
      return 'bg-emerald-500';
    case 'confirmed':
      return 'bg-green-500';
    case 'cancelled':
    case 'no show':
    case 'noshow':
      return 'bg-red-500';
    case 'rescheduled':
      return 'bg-amber-500';
    default:
      return 'bg-blue-500';
  }
}

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
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = [];
  
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="h-full flex flex-col">
      {/* Month Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">
          {format(month, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div 
            key={day} 
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-rows-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
              {week.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayData = appointmentsByDate[dateKey];
                const appointments = dayData?.appointments || [];
                const isCurrentMonth = isSameMonth(day, month);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={dateKey}
                    onClick={() => onDateSelect(day)}
                    className={cn(
                      "min-h-[100px] border-r border-border last:border-r-0 p-1 cursor-pointer transition-colors hover:bg-accent/30",
                      !isCurrentMonth && "bg-muted/30",
                      isSelected && "bg-accent/50 ring-2 ring-primary ring-inset"
                    )}
                  >
                    {/* Date Number */}
                    <div className={cn(
                      "flex items-center justify-between mb-1",
                    )}>
                      <span className={cn(
                        "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        !isCurrentMonth && "text-muted-foreground",
                        isTodayDate && "bg-primary text-primary-foreground"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {appointments.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {appointments.length}
                        </Badge>
                      )}
                    </div>

                    {/* Appointment previews */}
                    <div className="space-y-0.5">
                      {appointments.slice(0, 3).map(apt => (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] bg-accent/50 hover:bg-accent transition-colors truncate"
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getStatusDot(apt.status))} />
                          <span className="truncate">{apt.lead_name?.split(' ')[0] || 'Appt'}</span>
                        </div>
                      ))}
                      {appointments.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          +{appointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
