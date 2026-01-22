import React from 'react';
import { AllAppointment } from './types';
import { DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Clock, MapPin } from 'lucide-react';

interface CalendarDayViewProps {
  date: Date;
  appointmentsByDate: Record<string, DayAppointmentData>;
  onAppointmentClick: (appointment: AllAppointment) => void;
}

// Generate time slots from 7 AM to 7 PM
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const hour = i + 7;
  return {
    hour,
    label: format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')
  };
});

function parseAppointmentTime(timeString: string | null): number | null {
  if (!timeString) return null;
  
  // Try parsing various time formats
  const formats = ['HH:mm', 'h:mm a', 'h:mm:ss a', 'HH:mm:ss'];
  
  for (const formatStr of formats) {
    try {
      const parsed = parse(timeString, formatStr, new Date());
      if (isValid(parsed)) {
        return parsed.getHours();
      }
    } catch {
      continue;
    }
  }
  
  // Fallback: try to extract hour from string like "9:00 AM"
  const match = timeString.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)?/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    if (match[2]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (match[2]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return hour;
  }
  
  return null;
}

function getStatusColor(status: string | null): string {
  const normalizedStatus = (status ?? '').toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'showed':
      return 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300';
    case 'confirmed':
      return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300';
    case 'cancelled':
    case 'no show':
    case 'noshow':
      return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300';
    case 'rescheduled':
      return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300';
    default:
      return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300';
  }
}

export function CalendarDayView({
  date,
  appointmentsByDate,
  onAppointmentClick
}: CalendarDayViewProps) {
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayData = appointmentsByDate[dateKey];
  const appointments = dayData?.appointments || [];

  // Group appointments by hour
  const appointmentsByHour: Record<number, AllAppointment[]> = {};
  const unscheduledAppointments: AllAppointment[] = [];

  appointments.forEach(apt => {
    const hour = parseAppointmentTime(apt.requested_time);
    if (hour !== null && hour >= 7 && hour <= 19) {
      if (!appointmentsByHour[hour]) appointmentsByHour[hour] = [];
      appointmentsByHour[hour].push(apt);
    } else {
      unscheduledAppointments.push(apt);
    }
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {/* Time slots */}
          {TIME_SLOTS.map(({ hour, label }) => {
            const slotAppointments = appointmentsByHour[hour] || [];
            
            return (
              <div 
                key={hour} 
                className={cn(
                  "flex min-h-[60px] border-b border-border/50",
                  slotAppointments.length > 0 && "bg-accent/20"
                )}
              >
                {/* Time label */}
                <div className="w-20 flex-shrink-0 py-2 pr-3 text-right">
                  <span className="text-xs font-medium text-muted-foreground">
                    {label}
                  </span>
                </div>
                
                {/* Appointments */}
                <div className="flex-1 py-1 space-y-1">
                  {slotAppointments.map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className={cn(
                        "px-3 py-2 rounded-md border cursor-pointer transition-all hover:shadow-md",
                        getStatusColor(apt.status)
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {apt.lead_name || 'Unknown'}
                          </span>
                        </div>
                        {apt.status && (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {apt.status}
                          </Badge>
                        )}
                      </div>
                      {apt.calendar_name && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs opacity-75">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{apt.calendar_name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unscheduled appointments */}
          {unscheduledAppointments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                No Specific Time ({unscheduledAppointments.length})
              </h3>
              <div className="space-y-1">
                {unscheduledAppointments.map(apt => (
                  <div
                    key={apt.id}
                    onClick={() => onAppointmentClick(apt)}
                    className={cn(
                      "px-3 py-2 rounded-md border cursor-pointer transition-all hover:shadow-md",
                      getStatusColor(apt.status)
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        <span className="font-medium text-sm">{apt.lead_name || 'Unknown'}</span>
                      </div>
                      {apt.status && (
                        <Badge variant="outline" className="text-[10px]">
                          {apt.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {appointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground">No appointments</h3>
              <p className="text-xs text-muted-foreground mt-1">
                No appointments scheduled for this day
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
