import React, { useState, useEffect } from 'react';
import { EVENT_TYPES, getEventTypeFromCalendar } from './calendarUtils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface EventTypeLegendProps {
  projectName: string;
  selectedTypes?: string[];
  onToggleType?: (type: string) => void;
}

export function EventTypeLegend({ projectName, selectedTypes, onToggleType }: EventTypeLegendProps) {
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

  const displayTypes = EVENT_TYPES.filter(
    t => t.type !== 'Other' && activeEventTypes.includes(t.type)
  );

  if (loading || displayTypes.length === 0) {
    return null;
  }

  const isInteractive = !!onToggleType;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-sm text-muted-foreground font-medium">Event Types:</span>
      {displayTypes.map(eventType => {
        const isSelected = !selectedTypes || selectedTypes.includes(eventType.type);
        return (
          <button
            key={eventType.type}
            type="button"
            onClick={() => onToggleType?.(eventType.type)}
            className={cn(
              "flex items-center gap-1.5 transition-opacity duration-150",
              isInteractive && "cursor-pointer hover:opacity-80",
              !isInteractive && "cursor-default",
              !isSelected && "opacity-40"
            )}
          >
            <span className={cn("w-2.5 h-2.5 rounded-full", eventType.dotColor)} />
            <span className={cn(
              "text-sm font-medium text-foreground",
              !isSelected && "line-through"
            )}>
              {eventType.shortName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
