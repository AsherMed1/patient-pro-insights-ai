
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import type { SpeedToLeadStat, DateRange } from '../types';

export const useSpeedToLeadData = () => {
  const [stats, setStats] = useState<SpeedToLeadStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const { toast } = useToast();

  const fetchStats = useCallback(async (dateRange: DateRange, isForceRefresh = false) => {
    try {
      setLoading(true);
      
      if (isForceRefresh) {
        console.log('Force refreshing speed-to-lead data...');
      }
      
      let query = supabase
        .from('speed_to_lead_stats')
        .select('*')
        .not('date_time_of_first_call', 'is', null)
        .not('speed_to_lead_time_min', 'is', null)
        .gte('speed_to_lead_time_min', 0);

      // Apply date filters if set
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        query = query.gte('date', fromDate);
      }

      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        query = query.lte('date', toDate);
      }

      const { data, error } = await query.order('date_time_in', { ascending: false });

      if (error) {
        console.error('Error fetching speed to lead stats:', error);
        toast({
          title: "Error",
          description: "Failed to fetch speed to lead statistics",
          variant: "destructive",
        });
      } else {
        console.log(`Fetched ${data?.length || 0} speed-to-lead records`);
        setStats(data || []);
        setLastUpdateTime(new Date().toLocaleTimeString());
        
        if (isForceRefresh) {
          toast({
            title: "Data Refreshed",
            description: `Refreshed speed-to-lead data. ${data?.length || 0} records loaded.`,
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    stats,
    setStats,
    loading,
    lastUpdateTime,
    fetchStats
  };
};
