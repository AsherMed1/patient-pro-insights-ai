
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, DollarSign, Users, Target, Calendar as CalendarEventIcon, CheckCircle, XCircle, Clock, Phone, TrendingUp } from 'lucide-react';

interface ProjectStats {
  adSpend: number;
  newLeads: number;
  costPerLead: number;
  bookedAppointments: number;
  confirmedAppointments: number;
  unconfirmedAppointments: number;
  appointmentsToTakePlace: number;
  shows: number;
  noShows: number;
  confirmedPercentage: number;
  outboundDials: number;
  pickups40Plus: number;
  conversations2Plus: number;
  bookingPercentage: number;
}

const ProjectsDashboard = () => {
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string }>>([]);
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedProject, dateRange]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Build base queries
      let leadsQuery = supabase.from('new_leads').select('*');
      let appointmentsQuery = supabase.from('all_appointments').select('*');
      let callsQuery = supabase.from('all_calls').select('*');
      let adSpendQuery = supabase.from('facebook_ad_spend').select('spend');

      // Apply project filter if not ALL
      if (selectedProject !== 'ALL') {
        leadsQuery = leadsQuery.eq('project_name', selectedProject);
        appointmentsQuery = appointmentsQuery.eq('project_name', selectedProject);
        callsQuery = callsQuery.eq('project_name', selectedProject);
        adSpendQuery = adSpendQuery.eq('project_name', selectedProject);
      }

      // Apply date filters
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        leadsQuery = leadsQuery.gte('date', fromDate);
        appointmentsQuery = appointmentsQuery.gte('date_of_appointment', fromDate);
        callsQuery = callsQuery.gte('date', fromDate);
        adSpendQuery = adSpendQuery.gte('date', fromDate);
      }

      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        leadsQuery = leadsQuery.lte('date', toDate);
        appointmentsQuery = appointmentsQuery.lte('date_of_appointment', toDate);
        callsQuery = callsQuery.lte('date', toDate);
        adSpendQuery = adSpendQuery.lte('date', toDate);
      }

      // Execute queries
      const [leadsResult, appointmentsResult, callsResult, adSpendResult] = await Promise.all([
        leadsQuery,
        appointmentsQuery,
        callsQuery,
        adSpendQuery
      ]);

      if (leadsResult.error) throw leadsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (callsResult.error) throw callsResult.error;
      if (adSpendResult.error) throw adSpendResult.error;

      const leads = leadsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const calls = callsResult.data || [];
      const adSpendData = adSpendResult.data || [];

      // Calculate metrics
      const newLeads = leads.length;
      const bookedAppointments = appointments.length;
      const confirmedAppointments = appointments.filter(apt => apt.confirmed).length;
      const unconfirmedAppointments = bookedAppointments - confirmedAppointments;
      const appointmentsToTakePlace = appointments.filter(apt => 
        new Date(apt.date_of_appointment) >= new Date()
      ).length;
      const shows = appointments.filter(apt => apt.showed).length;
      const noShows = appointments.filter(apt => apt.showed === false).length;
      
      const outboundDials = calls.filter(call => call.direction === 'outbound').length;
      const pickups40Plus = calls.filter(call => 
        (call.status === 'answered' || call.status === 'connected' || call.status === 'pickup') && 
        call.duration_seconds >= 40
      ).length;
      const conversations2Plus = calls.filter(call => call.duration_seconds >= 120).length;

      const adSpend = adSpendData.reduce((sum, record) => {
        const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
        return sum + (isNaN(spendValue) ? 0 : spendValue);
      }, 0);

      const costPerLead = newLeads > 0 && adSpend > 0 ? adSpend / newLeads : 0;
      const bookingPercentage = newLeads > 0 ? (bookedAppointments / newLeads) * 100 : 0;
      const confirmedPercentage = bookedAppointments > 0 ? (confirmedAppointments / bookedAppointments) * 100 : 0;

      setStats({
        adSpend,
        newLeads,
        costPerLead,
        bookedAppointments,
        confirmedAppointments,
        unconfirmedAppointments,
        appointmentsToTakePlace,
        shows,
        noShows,
        confirmedPercentage,
        outboundDials,
        pickups40Plus,
        conversations2Plus,
        bookingPercentage
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch project statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setQuickDateRange = (type: string) => {
    const now = new Date();
    switch (type) {
      case 'wtd':
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: now });
        break;
      case 'mtd':
        setDateRange({ from: startOfMonth(now), to: now });
        break;
      case 'ytd':
        setDateRange({ from: startOfYear(now), to: now });
        break;
      case 'last7':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      default:
        setDateRange({ from: undefined, to: undefined });
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "blue",
    isPercentage = false,
    isCurrency = false 
  }: {
    title: string;
    value: number;
    icon: any;
    color?: string;
    isPercentage?: boolean;
    isCurrency?: boolean;
  }) => {
    const formatValue = () => {
      if (isCurrency) return `$${value.toFixed(2)}`;
      if (isPercentage) return `${value.toFixed(1)}%`;
      return value.toString();
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
          <CardTitle>Project Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Project:</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.project_name}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Date Range:</label>
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
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                      initialFocus
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
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('wtd')}>
                WTD
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('mtd')}>
                MTD
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('ytd')}>
                YTD
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('last7')}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('')}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p>Loading statistics...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Marketing Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Marketing Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Ad Spend" value={stats.adSpend} icon={DollarSign} color="green" isCurrency />
              <StatCard title="New Leads" value={stats.newLeads} icon={Users} color="blue" />
              <StatCard title="Cost Per Lead" value={stats.costPerLead} icon={Target} color="purple" isCurrency />
            </div>
          </div>

          {/* Appointment Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <CalendarEventIcon className="h-5 w-5" />
              <span>Appointment Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Booked Appointments" value={stats.bookedAppointments} icon={CalendarEventIcon} color="blue" />
              <StatCard title="Confirmed Appointments" value={stats.confirmedAppointments} icon={CheckCircle} color="green" />
              <StatCard title="Unconfirmed Appointments" value={stats.unconfirmedAppointments} icon={Clock} color="yellow" />
              <StatCard title="Appointments To Take Place" value={stats.appointmentsToTakePlace} icon={CalendarEventIcon} color="purple" />
            </div>
          </div>

          {/* Show Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Show Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Shows" value={stats.shows} icon={CheckCircle} color="green" />
              <StatCard title="No Shows" value={stats.noShows} icon={XCircle} color="red" />
              <StatCard title="Confirmed Percentage" value={stats.confirmedPercentage} icon={Target} color="blue" isPercentage />
            </div>
          </div>

          {/* Call Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>Call Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Outbound Dials" value={stats.outboundDials} icon={Phone} color="blue" />
              <StatCard title="Pickups (40+ Seconds)" value={stats.pickups40Plus} icon={CheckCircle} color="green" />
              <StatCard title="Conversations (2+ Minutes)" value={stats.conversations2Plus} icon={Clock} color="purple" />
              <StatCard title="Booking Percentage" value={stats.bookingPercentage} icon={Target} color="orange" isPercentage />
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

export default ProjectsDashboard;
