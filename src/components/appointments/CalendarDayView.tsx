import React from 'react';
import { AllAppointment } from './types';
import { DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Plus, Lock } from 'lucide-react';
import { getEventTypeFromCalendar, getStatusInfo } from './calendarUtils';

interface CalendarDayViewProps {
  date: Date;
  appointmentsByDate: Record<string, DayAppointmentData>;
  onAppointmentClick: (appointment: AllAppointment) => void;
  onReserveTimeSlot?: (hour: number, date: Date) => void;
}

// Time slot configuration
const START_HOUR = 7;
const END_HOUR = 19; // 7 PM
const SLOT_HEIGHT = 64; // pixels per hour slot

// Generate time slots from 7 AM to 7 PM
const TIME_SLOTS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
  const hour = i + START_HOUR;
  return {
    hour,
    label: format(new Date().setHours(hour, 0, 0, 0), 'h a')
  };
});

function parseTimeToHour(timeString: string | null): number | null {
  if (!timeString) return null;
  
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
  
  const match = timeString.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)?/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    if (match[2]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (match[2]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return hour;
  }
  
  return null;
}

interface PositionedAppointment {
  appointment: AllAppointment;
  startHour: number;
  endHour: number;
  isMultiHour: boolean;
}

function getPositionedAppointments(appointments: AllAppointment[]): {
  positioned: PositionedAppointment[];
  unscheduled: AllAppointment[];
  blockedHours: Set<number>;
} {
  const positioned: PositionedAppointment[] = [];
  const unscheduled: AllAppointment[] = [];
  const blockedHours = new Set<number>();

  appointments.forEach(apt => {
    const startHour = parseTimeToHour(apt.requested_time);
    
    if (startHour === null || startHour < START_HOUR || startHour > END_HOUR) {
      unscheduled.push(apt);
      return;
    }

    // For reserved blocks, check if they have an end time
    let endHour = startHour + 1; // Default: 1 hour duration
    
    if (apt.is_reserved_block && apt.reserved_end_time) {
      const parsedEnd = parseTimeToHour(apt.reserved_end_time);
      if (parsedEnd !== null && parsedEnd > startHour) {
        endHour = parsedEnd;
        // Mark all hours in this block as blocked (for hiding Reserve buttons)
        for (let h = startHour; h < endHour; h++) {
          blockedHours.add(h);
        }
      }
    }

    positioned.push({
      appointment: apt,
      startHour,
      endHour,
      isMultiHour: endHour - startHour > 1
    });
  });

  return { positioned, unscheduled, blockedHours };
}

interface AppointmentBlockProps {
  item: PositionedAppointment;
  onAppointmentClick: (appointment: AllAppointment) => void;
}

function AppointmentBlock({ item, onAppointmentClick }: AppointmentBlockProps) {
  const { appointment: apt, startHour, endHour, isMultiHour } = item;
  const isReserved = apt.is_reserved_block === true;
  const eventType = getEventTypeFromCalendar(apt.calendar_name, isReserved);
  const statusInfo = getStatusInfo(apt.status);

  // Calculate position and height
  const top = (startHour - START_HOUR) * SLOT_HEIGHT;
  const height = (endHour - startHour) * SLOT_HEIGHT - 4; // -4 for padding

  return (
    <div
      onClick={() => onAppointmentClick(apt)}
      style={{
        position: 'absolute',
        top: `${top + 2}px`,
        left: '0',
        right: '4px',
        height: `${height}px`,
        zIndex: 10,
      }}
      className={cn(
        "px-3 py-2 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md",
        "bg-card border border-border overflow-hidden",
        eventType.borderColor,
        isReserved && "bg-slate-100 dark:bg-slate-800/50 border-dashed"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isReserved && <Lock className="h-3 w-3 text-slate-500 flex-shrink-0" />}
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0",
            eventType.bgColor,
            eventType.textColor
          )}>
            {eventType.shortName}
          </span>
          <span className={cn(
            "font-medium text-sm truncate",
            isReserved ? "text-slate-600 dark:text-slate-400" : "text-foreground"
          )}>
            {apt.lead_name || 'Unknown'}
          </span>
        </div>
        <Badge variant={statusInfo.variant} className="text-[10px] flex-shrink-0">
          {statusInfo.label}
        </Badge>
      </div>
      
      {isMultiHour && (
        <div className="text-xs text-muted-foreground mt-1">
          {apt.requested_time} - {apt.reserved_end_time}
        </div>
      )}
      
      {apt.calendar_name && !isMultiHour && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {apt.calendar_name}
        </div>
      )}
    </div>
  );
}

