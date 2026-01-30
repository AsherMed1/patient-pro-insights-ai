import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AllAppointment } from '@/components/appointments/types';
import { startOfMonth, endOfMonth, format, startOfWeek, endOfWeek } from 'date-fns';

interface UseCalendarAppointmentsOptions {
  projectName: string;
  month: Date;
  viewMode?: 'day' | 'week' | 'month';
  selectedDate?: Date;
}

export interface DayAppointmentData {
  date: string; // YYYY-MM-DD
  count: number;
  appointments: AllAppointment[];
}

export interface CalendarAppointmentsResult {
  appointmentsByDate: Record<string, DayAppointmentData>;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCalendarAppointments({
  projectName,
  month,
  viewMode = 'month',
  selectedDate
}: UseCalendarAppointmentsOptions): CalendarAppointmentsResult {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week' && selectedDate) {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 })
      };
    }
    // For month view, get the entire month plus overflow days for calendar grid
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 })
    };
  }, [month, viewMode, selectedDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = format(dateRange.start, 'yyyy-MM-dd');
      const endDate = format(dateRange.end, 'yyyy-MM-dd');

      let query = supabase
        .from('all_appointments')
        .select('*')
        .gte('date_of_appointment', startDate)
        .lte('date_of_appointment', endDate)
        .not('status', 'ilike', 'cancelled')
        .not('status', 'ilike', 'canceled')
        .not('status', 'ilike', 'oon')
        .order('date_of_appointment', { ascending: true });

      if (projectName) {
        query = query.eq('project_name', projectName);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setAppointments((data as AllAppointment[]) || []);
    } catch (err) {
      console.error('Error fetching calendar appointments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [projectName, dateRange.start.toISOString(), dateRange.end.toISOString()]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, DayAppointmentData> = {};

    appointments.forEach((appointment) => {
      const dateKey = appointment.date_of_appointment;
      if (!dateKey) return;

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          count: 0,
          appointments: []
        };
      }

      grouped[dateKey].count++;
      grouped[dateKey].appointments.push(appointment);
    });

    return grouped;
  }, [appointments]);

  return {
    appointmentsByDate,
    loading,
    error,
    refetch: fetchAppointments
  };
}
