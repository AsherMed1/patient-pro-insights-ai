import React, { useEffect, useState } from 'react';
import { AllAppointment } from './types';
import { getEventTypeFromCalendar, getStatusInfo } from './calendarUtils';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UpcomingEventsPanelProps {
  projectName: string;
  onAppointmentClick: (appointment: AllAppointment) => void;
}

export function UpcomingEventsPanel({ projectName, onAppointmentClick }: UpcomingEventsPanelProps) {
  const [appointments, setAppointments] = useState<AllAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      setLoading(true);
      try {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('all_appointments')
          .select('*')
          .eq('project_name', projectName)
          .gte('date_of_appointment', today)
          .not('status', 'ilike', 'cancelled')
          .not('status', 'ilike', 'canceled')
          .not('status', 'ilike', 'oon')
          .order('date_of_appointment', { ascending: true })
          .order('requested_time', { ascending: true })
          .limit(10);

        if (error) throw error;
        setAppointments((data as AllAppointment[]) || []);
      } catch (error) {
        console.error('Error fetching upcoming appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, [projectName]);

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
          Upcoming Events
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No upcoming appointments
            </div>
          ) : (
            appointments.map(apt => {
              const eventType = getEventTypeFromCalendar(apt.calendar_name);
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
