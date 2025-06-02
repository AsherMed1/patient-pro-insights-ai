import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import SpeedToLeadTracker from './SpeedToLeadTracker';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Target, TrendingUp, Users } from 'lucide-react';
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('speed_to_lead_stats')
        .select('*')
        .not('date_time_of_first_call', 'is', null)
        .not('speed_to_lead_time_min', 'is', null)
        .gte('speed_to_lead_time_min', 0)
        .order('date_time_in', { ascending: false });

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
      {!viewOnly && <SpeedToLeadTracker onCalculationComplete={fetchStats} />}
      
      {loading ? (
        <div className="text-center py-8">Loading statistics...</div>
      ) : validStats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No valid speed to lead data available</p>
          <p className="text-sm text-gray-400">
            Use the tracker above to calculate speed to lead times from your data
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
              <CardTitle>Valid Speed to Lead Records</CardTitle>
              <CardDescription>
                Only showing records with valid first call times and positive speed calculations (Times in Central Time Zone)
                {viewOnly && " (View Only - Records created via API)"}
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
