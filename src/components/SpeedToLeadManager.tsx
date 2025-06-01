
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import SpeedToLeadTracker from './SpeedToLeadTracker';

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
    try {
      return format(new Date(dateTimeString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateTimeString;
    }
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

  return (
    <div className="space-y-6">
      {!viewOnly && <SpeedToLeadTracker onCalculationComplete={fetchStats} />}
      
      <Card>
        <CardHeader>
          <CardTitle>Speed to Lead Statistics</CardTitle>
          <CardDescription>
            Time between when leads enter the system and when they receive their first call
            {viewOnly && " (View Only - Records created via API)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading statistics...</div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No speed to lead data available with valid call records</p>
              <p className="text-sm text-gray-400">
                Use the tracker above to calculate speed to lead times from your data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Lead Name</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Phone Number</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Project</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Lead Received</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">First Call</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Speed to Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
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
              
              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">≤ 5 minutes</div>
                  <div className="text-2xl font-bold text-green-700">
                    {stats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min <= 5).length}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">5-15 minutes</div>
                  <div className="text-2xl font-bold text-yellow-700">
                    {stats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 5 && s.speed_to_lead_time_min <= 15).length}
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">15-60 minutes</div>
                  <div className="text-2xl font-bold text-orange-700">
                    {stats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 15 && s.speed_to_lead_time_min <= 60).length}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">&gt; 1 hour</div>
                  <div className="text-2xl font-bold text-red-700">
                    {stats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 60).length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpeedToLeadManager;
