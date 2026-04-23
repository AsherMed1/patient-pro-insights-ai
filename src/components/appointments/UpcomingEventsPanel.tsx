import React, { useEffect, useState, useMemo } from 'react';
import { AllAppointment } from './types';
import { getEventTypeFromCalendar, getStatusInfo } from './calendarUtils';
import { extractLocationFromCalendarName } from './LocationLegend';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UpcomingEventsPanelProps {
  projectName: string;
  viewMode: 'day' | 'week' | 'month';
  selectedDate: Date;
  onAppointmentClick: (appointment: AllAppointment) => void;
  selectedEventTypes?: string[];
  selectedLocations?: string[];
  selectedStatuses?: string[];
}

export function UpcomingEventsPanel({ projectName, viewMode, selectedDate, onAppointmentClick, selectedEventTypes, selectedLocations, selectedStatuses }: UpcomingEventsPanelProps) {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const { startDate, endDate, panelTitle } = useMemo(() => {
    if (viewMode === 'day') {
      const d = format(selectedDate, 'yyyy-MM-dd');
      return {
        startDate: d,
        endDate: d,
        panelTitle: `Events for ${format(selectedDate, 'EEE MMM d')}`
      };
    } else if (viewMode === 'week') {
      return {
        startDate: format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        panelTitle: 'Events This Week'
      };
    } else {
      return {
        startDate: format(startOfMonth(selectedDate), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(selectedDate), 'yyyy-MM-dd'),
        panelTitle: 'Events This Month'
      };
    }
  }, [viewMode, selectedDate]);

  useEffect(() => {
    const fetchUpcoming = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('all_appointments')
          .select('*')
          .eq('project_name', projectName)
          .gte('date_of_appointment', startDate)
          .lte('date_of_appointment', endDate)
          .or('is_superseded.is.null,is_superseded.eq.false')
          .order('date_of_appointment', { ascending: true })
          .order('requested_time', { ascending: true });

        if (error) throw error;
        setAppointments((data as AllAppointment[]) || []);
      } catch (error) {
        console.error('Error fetching upcoming appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, [projectName, startDate, endDate]);

  const filteredAppointments = useMemo(() => {
    let result = appointments;
    if (selectedStatuses?.length) {
      result = result.filter(apt => {
        const normalized = (apt.status ?? '').toLowerCase().trim();
        // Handle aliases: 'canceled' -> 'cancelled', 'noshow' -> 'no show', 'donotcall' -> 'do not call'
        const mapped = normalized === 'canceled' ? 'cancelled' : normalized === 'noshow' ? 'no show' : normalized === 'donotcall' ? 'do not call' : normalized;
        return selectedStatuses.includes(mapped) || (mapped === '' && selectedStatuses.includes('scheduled'));
      });
    }
    if (selectedEventTypes?.length) {
      result = result.filter(apt => {
        const fallback = (apt as any).parsed_pathology_info?.procedure || (apt as any).patient_intake_notes;
        return selectedEventTypes.includes(getEventTypeFromCalendar(apt.calendar_name, false, fallback).type);
      });
    }
    if (selectedLocations?.length) {
      result = result.filter(apt => {
        const loc = extractLocationFromCalendarName(apt.calendar_name || '');
        return !loc || selectedLocations.includes(loc);
      });
    }
    return result;
  }, [appointments, selectedStatuses, selectedEventTypes, selectedLocations]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {panelTitle}
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No upcoming appointments
            </div>
          ) : (
            filteredAppointments.map(apt => {
              const fallback = (apt as any).parsed_pathology_info?.procedure || (apt as any).patient_intake_notes;
              const eventType = getEventTypeFromCalendar(apt.calendar_name, false, fallback);
              const statusInfo = getStatusInfo(apt.status);
              
              return (
                <div
                  key={apt.id}
                  onClick={() => onAppointmentClick(apt)}
                  className={cn(
                    "p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md",
                    "bg-card border border-border",
                    eventType.borderColor
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", eventType.bgColor, eventType.textColor)}>
                      {eventType.shortName}
                    </span>
                    <Badge variant={statusInfo.variant} className="text-[10px]">
                      {statusInfo.label}
                    </Badge>
                  </div>
                  
                  <p className="font-medium text-sm text-foreground truncate">
                    {apt.lead_name || 'Unknown Patient'}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {apt.date_of_appointment ? format(new Date(apt.date_of_appointment + 'T00:00:00'), 'MMM d') : 'No date'}
                    </div>
                    {apt.requested_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.requested_time}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
