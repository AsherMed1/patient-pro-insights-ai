
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

interface CallRecord {
  id: string;
  date: string;
  call_datetime: string;
  duration_seconds: number;
  status: string;
  agent: string;
  direction: string;
}

interface AppointmentRecord {
  id: string;
  date_of_appointment: string;
  showed: boolean | null;
  agent: string;
  agent_number: string;
}

interface CalculatedStats {
  answeredCallsAndVm: number;
  pickups40SecondsPlus: number;
  conversations2MinutesPlus: number;
  bookedAppointments: number;
  averageDurationPerCall: number;
  shows: number;
  noShows: number;
  totalDialsMade: number;
  timeOnPhoneMinutes: number;
}

interface AgentStatsPageProps {
  onBack: () => void;
}

const AgentStatsPage = ({ onBack }: AgentStatsPageProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentName, setSelectedAgentName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [stats, setStats] = useState<CalculatedStats | null>(null);
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

  const fetchAgentData = async () => {
    if (!selectedAgentName || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please select an agent and date range",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Fetch calls for the selected agent in date range
      const { data: callsData, error: callsError } = await supabase
        .from('all_calls')
        .select('*')
        .eq('agent', selectedAgentName)
        .gte('date', startDate)
        .lte('date', endDate);

      if (callsError) throw callsError;

      // Fetch appointments for the selected agent in date range
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('agent', selectedAgentName)
        .gte('date_of_appointment', startDate)
        .lte('date_of_appointment', endDate);

      if (appointmentsError) throw appointmentsError;

      setCalls(callsData || []);
      setAppointments(appointmentsData || []);
      
      // Calculate stats from the fetched data
      calculateStats(callsData || [], appointmentsData || []);
      
    } catch (error) {
      console.error('Error fetching agent data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (callsData: CallRecord[], appointmentsData: AppointmentRecord[]) => {
    // Calculate call-based metrics
    const answeredCallsAndVm = callsData.filter(call => 
      call.status === 'answered' || call.status === 'voicemail' || call.status === 'completed'
    ).length;

    const pickups40SecondsPlus = callsData.filter(call => 
      call.duration_seconds >= 40 && (call.status === 'answered' || call.status === 'completed')
    ).length;

    const conversations2MinutesPlus = callsData.filter(call => 
      call.duration_seconds >= 120 && (call.status === 'answered' || call.status === 'completed')
    ).length;

    const totalDialsMade = callsData.filter(call => call.direction === 'outbound').length;
    
    const totalCallDuration = callsData.reduce((sum, call) => sum + call.duration_seconds, 0);
    const timeOnPhoneMinutes = Math.round(totalCallDuration / 60);
    
    const averageDurationPerCall = answeredCallsAndVm > 0 
      ? Math.round((totalCallDuration / answeredCallsAndVm) / 60 * 10) / 10 
      : 0;

    // Calculate appointment-based metrics
    const bookedAppointments = appointmentsData.length;
    const shows = appointmentsData.filter(apt => apt.showed === true).length;
    const noShows = appointmentsData.filter(apt => apt.showed === false).length;

    setStats({
      answeredCallsAndVm,
      pickups40SecondsPlus,
      conversations2MinutesPlus,
      bookedAppointments,
      averageDurationPerCall,
      shows,
      noShows,
      totalDialsMade,
      timeOnPhoneMinutes,
    });
  };

  const selectedAgent = agents.find(agent => agent.agent_name === selectedAgentName);

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
              <Select value={selectedAgentName} onValueChange={setSelectedAgentName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.agent_name}>
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
              <Button onClick={fetchAgentData} disabled={loading} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Load Statistics'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedAgent && stats && (
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.answeredCallsAndVm}</div>
                <div className="text-sm text-gray-600">Answered Calls + VM</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{stats.pickups40SecondsPlus}</div>
                <div className="text-sm text-gray-600">Pickups (40+ Seconds)</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.conversations2MinutesPlus}</div>
                <div className="text-sm text-gray-600">Conversations (2+ Minutes)</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.bookedAppointments}</div>
                <div className="text-sm text-gray-600">Booked Appointments</div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.averageDurationPerCall}m</div>
                <div className="text-sm text-gray-600">Avg Duration Per Call</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.shows}</div>
                <div className="text-sm text-gray-600">Shows</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{stats.noShows}</div>
                <div className="text-sm text-gray-600">No Shows</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.totalDialsMade}</div>
                <div className="text-sm text-gray-600">Total Dials Made</div>
              </div>
              <div className="bg-cyan-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-cyan-600">{stats.timeOnPhoneMinutes}</div>
                <div className="text-sm text-gray-600">Time on Phone (Minutes)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAgent && stats === null && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Click "Load Statistics" to view agent performance data.</p>
          </CardContent>
        </Card>
      )}

      {selectedAgent && stats && (calls.length > 0 || appointments.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {calls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Call Details</CardTitle>
                <CardDescription>{calls.length} calls made in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {calls.map((call) => (
                    <div key={call.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <div>
                        <div className="font-medium">{format(new Date(call.call_datetime), 'MMM dd, HH:mm')}</div>
                        <div className="text-gray-500">{call.status} - {Math.round(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</div>
                      </div>
                      <div className="text-right">
                        <div className="capitalize">{call.direction}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {appointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
                <CardDescription>{appointments.length} appointments in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <div>
                        <div className="font-medium">{format(new Date(appointment.date_of_appointment), 'MMM dd, yyyy')}</div>
                      </div>
                      <div className="text-right">
                        <div className={`capitalize ${
                          appointment.showed === true ? 'text-green-600' : 
                          appointment.showed === false ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {appointment.showed === true ? 'Showed' : 
                           appointment.showed === false ? 'No Show' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentStatsPage;
