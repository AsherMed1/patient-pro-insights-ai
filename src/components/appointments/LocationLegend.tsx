import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';

const LOCATION_COLORS = [
  'bg-slate-500',
  'bg-zinc-500',
  'bg-stone-500',
  'bg-sky-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-amber-500',
];

const LEGACY_LOCATIONS = ['Somerset, KY', 'Milledgeville', 'Somerset'];

function extractLocationFromCalendarName(calendarName: string): string | null {
  const atMatch = calendarName.match(/at\s+(.+)$/i);
  if (atMatch) {
    const loc = atMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '');
    return loc;
  }
  const dashMatch = calendarName.match(/ - (.+)$/);
  if (dashMatch) {
    const loc = dashMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '');
    return loc;
  }
  const consultMatch = calendarName.match(/Consultation\s+(.+)$/i);
  if (consultMatch) {
    const loc = consultMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '');
    return loc;
  }
  return null;
}

interface LocationLegendProps {
  projectName: string;
  selectedLocations: string[];
  onToggleLocation: (location: string) => void;
}

export { extractLocationFromCalendarName };

export function LocationLegend({ projectName, selectedLocations, onToggleLocation }: LocationLegendProps) {
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('all_appointments')
          .select('calendar_name')
          .eq('project_name', projectName)
          .not('calendar_name', 'is', null);

        if (error) throw error;

        const uniqueLocations = new Set<string>();
        data?.forEach(row => {
          const loc = extractLocationFromCalendarName(row.calendar_name);
          if (loc && !LEGACY_LOCATIONS.some(legacy => loc.includes(legacy))) {
            uniqueLocations.add(loc);
          }
        });

        setLocations(Array.from(uniqueLocations).sort());
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectName) fetchLocations();
  }, [projectName]);

  if (loading || locations.length < 2) return null;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        Locations:
      </span>
      {locations.map((location, index) => {
        const isSelected = selectedLocations.length === 0 || selectedLocations.includes(location);
        const dotColor = LOCATION_COLORS[index % LOCATION_COLORS.length];
        return (
          <button
            key={location}
            type="button"
            onClick={() => onToggleLocation(location)}
            className={cn(
              "flex items-center gap-1.5 transition-opacity duration-150 cursor-pointer hover:opacity-80",
              !isSelected && "opacity-40"
            )}
          >
            <span className={cn("w-2.5 h-2.5 rounded-full", dotColor)} />
            <span className={cn(
              "text-sm font-medium text-foreground",
              !isSelected && "line-through"
            )}>
              {location}
            </span>
          </button>
        );
      })}
    </div>
  );
}
