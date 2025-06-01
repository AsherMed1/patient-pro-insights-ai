
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Phone, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import AgentPerformanceTable from './AgentPerformanceTable';
import AgentPerformanceStats from './AgentPerformanceStats';

interface AgentPerformanceData {
  id: string;
  date: string;
  agent_name: string;
  agent_id: string | null;
  total_dials_made: number;
  answered_calls_vm: number;
  pickups_40_seconds_plus: number;
  conversations_2_minutes_plus: number;
  booked_appointments: number;
  time_on_phone_minutes: number;
  average_duration_per_call_seconds: number;
  average_duration_per_call_minutes: number;
  appts_to_take_place: number;
  shows: number;
  no_shows: number;
  show_rate: number;
  created_at: string;
  updated_at: string;
}

const AgentPerformanceDashboard = () => {
  const [performanceData, setPerformanceData] = useState<AgentPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPerformanceData();
    setupRealtimeSubscription();
  }, [selectedDate]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_performance_stats')
        .select('*')
        .eq('date', selectedDate)
        .order('agent_name');

      if (error) throw error;
      setPerformanceData(data || []);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent performance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('agent-performance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_performance_stats',
          filter: `date=eq.${selectedDate}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchPerformanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getTotalStats = () => {
    return performanceData.reduce((totals, agent) => ({
      totalDials: totals.totalDials + agent.total_dials_made,
      totalAnswered: totals.totalAnswered + agent.answered_calls_vm,
      totalBooked: totals.totalBooked + agent.booked_appointments,
      totalShows: totals.totalShows + agent.shows,
      totalNoShows: totals.totalNoShows + agent.no_shows,
      totalTimeOnPhone: totals.totalTimeOnPhone + agent.time_on_phone_minutes,
    }), {
      totalDials: 0,
      totalAnswered: 0,
      totalBooked: 0,
      totalShows: 0,
      totalNoShows: 0,
      totalTimeOnPhone: 0,
    });
  };

  const totalStats = getTotalStats();
  const averageShowRate = performanceData.length > 0 
    ? performanceData.reduce((sum, agent) => sum + agent.show_rate, 0) / performanceData.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Agent Performance Dashboard</h2>
          <p className="text-gray-600">Real-time agent statistics and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-1"
          />
          <Badge variant="outline" className="ml-2">
            Live Updates
          </Badge>
        </div>
      </div>

      <AgentPerformanceStats 
        totalStats={totalStats}
        averageShowRate={averageShowRate}
        agentCount={performanceData.length}
      />

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Details</CardTitle>
          <CardDescription>
            Detailed performance metrics for {selectedDate} - {performanceData.length} agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentPerformanceTable 
            data={performanceData}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPerformanceDashboard;
