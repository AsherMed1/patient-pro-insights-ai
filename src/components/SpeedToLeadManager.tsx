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
    if (minutes === null) return 'N/A';
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Add the tracker component */}
      {!viewOnly && <SpeedToLeadTracker />}
      
      <Card>
        <CardHeader>
          <CardTitle>Speed to Lead Statistics</CardTitle>
          <CardDescription>
            View all recorded speed to lead data
            {viewOnly && " (View Only - Records created via API)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading statistics...</div>
          ) : stats.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No statistics recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Project</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Lead Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Time In</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">First Call</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Speed to Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={stat.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{stat.date}</td>
                      <td className="border border-gray-300 px-4 py-2">{stat.project_name}</td>
                      <td className="border border-gray-300 px-4 py-2">{stat.lead_name}</td>
                      <td className="border border-gray-300 px-4 py-2">{stat.lead_phone_number}</td>
                      <td className="border border-gray-300 px-4 py-2">{formatDateTime(stat.date_time_in)}</td>
                      <td className="border border-gray-300 px-4 py-2">{formatDateTime(stat.date_time_of_first_call)}</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold">
                        {formatSpeedToLead(stat.speed_to_lead_time_min)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpeedToLeadManager;
