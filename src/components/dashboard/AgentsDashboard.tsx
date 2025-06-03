
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phone, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';

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

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "blue",
    isMinutes = false 
  }: {
    title: string;
    value: number;
    icon: any;
    color?: string;
    isMinutes?: boolean;
  }) => {
    const formatValue = () => {
      if (isMinutes) return `${Math.round(value)} min`;
      return Math.round(value).toString();
    };

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{title}</p>
              <p className={`text-2xl font-bold text-${color}-600`}>
                {formatValue()}
              </p>
            </div>
            <Icon className={`h-8 w-8 text-${color}-500`} />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Agent:</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Agents (Collective)</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.agent_name}>
                    {agent.agent_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p>Loading agent statistics...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Call Performance */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>Call Performance</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Answered Calls + VM" value={stats.answeredCallsVM} icon={Phone} color="blue" />
              <StatCard title="Pickups (40+ Seconds)" value={stats.pickups40Plus} icon={CheckCircle} color="green" />
              <StatCard title="Conversations (2+ Minutes)" value={stats.conversations2Plus} icon={Clock} color="purple" />
              <StatCard title="Avg Duration Per Call" value={stats.avgDurationPerCall} icon={TrendingUp} color="orange" isMinutes />
            </div>
          </div>

          {/* Appointment Performance */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Appointment Performance</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Booked Appointments" value={stats.bookedAppointments} icon={Users} color="blue" />
              <StatCard title="Shows" value={stats.shows} icon={CheckCircle} color="green" />
              <StatCard title="No Shows" value={stats.noShows} icon={Phone} color="red" />
            </div>
          </div>

          {/* Activity Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Activity Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard title="Total Dials Made" value={stats.totalDialsMade} icon={Phone} color="blue" />
              <StatCard title="Time on Phone" value={stats.timeOnPhoneMinutes} icon={Clock} color="purple" isMinutes />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
};

export default AgentsDashboard;