export function CalendarDayView({
  date,
  appointmentsByDate,
  onAppointmentClick,
  onReserveTimeSlot
}: CalendarDayViewProps) {
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayData = appointmentsByDate[dateKey];
  const appointments = dayData?.appointments || [];

  const { positioned, unscheduled, blockedHours } = getPositionedAppointments(appointments);

  // Group regular (non-multi-hour) appointments by their start hour for slot rendering
  const regularAppointmentsByHour: Record<number, PositionedAppointment[]> = {};
  const multiHourAppointments: PositionedAppointment[] = [];

  positioned.forEach(item => {
    if (item.isMultiHour && item.appointment.is_reserved_block) {
      multiHourAppointments.push(item);
    } else {
      if (!regularAppointmentsByHour[item.startHour]) {
        regularAppointmentsByHour[item.startHour] = [];
      }
      regularAppointmentsByHour[item.startHour].push(item);
    }
  });

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Time grid container - relative for absolute positioning */}
          <div className="relative">
            {/* Render multi-hour reserved blocks */}
            <div className="absolute left-16 right-0">
              {multiHourAppointments.map(item => (
                <AppointmentBlock
                  key={item.appointment.id}
                  item={item}
                  onAppointmentClick={onAppointmentClick}
                />
              ))}
            </div>

            {/* Time slots */}
            {TIME_SLOTS.map(({ hour, label }) => {
              const slotAppointments = regularAppointmentsByHour[hour] || [];
              const isBlocked = blockedHours.has(hour);
              
              return (
                <div 
                  key={hour} 
                  className={cn(
                    "flex border-b border-border/50 group",
                    slotAppointments.length > 0 && "bg-accent/10",
                    isBlocked && "bg-slate-50 dark:bg-slate-900/30"
                  )}
                  style={{ minHeight: `${SLOT_HEIGHT}px` }}
                >
                  {/* Time label */}
                  <div className="w-16 flex-shrink-0 py-2 pr-3 text-right">
                    <span className="text-xs font-medium text-muted-foreground">
                      {label}
                    </span>
                  </div>
                  
                  {/* Appointments area */}
                  <div className="flex-1 py-1 space-y-1 border-l border-border/50 pl-3 relative">
                    {/* Show Reserve button if slot is empty and not blocked */}
                    {slotAppointments.length === 0 && !isBlocked && onReserveTimeSlot && (
                      <button
                        onClick={() => onReserveTimeSlot(hour, date)}
                        className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground hover:text-primary hover:bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Reserve
                      </button>
                    )}
                    
                    {/* Show blocked indicator for multi-hour reserved blocks */}
                    {isBlocked && slotAppointments.length === 0 && (
                      <div className="h-full flex items-center text-xs text-slate-400 italic">
                        ┊ blocked
                      </div>
                    )}
                    
                    {/* Regular appointments in this slot */}
                    {slotAppointments.map(item => {
                      const apt = item.appointment;
                      const isReserved = apt.is_reserved_block === true;
                      const eventType = getEventTypeFromCalendar(apt.calendar_name, isReserved);
                      const statusInfo = getStatusInfo(apt.status);
                      
                      return (
                        <div
                          key={apt.id}
                          onClick={() => onAppointmentClick(apt)}
                          className={cn(
                            "px-3 py-2 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md",
                            "bg-card border border-border",
                            eventType.borderColor,
                            isReserved && "bg-slate-50 dark:bg-slate-800/30 border-dashed"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isReserved && <Lock className="h-3 w-3 text-slate-500 flex-shrink-0" />}
                              <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                eventType.bgColor,
                                eventType.textColor
                              )}>
                                {eventType.shortName}
                              </span>
                              <span className={cn(
                                "font-medium text-sm truncate",
                                isReserved ? "text-slate-600 dark:text-slate-400" : "text-foreground"
                              )}>
                                {apt.lead_name || 'Unknown'}
                              </span>
                            </div>
                            <Badge variant={statusInfo.variant} className="text-[10px] flex-shrink-0">
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {apt.calendar_name && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {apt.calendar_name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unscheduled appointments */}
          {unscheduled.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                No Specific Time ({unscheduled.length})
              </h3>
              <div className="space-y-2">
                {unscheduled.map(apt => {
                  const isReserved = apt.is_reserved_block === true;
                  const eventType = getEventTypeFromCalendar(apt.calendar_name, isReserved);
                  const statusInfo = getStatusInfo(apt.status);
                  
                  return (
                    <div
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className={cn(
                        "px-3 py-2 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md",
                        "bg-card border border-border",
                        eventType.borderColor,
                        isReserved && "bg-slate-50 dark:bg-slate-800/30 border-dashed"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isReserved && <Lock className="h-3 w-3 text-slate-500" />}
                          <span className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                            eventType.bgColor,
                            eventType.textColor
                          )}>
                            {eventType.shortName}
                          </span>
                          <span className={cn(
                            "font-medium text-sm",
                            isReserved ? "text-slate-600 dark:text-slate-400" : "text-foreground"
                          )}>
                            {apt.lead_name || 'Unknown'}
                          </span>
                        </div>
                        <Badge variant={statusInfo.variant} className="text-[10px]">
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
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
