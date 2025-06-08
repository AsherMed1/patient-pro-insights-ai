
import { useCallback, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import type { SpeedToLeadStat } from '../types';

export const useSpeedToLeadRealtime = (
  forceRefreshKey: number,
  fetchStats: () => void,
  setStats: React.Dispatch<React.SetStateAction<SpeedToLeadStat[]>>
) => {
  const { toast } = useToast();

  const setupRealtimeSubscription = useCallback(() => {
    const channel = supabase
      .channel(`speed-to-lead-changes-${forceRefreshKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'speed_to_lead_stats'
        },
        (payload) => {
          console.log('Real-time speed-to-lead update:', payload);
          
          // Handle different event types
          if (payload.eventType === 'DELETE') {
            console.log('Record deleted, removing from state:', payload.old);
            setStats(prevStats => prevStats.filter(stat => stat.id !== payload.old.id));
            toast({
              title: "Live Update",
              description: "Speed-to-lead record deleted",
            });
          } else if (payload.eventType === 'INSERT') {
            console.log('Record inserted:', payload.new);
            fetchStats();
            toast({
              title: "Live Update",
              description: "New speed-to-lead record added",
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('Record updated:', payload.new);
            fetchStats();
            toast({
              title: "Live Update",
              description: "Speed-to-lead record updated",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'new_leads'
        },
        (payload) => {
          console.log('New lead detected:', payload);
          toast({
            title: "New Lead Detected",
            description: "New lead added - speed-to-lead calculation may be needed",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'all_calls'
        },
        (payload) => {
          console.log('New call detected:', payload);
          toast({
            title: "New Call Detected",
            description: "New call recorded - speed-to-lead calculation may be needed",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [forceRefreshKey, fetchStats, toast, setStats]);

  useEffect(() => {
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [setupRealtimeSubscription]);
};
