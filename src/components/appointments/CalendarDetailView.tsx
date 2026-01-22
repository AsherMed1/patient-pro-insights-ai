import React from 'react';
import { AllAppointment } from './types';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarMonthView } from './CalendarMonthView';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { Skeleton } from '@/components/ui/skeleton';

interface CalendarDetailViewProps {
  projectName: string;
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month';
  onAppointmentClick: (appointment: AllAppointment) => void;
  onDateSelect: (date: Date) => void;
}

export function CalendarDetailView({
  projectName,
  selectedDate,
  viewMode,
  onAppointmentClick,
  onDateSelect
}: CalendarDetailViewProps) {
  const { appointmentsByDate, loading } = useCalendarAppointments({
    projectName,
    month: selectedDate,
    viewMode,
    selectedDate
  });

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  switch (viewMode) {
    case 'day':
      return (
        <CalendarDayView
          date={selectedDate}
          appointmentsByDate={appointmentsByDate}
          onAppointmentClick={onAppointmentClick}
        />
      );
    case 'week':
      return (
        <CalendarWeekView
          selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate}
          onAppointmentClick={onAppointmentClick}
          onDateSelect={onDateSelect}
        />
      );
    case 'month':
      return (
        <CalendarMonthView
          month={selectedDate}
          appointmentsByDate={appointmentsByDate}
          onAppointmentClick={onAppointmentClick}
          onDateSelect={onDateSelect}
          selectedDate={selectedDate}
        />
      );
    default:
      return null;
  }
}
