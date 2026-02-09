import React, { useMemo } from 'react';
import { AllAppointment } from './types';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarMonthView } from './CalendarMonthView';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';
import { useCalendarAppointments, DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { getEventTypeFromCalendar } from './calendarUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarDetailViewProps {
  projectName: string;
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month';
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
  onReserveTimeSlot?: (hour: number, date: Date) => void;
  selectedEventTypes?: string[];
}

export function CalendarDetailView({
  projectName,
  selectedDate,
  viewMode,
  onAppointmentClick,
  onDateSelect,
  onReserveTimeSlot,
  selectedEventTypes
}: CalendarDetailViewProps) {
  const { appointmentsByDate, loading } = useCalendarAppointments({
    projectName,
    month: selectedDate,
    viewMode,
    selectedDate
  });

  const filteredByDate = useMemo(() => {
    if (!selectedEventTypes || selectedEventTypes.length === 0) return appointmentsByDate;

    const filtered: Record<string, DayAppointmentData> = {};
    for (const [dateKey, dayData] of Object.entries(appointmentsByDate)) {
      const filteredApts = dayData.appointments.filter(apt => {
        const eventType = getEventTypeFromCalendar(apt.calendar_name);
        return selectedEventTypes.includes(eventType.type);
      });
      filtered[dateKey] = { ...dayData, appointments: filteredApts, count: filteredApts.length };
    }
    return filtered;
  }, [appointmentsByDate, selectedEventTypes]);

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="hidden lg:block w-72 border-l border-border p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        {viewMode === 'day' && (
          <CalendarDayView
            date={selectedDate}
            appointmentsByDate={filteredByDate}
            onAppointmentClick={onAppointmentClick}
            onReserveTimeSlot={onReserveTimeSlot}
          />
        )}
        {viewMode === 'week' && (
          <CalendarWeekView
            selectedDate={selectedDate}
            appointmentsByDate={filteredByDate}
            onAppointmentClick={onAppointmentClick}
            onDateSelect={onDateSelect}
          />
        )}
        {viewMode === 'month' && (
          <CalendarMonthView
            month={selectedDate}
            appointmentsByDate={filteredByDate}
            onAppointmentClick={onAppointmentClick}
            onDateSelect={onDateSelect}
            selectedDate={selectedDate}
          />
        )}
      </div>
      
      <div className="hidden lg:block w-72 border-l border-border">
        <UpcomingEventsPanel 
          projectName={projectName}
          onAppointmentClick={onAppointmentClick}
        />
      </div>
    </div>
  );
}
