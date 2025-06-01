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
      
      // Try to get data from agent_performance_stats first
      const { data: existingData, error: existingError } = await supabase
        .from('agent_performance_stats')
        .select('*')
        .eq('date', selectedDate)
        .order('agent_name');

      if (existingError) {
        console.error('Error fetching existing performance data:', existingError);
      }

      // If we have existing data, use it
      if (existingData && existingData.length > 0) {
        setPerformanceData(existingData);
      } else {
        // Otherwise, calculate from call center stats tables
        await calculatePerformanceFromCallData();
      }
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

  const calculatePerformanceFromCallData = async () => {
    try {
      // Get all agents
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('active', true);

      if (agentsError) throw agentsError;

      // Get call data for the selected date
      const { data: calls, error: callsError } = await supabase
        .from('all_calls')
        .select('*')
        .eq('date', selectedDate);

      if (callsError) throw callsError;

      // Get appointment data for the selected date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('date_appointment_created', selectedDate);

      if (appointmentsError) throw appointmentsError;

      // Calculate performance for each agent
      const calculatedPerformance = (agents || []).map(agent => {
        const agentCalls = calls?.filter(call => call.agent === agent.agent_name) || [];
        const agentAppointments = appointments?.filter(apt => apt.agent === agent.agent_name) || [];

        const totalDials = agentCalls.length;
        const answeredCalls = agentCalls.filter(call => call.status === 'answered' || call.status === 'voicemail').length;
        const pickups40Plus = agentCalls.filter(call => call.duration_seconds >= 40).length;
        const conversations2Plus = agentCalls.filter(call => call.duration_seconds >= 120).length;
        const totalDuration = agentCalls.reduce((sum, call) => sum + call.duration_seconds, 0);
        const avgDurationSeconds = totalDials > 0 ? Math.round(totalDuration / totalDials) : 0;
        const timeOnPhoneMinutes = Math.round(totalDuration / 60);
        
        const bookedAppointments = agentAppointments.length;
        const shows = agentAppointments.filter(apt => apt.showed).length;
        const noShows = agentAppointments.filter(apt => !apt.showed && apt.date_of_appointment && new Date(apt.date_of_appointment) < new Date()).length;
        const showRate = (shows + noShows) > 0 ? (shows / (shows + noShows)) * 100 : 0;

        return {
          id: `calculated-${agent.id}-${selectedDate}`,
          date: selectedDate,
          agent_name: agent.agent_name,
          agent_id: agent.id,
          total_dials_made: totalDials,
          answered_calls_vm: answeredCalls,
          pickups_40_seconds_plus: pickups40Plus,
          conversations_2_minutes_plus: conversations2Plus,
          booked_appointments: bookedAppointments,
          time_on_phone_minutes: timeOnPhoneMinutes,
          average_duration_per_call_seconds: avgDurationSeconds,
          average_duration_per_call_minutes: avgDurationSeconds / 60,
          appts_to_take_place: bookedAppointments,
          shows: shows,
          no_shows: noShows,
          show_rate: showRate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      setPerformanceData(calculatedPerformance);
    } catch (error) {
      console.error('Error calculating performance from call data:', error);
      setPerformanceData([]);
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'all_calls',
          filter: `date=eq.${selectedDate}`
        },
        (payload) => {
          console.log('Real-time call update:', payload);
          fetchPerformanceData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'all_appointments',
          filter: `date_appointment_created=eq.${selectedDate}`
        },
        (payload) => {
          console.log('Real-time appointment update:', payload);
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
          <p className="text-gray-600">Real-time agent statistics calculated from call center data</p>
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
            Performance metrics calculated from call center data for {selectedDate} - {performanceData.length} agents
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
