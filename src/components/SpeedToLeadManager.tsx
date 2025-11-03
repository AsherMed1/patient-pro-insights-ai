
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import SpeedToLeadHeader from './speedtolead/SpeedToLeadHeader';
import SpeedToLeadDateFilter from './speedtolead/SpeedToLeadDateFilter';
import SpeedToLeadDashboardCards from './speedtolead/SpeedToLeadDashboardCards';
import SpeedToLeadCharts from './speedtolead/SpeedToLeadCharts';
import SpeedToLeadDataTable from './speedtolead/SpeedToLeadDataTable';
import SpeedToLeadEmptyState from './speedtolead/SpeedToLeadEmptyState';

interface SpeedToLeadStat {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  lead_phone_number: string;
  date_time_in: string;
  date_time_of_first_call: string | null;
  speed_to_lead_time_min: number | null;
  created_at: string;
  updated_at: string;
}

interface SpeedToLeadManagerProps {
  viewOnly?: boolean;
}

const SpeedToLeadManager = ({ viewOnly = false }: SpeedToLeadManagerProps) => {
  const [stats, setStats] = useState<SpeedToLeadStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    setupRealtimeSubscription();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('speed_to_lead_stats')
        .select('*')
        .not('date_time_of_first_call', 'is', null)
        .not('speed_to_lead_time_min', 'is', null)
        .gte('speed_to_lead_time_min', 0)
        .neq('project_name', 'PPM - Test Account');

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
        setStats(data || []);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerSpeedToLeadCalculation = async () => {
    try {
      setCalculating(true);
      
      const { data, error } = await supabase.functions.invoke('speed-to-lead-calculator');
      
      if (error) {
        console.error('Error triggering speed-to-lead calculation:', error);
        toast({
          title: "Error",
          description: "Failed to trigger speed-to-lead calculation",
          variant: "destructive",
        });
      } else {
        console.log('Speed-to-lead calculation result:', data);
        toast({
          title: "Success",
          description: `Speed-to-lead calculation completed. ${data?.stats?.totalProcessed || 0} leads processed.`,
        });
        // Refresh the data after calculation
        setTimeout(() => {
          fetchStats();
        }, 1000);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to trigger speed-to-lead calculation",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('speed-to-lead-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'speed_to_lead_stats'
        },
        (payload) => {
          console.log('Real-time speed-to-lead update:', payload);
          fetchStats();
          toast({
            title: "Live Update",
            description: "Speed-to-lead data updated in real-time",
          });
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
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };

  // Calculate statistics
  const validStats = stats.filter(s => 
    s.date_time_of_first_call && 
    s.speed_to_lead_time_min !== null && 
    s.speed_to_lead_time_min >= 0
  );

  // Data for charts
  const speedRangeData = [
    {
      range: '≤ 5 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min <= 5).length,
      color: '#22c55e'
    },
    {
      range: '5-15 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 5 && s.speed_to_lead_time_min <= 15).length,
      color: '#eab308'
    },
    {
      range: '15-60 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 15 && s.speed_to_lead_time_min <= 60).length,
      color: '#f97316'
    },
    {
      range: '> 1 hour',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 60).length,
      color: '#ef4444'
    }
  ];

  return (
    <div className="space-y-6">
      <SpeedToLeadHeader
        lastUpdateTime={lastUpdateTime}
        calculating={calculating}
        onTriggerCalculation={triggerSpeedToLeadCalculation}
      />

      <SpeedToLeadDateFilter
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
      
      {loading ? (
        <div className="text-center py-8">Loading live data...</div>
      ) : validStats.length === 0 ? (
        <SpeedToLeadEmptyState
          calculating={calculating}
          onTriggerCalculation={triggerSpeedToLeadCalculation}
        />
      ) : (
        <>
          <SpeedToLeadDashboardCards
            validStats={validStats}
            speedRangeData={speedRangeData}
          />

          <SpeedToLeadCharts speedRangeData={speedRangeData} />

          <SpeedToLeadDataTable
            validStats={validStats}
            dateRange={dateRange}
          />
        </>
      )}
    </div>
  );
};

export default SpeedToLeadManager;
