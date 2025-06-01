
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneCall, Clock, UserCheck, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
      {/* Call Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Dials</CardTitle>
            <Phone className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDials.toLocaleString()}</div>
            <p className="text-xs opacity-90 mt-1">From database</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Connect Rate</CardTitle>
            <PhoneCall className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.connectRate.toFixed(1)}%</div>
            <Progress value={data.connectRate} className="mt-2 bg-cyan-400" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Appointments Set</CardTitle>
            <UserCheck className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.appointmentsSet}</div>
            <p className="text-xs opacity-90 mt-1">From database</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Avg Call Time</CardTitle>
            <Clock className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgCallDuration.toFixed(1)} min</div>
            <p className="text-xs opacity-90 mt-1">Per connected call</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Call-to-Appointment Conversion</CardTitle>
            <CardDescription>Efficiency of converting calls to bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Connected Calls</span>
                <span className="text-2xl font-bold text-blue-600">
                  {Math.round(data.totalDials * (data.connectRate / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Appointments Booked</span>
                <span className="text-2xl font-bold text-green-600">{data.appointmentsSet}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Conversion Rate</span>
                <span className="text-xl font-bold text-purple-600">
                  {data.connectRate > 0 && data.appointmentsSet > 0 
                    ? ((data.appointmentsSet / (data.totalDials * (data.connectRate / 100))) * 100).toFixed(1) 
                    : '0.0'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Call Efficiency Metrics</CardTitle>
            <CardDescription>Lead contact and follow-up performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Calls Per Appointment</span>
                <span className="text-2xl font-bold text-orange-600">
                  {data.appointmentsSet > 0 
                    ? (data.totalDials / data.appointmentsSet).toFixed(1) 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Lead Contact Ratio</span>
                <span className="text-2xl font-bold text-red-600">
                  {data.leadContactRatio ? data.leadContactRatio.toFixed(1) : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Efficiency Score</span>
                  <Badge variant="default">
                    {data.leadContactRatio < 3 && data.connectRate > 65 ? 'Excellent' : 'Good'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Agent Performance</span>
          </CardTitle>
          <CardDescription>Individual agent metrics and contributions</CardDescription>
        </CardHeader>
        <CardContent>
          {data.agents.length > 0 ? (
            <div className="space-y-4">
              {data.agents.map((agent, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{agent.name}</h4>
                      <p className="text-sm text-gray-600">Call Center Agent</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {agent.appointments} appointments
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Connect Rate</label>
                      <div className="mt-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-lg font-bold">{agent.connectRate.toFixed(1)}%</span>
                          <span className="text-sm text-gray-500">Target: 65%</span>
                        </div>
                        <Progress value={agent.connectRate} className="h-2" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Appointment Contribution</label>
                      <div className="mt-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-lg font-bold">
                            {data.appointmentsSet > 0
                              ? ((agent.appointments / data.appointmentsSet) * 100).toFixed(1)
                              : '0.0'}%
                          </span>
                          <span className="text-sm text-gray-500">of total</span>
                        </div>
                        <Progress 
                          value={data.appointmentsSet > 0 ? (agent.appointments / data.appointmentsSet) * 100 : 0} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No agent data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCenterDashboard;
