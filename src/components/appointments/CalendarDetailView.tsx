import React, { useMemo } from 'react';
import { AllAppointment } from './types';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarMonthView } from './CalendarMonthView';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';
import { useCalendarAppointments, DayAppointmentData } from '@/hooks/useCalendarAppointments';
import { getEventTypeFromCalendar } from './calendarUtils';
import { extractLocationFromCalendarName } from './LocationLegend';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarDetailViewProps {
  projectName: string;
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month';
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
  onReserveTimeSlot?: (hour: number, date: Date) => void;
  selectedEventTypes?: string[];
  selectedLocations?: string[];
  selectedStatuses?: string[];
}

export function CalendarDetailView({
  projectName,
  selectedDate,
  viewMode,
  onAppointmentClick,
  onDateSelect,
  onReserveTimeSlot,
  selectedEventTypes,
  selectedLocations,
  selectedStatuses
}: CalendarDetailViewProps) {
  const { appointmentsByDate, loading } = useCalendarAppointments({
    projectName,
    month: selectedDate,
    viewMode,
    selectedDate
  });

  const filteredByDate = useMemo(() => {
    const needsEventFilter = selectedEventTypes && selectedEventTypes.length > 0;
    const needsLocationFilter = selectedLocations && selectedLocations.length > 0;
    const needsStatusFilter = selectedStatuses && selectedStatuses.length > 0;
    if (!needsEventFilter && !needsLocationFilter && !needsStatusFilter) return appointmentsByDate;

    const filtered: Record<string, DayAppointmentData> = {};
    for (const [dateKey, dayData] of Object.entries(appointmentsByDate)) {
      let filteredApts = dayData.appointments;
      if (needsStatusFilter) {
        filteredApts = filteredApts.filter(apt => {
          const normalized = (apt.status ?? '').toLowerCase().trim();
          const mapped = normalized === 'canceled' ? 'cancelled' : normalized === 'noshow' ? 'no show' : normalized === 'donotcall' ? 'do not call' : normalized;
          return selectedStatuses!.includes(mapped) || (mapped === '' && selectedStatuses!.includes('scheduled'));
        });
      }
      if (needsEventFilter) {
        filteredApts = filteredApts.filter(apt => {
          const eventType = getEventTypeFromCalendar(apt.calendar_name);
          return selectedEventTypes!.includes(eventType.type);
        });
      }
      if (needsLocationFilter) {
        filteredApts = filteredApts.filter(apt => {
          const loc = extractLocationFromCalendarName(apt.calendar_name || '');
          return !loc || selectedLocations!.includes(loc);
        });
      }
      filtered[dateKey] = { ...dayData, appointments: filteredApts, count: filteredApts.length };
    }
    return filtered;
  }, [appointmentsByDate, selectedEventTypes, selectedLocations, selectedStatuses]);

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
          viewMode={viewMode}
          selectedDate={selectedDate}
          onAppointmentClick={onAppointmentClick}
          selectedEventTypes={selectedEventTypes}
          selectedLocations={selectedLocations}
          selectedStatuses={selectedStatuses}
        />
      </div>
    </div>
  );
}
