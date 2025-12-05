import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GHLCalendar {
  id: string;
  name: string;
}

interface UseGhlCalendarsReturn {
  calendars: GHLCalendar[];
  loading: boolean;
  error: string | null;
  fetchCalendars: (ghlLocationId: string, ghlApiKey?: string) => Promise<void>;
  transferToCalendar: (ghlAppointmentId: string, calendarId: string, ghlApiKey?: string) => Promise<boolean>;
}

export function useGhlCalendars(): UseGhlCalendarsReturn {
  const [calendars, setCalendars] = useState<GHLCalendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = useCallback(async (ghlLocationId: string, ghlApiKey?: string) => {
    if (!ghlLocationId) {
      setError('No GHL location ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-ghl-calendars', {
        body: { 
          ghl_location_id: ghlLocationId,
          ghl_api_key: ghlApiKey
        }
      });

      if (fnError) throw fnError;

      if (data?.calendars) {
        setCalendars(data.calendars);
      } else {
        setCalendars([]);
      }
    } catch (err: any) {
      console.error('Error fetching GHL calendars:', err);
      setError(err.message || 'Failed to fetch calendars');
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const transferToCalendar = useCallback(async (
    ghlAppointmentId: string, 
    calendarId: string,
    ghlApiKey?: string
  ): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('update-ghl-appointment', {
        body: { 
          ghl_appointment_id: ghlAppointmentId,
          calendar_id: calendarId,
          ghl_api_key: ghlApiKey
        }
      });

      if (fnError) throw fnError;

      return data?.success === true;
    } catch (err: any) {
      console.error('Error transferring appointment:', err);
      throw err;
    }
  }, []);

  return {
    calendars,
    loading,
    error,
    fetchCalendars,
    transferToCalendar
  };
}
