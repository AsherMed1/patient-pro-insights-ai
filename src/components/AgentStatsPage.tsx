
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface Agent {
  id: string;
  agent_name: string;
  agent_number: string;
}

interface AgentStats {
  id: string;
  agent_name: string;
  date: string;
  answered_calls_vm: number;
  pickups_40_seconds_plus: number;
  conversations_2_minutes_plus: number;
  booked_appointments: number;
  average_duration_per_call_minutes: number;
  shows: number;
  no_shows: number;
  total_dials_made: number;
  time_on_phone_minutes: number;
}

interface AgentStatsPageProps {
  onBack: () => void;
}

const AgentStatsPage = ({ onBack }: AgentStatsPageProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, agent_name, agent_number')
        .eq('active', true)
        .order('agent_number');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive",
      });
    }
  };

  const fetchAgentStats = async () => {
    if (!selectedAgentId || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please select an agent and date range",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_performance_stats')
        .select('*')
        .eq('agent_id', selectedAgentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching agent stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

  const totalStats = stats.reduce((acc, stat) => ({
    answered_calls_vm: acc.answered_calls_vm + stat.answered_calls_vm,
    pickups_40_seconds_plus: acc.pickups_40_seconds_plus + stat.pickups_40_seconds_plus,
    conversations_2_minutes_plus: acc.conversations_2_minutes_plus + stat.conversations_2_minutes_plus,
    booked_appointments: acc.booked_appointments + stat.booked_appointments,
    shows: acc.shows + stat.shows,
    no_shows: acc.no_shows + stat.no_shows,
    total_dials_made: acc.total_dials_made + stat.total_dials_made,
    time_on_phone_minutes: acc.time_on_phone_minutes + stat.time_on_phone_minutes,
  }), {
    answered_calls_vm: 0,
    pickups_40_seconds_plus: 0,
    conversations_2_minutes_plus: 0,
    booked_appointments: 0,
    shows: 0,
    no_shows: 0,
    total_dials_made: 0,
    time_on_phone_minutes: 0,
  });

  const avgDurationPerCall = stats.length > 0 
    ? stats.reduce((acc, stat) => acc + stat.average_duration_per_call_minutes, 0) / stats.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
        <h1 className="text-3xl font-bold">Agent Performance Dashboard</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Filter Options</span>
          </CardTitle>
          <CardDescription>Select an agent and date range to view performance statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="agent">Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.agent_number} - {agent.agent_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchAgentStats} disabled={loading} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Load Statistics'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedAgent && stats.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Performance Summary for {selectedAgent.agent_name} ({selectedAgent.agent_number})
              </CardTitle>
              <CardDescription>
                {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalStats.answered_calls_vm}</div>
                  <div className="text-sm text-gray-600">Answered Calls + VM</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{totalStats.pickups_40_seconds_plus}</div>
                  <div className="text-sm text-gray-600">Pickups (40+ Seconds)</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{totalStats.conversations_2_minutes_plus}</div>
                  <div className="text-sm text-gray-600">Conversations (2+ Minutes)</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalStats.booked_appointments}</div>
                  <div className="text-sm text-gray-600">Booked Appointments</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-indigo-600">{avgDurationPerCall.toFixed(1)}m</div>
                  <div className="text-sm text-gray-600">Avg Duration Per Call</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-emerald-600">{totalStats.shows}</div>
                  <div className="text-sm text-gray-600">Shows</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{totalStats.no_shows}</div>
                  <div className="text-sm text-gray-600">No Shows</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{totalStats.total_dials_made}</div>
                  <div className="text-sm text-gray-600">Total Dials Made</div>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-cyan-600">{totalStats.time_on_phone_minutes}</div>
                  <div className="text-sm text-gray-600">Time on Phone (Minutes)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {stats.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Breakdown</CardTitle>
                <CardDescription>Performance statistics by date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.map((stat) => (
                    <div key={stat.id} className="border rounded-lg p-4">
                      <div className="font-semibold text-lg mb-2">
                        {format(new Date(stat.date), 'EEEE, MMM dd, yyyy')}
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-sm">
                        <div>Calls + VM: <span className="font-medium">{stat.answered_calls_vm}</span></div>
                        <div>Pickups: <span className="font-medium">{stat.pickups_40_seconds_plus}</span></div>
                        <div>Conversations: <span className="font-medium">{stat.conversations_2_minutes_plus}</span></div>
                        <div>Appointments: <span className="font-medium">{stat.booked_appointments}</span></div>
                        <div>Avg Duration: <span className="font-medium">{stat.average_duration_per_call_minutes}m</span></div>
                        <div>Shows: <span className="font-medium">{stat.shows}</span></div>
                        <div>No Shows: <span className="font-medium">{stat.no_shows}</span></div>
                        <div>Total Dials: <span className="font-medium">{stat.total_dials_made}</span></div>
                        <div>Time on Phone: <span className="font-medium">{stat.time_on_phone_minutes}m</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {selectedAgent && stats.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No statistics found for the selected agent and date range.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentStatsPage;
