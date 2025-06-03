
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AgentFilters from './AgentFilters';
import AgentStatsDisplay from './AgentStatsDisplay';

interface AgentStats {
  answeredCallsVM: number;
  pickups40Plus: number;
  conversations2Plus: number;
  bookedAppointments: number;
  avgDurationPerCall: number;
  shows: number;
  noShows: number;
  totalDialsMade: number;
  timeOnPhoneMinutes: number;
}

const AgentsDashboard = () => {
  const [agents, setAgents] = useState<Array<{ id: string; agent_name: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedAgent]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, agent_name')
        .eq('active', true)
        .order('agent_name');
      
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive"
      });
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Build base queries
      let callsQuery = supabase.from('all_calls').select('*');
      let appointmentsQuery = supabase.from('all_appointments').select('*');

      // Apply agent filter if not ALL
      if (selectedAgent !== 'ALL') {
        callsQuery = callsQuery.eq('agent', selectedAgent);
        appointmentsQuery = appointmentsQuery.eq('agent', selectedAgent);
      }

      // Execute queries
      const [callsResult, appointmentsResult] = await Promise.all([
        callsQuery,
        appointmentsQuery
      ]);

      if (callsResult.error) throw callsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const calls = callsResult.data || [];
      const appointments = appointmentsResult.data || [];

      // Calculate metrics
      const totalDialsMade = calls.length;
      const answeredCallsVM = calls.filter(call => 
        call.status === 'answered' || call.status === 'connected' || call.status === 'pickup' || call.status === 'voicemail'
      ).length;
      
      const pickups40Plus = calls.filter(call => 
        (call.status === 'answered' || call.status === 'connected' || call.status === 'pickup') && 
        call.duration_seconds >= 40
      ).length;
      
      const conversations2Plus = calls.filter(call => call.duration_seconds >= 120).length;
      
      const bookedAppointments = appointments.length;
      const shows = appointments.filter(apt => apt.showed).length;
      const noShows = appointments.filter(apt => apt.showed === false).length;
      
      const totalCallDuration = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      const avgDurationPerCall = totalDialsMade > 0 ? totalCallDuration / totalDialsMade : 0;
      const timeOnPhoneMinutes = totalCallDuration / 60;

      setStats({
        answeredCallsVM,
        pickups40Plus,
        conversations2Plus,
        bookedAppointments,
        avgDurationPerCall,
        shows,
        noShows,
        totalDialsMade,
        timeOnPhoneMinutes
      });

    } catch (error) {
      console.error('Error fetching agent stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AgentFilters
        agents={agents}
        selectedAgent={selectedAgent}
        onAgentChange={setSelectedAgent}
      />

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p>Loading agent statistics...</p>
        </div>
      ) : stats ? (
        <AgentStatsDisplay stats={stats} />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
};

export default AgentsDashboard;
