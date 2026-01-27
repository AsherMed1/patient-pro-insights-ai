import React from 'react';
import { AllAppointment } from './types';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarMonthView } from './CalendarMonthView';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarDetailViewProps {
  projectName: string;
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month';
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
  onReserveTimeSlot?: (hour: number, date: Date) => void;
}

export function CalendarDetailView({
  projectName,
  selectedDate,
  viewMode,
  onAppointmentClick,
  onDateSelect,
  onReserveTimeSlot
}: CalendarDetailViewProps) {
  const { appointmentsByDate, loading } = useCalendarAppointments({
    projectName,
    month: selectedDate,
    viewMode,
    selectedDate
  });

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
      {/* Main Calendar View */}
      <div className="flex-1 min-w-0">
        {viewMode === 'day' && (
          <CalendarDayView
            date={selectedDate}
            appointmentsByDate={appointmentsByDate}
            onAppointmentClick={onAppointmentClick}
            onReserveTimeSlot={onReserveTimeSlot}
          />
        )}
        {viewMode === 'week' && (
          <CalendarWeekView
            selectedDate={selectedDate}
            appointmentsByDate={appointmentsByDate}
            onAppointmentClick={onAppointmentClick}
            onDateSelect={onDateSelect}
          />
        )}
        {viewMode === 'month' && (
          <CalendarMonthView
            month={selectedDate}
            appointmentsByDate={appointmentsByDate}
            onAppointmentClick={onAppointmentClick}
            onDateSelect={onDateSelect}
            selectedDate={selectedDate}
          />
        )}
      </div>
      
      {/* Upcoming Events Sidebar - hidden on mobile */}
      <div className="hidden lg:block w-72 border-l border-border">
        <UpcomingEventsPanel 
          projectName={projectName}
          onAppointmentClick={onAppointmentClick}
        />
      </div>
    </div>
  );
}
