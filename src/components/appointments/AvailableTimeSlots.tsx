import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailableTimeSlotsProps {
  calendarId: string | null;
  date: string; // YYYY-MM-DD
  timezone: string;
  ghlApiKey: string | null;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  onFallbackToCustom: () => void;
}

const AvailableTimeSlots: React.FC<AvailableTimeSlotsProps> = ({
  calendarId,
  date,
  timezone,
  ghlApiKey,
  selectedTime,
  onSelectTime,
  onFallbackToCustom,
}) => {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    if (!calendarId || !date) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-ghl-availability', {
        body: { calendarId, date, timezone, ghl_api_key: ghlApiKey },
      });

      if (fnError) throw fnError;
      setSlots(data?.slots || []);
    } catch (err: any) {
      console.error('Error fetching availability:', err);
      setError(err.message || 'Failed to fetch available times');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [calendarId, date]);

  const formatSlotDisplay = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (!calendarId) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-muted-foreground mb-2">No calendar found for this appointment</p>
        <Button variant="link" size="sm" onClick={onFallbackToCustom} className="text-xs">
          Use custom time
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading available times...
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-3 space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-destructive text-sm">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Failed to load times</span>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={fetchSlots} className="text-xs h-7">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
          <Button variant="link" size="sm" onClick={onFallbackToCustom} className="text-xs h-7">
            Use custom time
          </Button>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-muted-foreground mb-2">No available slots for this date</p>
        <Button variant="link" size="sm" onClick={onFallbackToCustom} className="text-xs">
          Use custom time
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium block">Available Times</label>
      <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto">
        {slots.map((slot) => (
          <Button
            key={slot}
            variant={selectedTime === slot ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs font-medium",
              selectedTime === slot && "ring-2 ring-primary ring-offset-1"
            )}
            onClick={() => onSelectTime(slot)}
          >
            {formatSlotDisplay(slot)}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default AvailableTimeSlots;
