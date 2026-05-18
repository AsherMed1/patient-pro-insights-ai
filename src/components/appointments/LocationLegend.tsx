import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';
import { getEventTypeFromCalendar } from './calendarUtils';

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

function extractLocationFromCalendarName(calendarName: string, parsedLocationFallback?: string | null): string | null {
  const fallback = parsedLocationFallback && parsedLocationFallback.trim() && !/^unknown$/i.test(parsedLocationFallback.trim())
    ? parsedLocationFallback.trim().replace(/\s+Office$/i, '')
    : null;
  // If calendar_name is missing or literally "Unknown", use parsed Location Picker fallback
  if (!calendarName || /^unknown$/i.test(calendarName.trim())) {
    return fallback;
  }
  // Handle "Virtual Consultation" as a location
  if (/virtual\s+consultation/i.test(calendarName)) {
    return 'Virtual';
  }
  // Handle parenthesized format: "(San Antonio, TX – Knee Pain Treatment)"
  const parenMatch = calendarName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1].split(/\s[–-]\s/)[0].trim();
    const loc = inner.replace(/,\s*[A-Z]{2}$/, '').trim();
    return loc ? loc.replace(/\s+Office$/i, '').trim() : fallback;
  }
  const atMatch = calendarName.match(/at\s+(.+)$/i);
  if (atMatch) {
    let loc = atMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '');
    const dashIdx = loc.lastIndexOf(' - ');
    if (dashIdx !== -1) {
      loc = loc.substring(dashIdx + 3).trim();
    }
    return loc.replace(/\s+Office$/i, '').trim();
  }
  const dashMatch = calendarName.match(/ - (.+)$/);
  if (dashMatch) {
    return dashMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '').replace(/\s+Office$/i, '').trim();
  }
  const consultMatch = calendarName.match(/Consultation\s+(.+)$/i);
  if (consultMatch) {
    const loc = consultMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '');
    if (/^for\s+/i.test(loc)) return fallback;
    return loc.replace(/\s+Office$/i, '').trim();
  }
  return fallback;
}

interface LocationLegendProps {
  projectName: string;
  selectedLocations: string[];
  onToggleLocation: (location: string) => void;
  activeEventTypes?: string[];
}

export { extractLocationFromCalendarName };

export function LocationLegend({ projectName, selectedLocations, onToggleLocation, activeEventTypes }: LocationLegendProps) {
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('all_appointments')
          .select('calendar_name, patient_intake_notes, parsed_pathology_info')
          .eq('project_name', projectName)
          .not('calendar_name', 'is', null);

        if (error) throw error;

        const uniqueLocations = new Set<string>();
        const isVSNC = projectName === 'Vascular Surgery Center of Excellence';
        const hasNeuroFilter = activeEventTypes?.some(t => t.toLowerCase() === 'neuropathy');

        data?.forEach((row: any) => {
          // If event type filtering is active, only include locations for matching event types
          if (activeEventTypes && activeEventTypes.length > 0) {
            const fallback = row.parsed_pathology_info?.procedure || row.patient_intake_notes;
            const eventType = getEventTypeFromCalendar(row.calendar_name, false, fallback);
            if (!activeEventTypes.includes(eventType.type)) {
              return;
            }
          }

          const loc = extractLocationFromCalendarName(
            row.calendar_name,
            row.parsed_pathology_info?.location
          );
          if (!loc) return;
          if (LEGACY_LOCATIONS.some(legacy => loc.includes(legacy))) return;

          // Exclude Virtual for VSNC project, or when Neuro is explicitly filtered
          if (loc === 'Virtual' && (isVSNC || hasNeuroFilter)) {
            return;
          }

          uniqueLocations.add(loc);
        });

        setLocations(Array.from(uniqueLocations).sort());
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectName) fetchLocations();
  }, [projectName, activeEventTypes]);

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
