
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Target, TrendingUp, Users, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SpeedToLeadStat {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  lead_phone_number: string;
  date_time_in: string;
  date_time_of_first_call: string | null;
  speed_to_lead_time_min: number | null;
  created_at: string;
  updated_at: string;
}

interface SpeedToLeadManagerProps {
  viewOnly?: boolean;
}

const SpeedToLeadManager = ({ viewOnly = false }: SpeedToLeadManagerProps) => {
  const [stats, setStats] = useState<SpeedToLeadStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    setupRealtimeSubscription();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('speed_to_lead_stats')
        .select('*')
        .not('date_time_of_first_call', 'is', null)
        .not('speed_to_lead_time_min', 'is', null)
        .gte('speed_to_lead_time_min', 0);

      // Apply date filters if set
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        query = query.gte('date', fromDate);
      }

      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        query = query.lte('date', toDate);
      }

      const { data, error } = await query.order('date_time_in', { ascending: false });

      if (error) {
        console.error('Error fetching speed to lead stats:', error);
        toast({
          title: "Error",
          description: "Failed to fetch speed to lead statistics",
          variant: "destructive",
        });
      } else {
        setStats(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('speed-to-lead-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'speed_to_lead_stats'
        },
        (payload) => {
          console.log('Real-time speed-to-lead update:', payload);
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return 'N/A';
    return formatDateTimeForTable(dateTimeString);
  };

  const formatSpeedToLead = (minutes: number | null) => {
    if (minutes === null || minutes < 0) return 'N/A';
    
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getSpeedToLeadColor = (minutes: number | null) => {
    if (minutes === null || minutes < 0) return 'text-gray-500';
    if (minutes <= 5) return 'text-green-600 font-semibold';
    if (minutes <= 15) return 'text-yellow-600 font-semibold';
    if (minutes <= 60) return 'text-orange-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };

  const getDateRangeText = () => {
    if (!dateRange.from && !dateRange.to) return 'All dates';
    if (dateRange.from && !dateRange.to) {
      return `From ${format(dateRange.from, "MMM dd, yyyy")}`;
    }
    if (!dateRange.from && dateRange.to) {
      return `Until ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "MMM dd, yyyy");
      }
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
    }
    return 'Select date range';
  };

  // Calculate statistics
  const validStats = stats.filter(s => 
    s.date_time_of_first_call && 
    s.speed_to_lead_time_min !== null && 
    s.speed_to_lead_time_min >= 0
  );

  const averageSpeedToLead = validStats.length > 0 
    ? validStats.reduce((sum, stat) => sum + (stat.speed_to_lead_time_min || 0), 0) / validStats.length 
    : 0;

  const medianSpeedToLead = validStats.length > 0 
    ? (() => {
        const sorted = [...validStats].sort((a, b) => (a.speed_to_lead_time_min || 0) - (b.speed_to_lead_time_min || 0));
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 
          ? sorted[mid].speed_to_lead_time_min || 0
          : ((sorted[mid - 1].speed_to_lead_time_min || 0) + (sorted[mid].speed_to_lead_time_min || 0)) / 2;
      })()
    : 0;

  // Data for charts
  const speedRangeData = [
    {
      range: '≤ 5 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min <= 5).length,
      color: '#22c55e'
    },
    {
      range: '5-15 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 5 && s.speed_to_lead_time_min <= 15).length,
      color: '#eab308'
    },
    {
      range: '15-60 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 15 && s.speed_to_lead_time_min <= 60).length,
      color: '#f97316'
    },
    {
      range: '> 1 hour',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 60).length,
      color: '#ef4444'
    }
  ];

  const chartConfig = {
    range: { label: "Range" },
    count: { label: "Count" }
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Data Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Speed to Lead Analytics</h2>
          <p className="text-gray-600">Live speed-to-lead data with real-time updates (Central Time Zone)</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Data</span>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filter by Date Range:</span>
            </div>
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM dd") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => handleDateRangeChange({ ...dateRange, from: date })}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM dd") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => handleDateRangeChange({ ...dateRange, to: date })}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              variant="outline" 
              onClick={() => handleDateRangeChange({ from: undefined, to: undefined })}
              className="w-fit"
            >
              Clear Filters
            </Button>

            <div className="text-sm text-gray-600">
              Showing: {getDateRangeText()}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="text-center py-8">Loading live data...</div>
      ) : validStats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No speed to lead data available for the selected date range</p>
          <p className="text-sm text-gray-400">
            Data will appear here automatically as new leads are processed
          </p>
        </div>
      ) : (
        <>
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{validStats.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Speed</p>
                    <p className="text-2xl font-bold">{formatSpeedToLead(averageSpeedToLead)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Median Speed</p>
                    <p className="text-2xl font-bold">{formatSpeedToLead(medianSpeedToLead)}</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">≤ 5 Min Rate</p>
                    <p className="text-2xl font-bold">
                      {validStats.length > 0 
                        ? `${Math.round((speedRangeData[0].count / validStats.length) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Speed to Lead Distribution</CardTitle>
                <CardDescription>Number of leads by response time ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={speedRangeData}>
                      <XAxis dataKey="range" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Breakdown</CardTitle>
                <CardDescription>Percentage distribution of response times</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={speedRangeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="count"
                        label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {speedRangeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Speed to Lead Records</CardTitle>
              <CardDescription>
                Live data showing all speed to lead calculations (Times in Central Time Zone)
                {dateRange.from || dateRange.to ? ` - Filtered: ${getDateRangeText()}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Lead Name</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Phone Number</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Project</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Lead Created (CT)</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">First Call (CT)</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Speed to Lead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validStats.map((stat) => (
                      <tr key={stat.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 font-medium">{stat.lead_name}</td>
                        <td className="border border-gray-300 px-4 py-3">{stat.lead_phone_number || 'N/A'}</td>
                        <td className="border border-gray-300 px-4 py-3">{stat.project_name}</td>
                        <td className="border border-gray-300 px-4 py-3 text-sm">{formatDateTime(stat.date_time_in)}</td>
                        <td className="border border-gray-300 px-4 py-3 text-sm">{formatDateTime(stat.date_time_of_first_call)}</td>
                        <td className={`border border-gray-300 px-4 py-3 ${getSpeedToLeadColor(stat.speed_to_lead_time_min)}`}>
                          {formatSpeedToLead(stat.speed_to_lead_time_min)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SpeedToLeadManager;
