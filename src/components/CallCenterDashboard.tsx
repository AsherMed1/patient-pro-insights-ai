
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CallMetricsCards from './dashboard/CallMetricsCards';
import ConversionMetrics from './dashboard/ConversionMetrics';
import AgentPerformanceSection from './dashboard/AgentPerformanceSection';

interface CallCenterDashboardProps {
  projectId: string;
}

interface CallData {
  totalDials: number;
  connectRate: number;
  appointmentsSet: number;
  avgCallDuration: number;
  leadContactRatio: number;
  agents: Array<{
    name: string;
    appointments: number;
    connectRate: number;
  }>;
}

const CallCenterDashboard = ({ projectId }: CallCenterDashboardProps) => {
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [projectId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch calls data
      const { data: calls, error: callsError } = await supabase
        .from('all_calls')
        .select('*')
        .eq('project_name', projectId);
      
      if (callsError) throw new Error(callsError.message);

      // Fetch appointments
      const { data: appointments, error: apptsError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('project_name', projectId);
        
      if (apptsError) throw new Error(apptsError.message);

      // Fetch agents
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('active', true);
        
      if (agentsError) throw new Error(agentsError.message);

      // Calculate statistics
      const totalDials = calls ? calls.length : 0;
      
      const answeredCalls = calls ? calls.filter(call => 
        call.status === 'answered' || call.status === 'connected' || call.status === 'pickup'
      ).length : 0;
      
      const connectRate = totalDials > 0 ? (answeredCalls / totalDials) * 100 : 0;
      
      const totalCallDuration = calls ? calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) : 0;
      const avgCallDuration = totalDials > 0 ? totalCallDuration / totalDials / 60 : 0;
      
      const appointmentsSet = appointments ? appointments.length : 0;
      
      // Calculate agent-specific metrics
      const agentMetrics = agents ? agents.map(agent => {
        const agentCalls = calls ? calls.filter(call => call.agent === agent.agent_name) : [];
        const agentCallsCount = agentCalls.length;
        
        const agentAnsweredCalls = agentCalls.filter(call => 
          call.status === 'answered' || call.status === 'connected' || call.status === 'pickup'
        ).length;
        
        const agentConnectRate = agentCallsCount > 0 ? (agentAnsweredCalls / agentCallsCount) * 100 : 0;
        
        const agentAppointments = appointments ? 
          appointments.filter(appt => appt.agent === agent.agent_name).length : 0;
        
        return {
          name: agent.agent_name,
          appointments: agentAppointments,
          connectRate: agentConnectRate
        };
      }) : [];

      // Calculate lead contact ratio (average calls per appointment)
      const leadContactRatio = appointmentsSet > 0 ? totalDials / appointmentsSet : 0;

      setCallData({
        totalDials,
        connectRate,
        appointmentsSet,
        avgCallDuration,
        leadContactRatio,
        agents: agentMetrics
      });

    } catch (err) {
      console.error('Error fetching call center data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600">Error loading dashboard: {error}</p>
        <button 
          onClick={() => fetchDashboardData()}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  const data = callData || {
    totalDials: 0,
    connectRate: 0,
    appointmentsSet: 0,
    avgCallDuration: 0,
    leadContactRatio: 0,
    agents: []
  };

  return (
    <div className="space-y-6">
      <CallMetricsCards 
        totalDials={data.totalDials}
        connectRate={data.connectRate}
        appointmentsSet={data.appointmentsSet}
        avgCallDuration={data.avgCallDuration}
      />

      <ConversionMetrics 
        totalDials={data.totalDials}
        connectRate={data.connectRate}
        appointmentsSet={data.appointmentsSet}
        leadContactRatio={data.leadContactRatio}
      />

      <AgentPerformanceSection 
        agents={data.agents}
        totalAppointments={data.appointmentsSet}
      />
    </div>
  );
};

export default CallCenterDashboard;
