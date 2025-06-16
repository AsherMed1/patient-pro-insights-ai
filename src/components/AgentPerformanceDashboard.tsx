import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Phone, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AgentPerformanceStats from './AgentPerformanceStats';
import { formatDateInCentralTime } from '@/utils/dateTimeUtils';

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

interface CollectiveAgentStats {
  agent_name: string;
  total_dials_made: number;
  answered_calls_vm: number;
  pickups_40_seconds_plus: number;
  conversations_2_minutes_plus: number;
  booked_appointments: number;
  time_on_phone_minutes: number;
  average_duration_per_call_seconds: number;
  shows: number;
  no_shows: number;
  show_rate: number;
  days_active: number;
}

const AgentPerformanceDashboard = () => {
  const [performanceData, setPerformanceData] = useState<AgentPerformanceData[]>([]);
  const [collectiveStats, setCollectiveStats] = useState<CollectiveAgentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date()
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPerformanceData();
    setupRealtimeSubscription();
  }, [dateRange, selectedAgent]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      const fromDate = dateRange.from?.toISOString().split('T')[0];
      const toDate = dateRange.to?.toISOString().split('T')[0];
      
      if (!fromDate || !toDate) {
        setPerformanceData([]);
        setCollectiveStats([]);
        return;
      }

      // Try to get data from agent_performance_stats first
      let query = supabase
        .from('agent_performance_stats')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate);

      if (selectedAgent !== 'all') {
        query = query.eq('agent_name', selectedAgent);
      }

      const { data: existingData, error: existingError } = await query.order('date', { ascending: false }).order('agent_name');

      if (existingError) {
        console.error('Error fetching existing performance data:', existingError);
      }

      // If we have existing data, use it
      if (existingData && existingData.length > 0) {
        setPerformanceData(existingData);
        updateAvailableAgents(existingData);
        calculateCollectiveStats(existingData);
      } else {
        // Otherwise, calculate from call center stats tables
        await calculatePerformanceFromCallData(fromDate, toDate);
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

  const calculateCollectiveStats = (data: AgentPerformanceData[]) => {
    const agentGroups = data.reduce((acc, record) => {
      if (!acc[record.agent_name]) {
        acc[record.agent_name] = [];
      }
      acc[record.agent_name].push(record);
      return acc;
    }, {} as Record<string, AgentPerformanceData[]>);

    const collective = Object.entries(agentGroups).map(([agentName, records]) => {
      const totalDials = records.reduce((sum, r) => sum + r.total_dials_made, 0);
      const totalAnswered = records.reduce((sum, r) => sum + r.answered_calls_vm, 0);
      const totalPickups = records.reduce((sum, r) => sum + r.pickups_40_seconds_plus, 0);
      const totalConversations = records.reduce((sum, r) => sum + r.conversations_2_minutes_plus, 0);
      const totalBooked = records.reduce((sum, r) => sum + r.booked_appointments, 0);
      const totalTimeOnPhone = records.reduce((sum, r) => sum + r.time_on_phone_minutes, 0);
      const totalShows = records.reduce((sum, r) => sum + r.shows, 0);
      const totalNoShows = records.reduce((sum, r) => sum + r.no_shows, 0);
      
      // Calculate weighted average duration
      const totalCallSeconds = records.reduce((sum, r) => sum + (r.total_dials_made * r.average_duration_per_call_seconds), 0);
      const avgDurationSeconds = totalDials > 0 ? Math.round(totalCallSeconds / totalDials) : 0;
      
      // Calculate show rate
      const totalAppointments = totalShows + totalNoShows;
      const showRate = totalAppointments > 0 ? (totalShows / totalAppointments) * 100 : 0;

      return {
        agent_name: agentName,
        total_dials_made: totalDials,
        answered_calls_vm: totalAnswered,
        pickups_40_seconds_plus: totalPickups,
        conversations_2_minutes_plus: totalConversations,
        booked_appointments: totalBooked,
        time_on_phone_minutes: totalTimeOnPhone,
        average_duration_per_call_seconds: avgDurationSeconds,
        shows: totalShows,
        no_shows: totalNoShows,
        show_rate: showRate,
        days_active: records.length
      };
    });

    setCollectiveStats(collective.sort((a, b) => a.agent_name.localeCompare(b.agent_name)));
  };

  const calculatePerformanceFromCallData = async (fromDate: string, toDate: string) => {
    try {
      // Get all agents
      let agentsQuery = supabase
        .from('agents')
        .select('*')
        .eq('active', true);

      if (selectedAgent !== 'all') {
        agentsQuery = agentsQuery.eq('agent_name', selectedAgent);
      }

      const { data: agents, error: agentsError } = await agentsQuery;

      if (agentsError) throw agentsError;

      // Get call data for the date range
      const { data: calls, error: callsError } = await supabase
        .from('all_calls')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate);

      if (callsError) throw callsError;

      // Get appointment data for the date range
      const { data: appointments, error: appointmentsError } = await supabase
        .from('all_appointments')
        .select('*')
        .gte('date_appointment_created', fromDate)
        .lte('date_appointment_created', toDate);

      if (appointmentsError) throw appointmentsError;

      // Calculate performance for each agent and date combination
      const calculatedPerformance: AgentPerformanceData[] = [];
      const dateRange = getDateRange(new Date(fromDate), new Date(toDate));

      dateRange.forEach(date => {
        (agents || []).forEach(agent => {
          const dateString = date.toISOString().split('T')[0];
          const agentCalls = calls?.filter(call => call.agent === agent.agent_name && call.date === dateString) || [];
          const agentAppointments = appointments?.filter(apt => apt.agent === agent.agent_name && apt.date_appointment_created === dateString) || [];

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

          calculatedPerformance.push({
            id: `calculated-${agent.id}-${dateString}`,
            date: dateString,
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
          });
        });
      });

      setPerformanceData(calculatedPerformance);
      updateAvailableAgents(calculatedPerformance);
      calculateCollectiveStats(calculatedPerformance);
    } catch (error) {
      console.error('Error calculating performance from call data:', error);
      setPerformanceData([]);
      setCollectiveStats([]);
    }
  };

  const getDateRange = (start: Date, end: Date): Date[] => {
    const dates = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const updateAvailableAgents = (data: AgentPerformanceData[]) => {
    const agents = [...new Set(data.map(item => item.agent_name))].sort();
    setAvailableAgents(agents);
  };

  const setupRealtimeSubscription = () => {
    const fromDate = dateRange.from?.toISOString().split('T')[0];
    const toDate = dateRange.to?.toISOString().split('T')[0];
    
    if (!fromDate || !toDate) return;

    const channel = supabase
      .channel('agent-performance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_performance_stats'
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
          table: 'all_calls'
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
          table: 'all_appointments'
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
    return collectiveStats.reduce((totals, agent) => ({
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
  const averageShowRate = collectiveStats.length > 0 
    ? collectiveStats.reduce((sum, agent) => sum + agent.show_rate, 0) / collectiveStats.length 
    : 0;

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };

  const getDateRangeText = () => {
    if (!dateRange.from || !dateRange.to) return 'Select date range';
    if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
      return formatDateInCentralTime(dateRange.from);
    }
    return `${formatDateInCentralTime(dateRange.from)} - ${formatDateInCentralTime(dateRange.to)}`;
  };

  const formatShowRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const getShowRateBadgeVariant = (rate: number) => {
    if (rate >= 80) return "default";
    if (rate >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Agent Performance Dashboard</h2>
          <p className="text-gray-600">Collective agent statistics calculated from call center data (Central Time Zone)</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="ml-2">
            Live Updates
          </Badge>
        </div>
      </div>

      {/* Compact Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            {/* Date Range Picker */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Date Range (CT)</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[120px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "MMM dd") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => handleDateRangeChange({ ...dateRange, from: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[120px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "MMM dd") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => handleDateRangeChange({ ...dateRange, to: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Agent Filter */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Agent</label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                  <SelectItem value="all">All Agents</SelectItem>
                  {availableAgents.map(agent => (
                    <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            <Button 
              variant="outline" 
              onClick={() => {
                handleDateRangeChange({ from: new Date(), to: new Date() });
                setSelectedAgent('all');
              }}
              className="w-fit"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <AgentPerformanceStats 
        totalStats={totalStats}
        averageShowRate={averageShowRate}
        agentCount={selectedAgent === 'all' ? availableAgents.length : 1}
      />

      <Card>
        <CardHeader>
          <CardTitle>Collective Agent Performance</CardTitle>
          <CardDescription>
            Aggregated performance metrics by agent - {getDateRangeText()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading agent performance data...</div>
            </div>
          ) : collectiveStats.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No performance data available for this date range</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead className="text-center">Days Active</TableHead>
                    <TableHead className="text-center">Total Dials</TableHead>
                    <TableHead className="text-center">Answered + VM</TableHead>
                    <TableHead className="text-center">Pickups 40s+</TableHead>
                    <TableHead className="text-center">Conversations 2m+</TableHead>
                    <TableHead className="text-center">Booked</TableHead>
                    <TableHead className="text-center">Time on Phone</TableHead>
                    <TableHead className="text-center">Avg Duration (S)</TableHead>
                    <TableHead className="text-center">Shows</TableHead>
                    <TableHead className="text-center">No Shows</TableHead>
                    <TableHead className="text-center">Show Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectiveStats.map((agent) => (
                    <TableRow key={agent.agent_name} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">{agent.agent_name}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{agent.days_active}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Phone className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{agent.total_dials_made}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{agent.answered_calls_vm}</TableCell>
                      <TableCell className="text-center">{agent.pickups_40_seconds_plus}</TableCell>
                      <TableCell className="text-center">{agent.conversations_2_minutes_plus}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {agent.booked_appointments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span>{agent.time_on_phone_minutes}m</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{agent.average_duration_per_call_seconds}s</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {agent.shows}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          {agent.no_shows}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getShowRateBadgeVariant(agent.show_rate)}>
                          {formatShowRate(agent.show_rate)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPerformanceDashboard;
