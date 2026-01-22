import React from 'react';
import { EVENT_TYPES } from './calendarUtils';
import { cn } from '@/lib/utils';

export function EventTypeLegend() {
  // Only show main event types, not "Other"
  const displayTypes = EVENT_TYPES.filter(t => t.type !== 'Other');
  
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
