import React, { useState, useEffect } from 'react';
import { EVENT_TYPES, getEventTypeFromCalendar } from './calendarUtils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface EventTypeLegendProps {
  projectName: string;
}

export function EventTypeLegend({ projectName }: EventTypeLegendProps) {
  const [activeEventTypes, setActiveEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveEventTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('all_appointments')
          .select('calendar_name')
          .eq('project_name', projectName)
          .not('calendar_name', 'is', null);

        if (error) throw error;

        // Extract unique event types from calendar names
        const uniqueTypes = new Set<string>();
        data?.forEach(row => {
          const eventType = getEventTypeFromCalendar(row.calendar_name);
          if (eventType.type !== 'Other') {
            uniqueTypes.add(eventType.type);
          }
        });

        setActiveEventTypes(Array.from(uniqueTypes));
      } catch (error) {
        console.error('Error fetching event types:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectName) {
      fetchActiveEventTypes();
    }
  }, [projectName]);

  // Filter EVENT_TYPES to only show active ones for this project
  const displayTypes = EVENT_TYPES.filter(
    t => t.type !== 'Other' && activeEventTypes.includes(t.type)
  );

  if (loading || displayTypes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-sm text-muted-foreground font-medium">Event Types:</span>
      {displayTypes.map(eventType => (
        <div key={eventType.type} className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full", eventType.dotColor)} />
          <span className="text-sm font-medium text-foreground">{eventType.shortName}</span>
        </div>
      ))}
    </div>
  );
}
