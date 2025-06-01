
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock, Phone, Calendar, TrendingUp } from 'lucide-react';

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

interface AgentPerformanceTableProps {
  data: AgentPerformanceData[];
  loading: boolean;
}

const AgentPerformanceTable = ({ data, loading }: AgentPerformanceTableProps) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading agent performance data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No performance data available for this date</div>
      </div>
    );
  }

  const formatShowRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const getShowRateBadgeVariant = (rate: number) => {
    if (rate >= 80) return "default";
    if (rate >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-3 font-medium">Date</th>
            <th className="text-left p-3 font-medium">Agent Name</th>
            <th className="text-center p-3 font-medium">Total Dials</th>
            <th className="text-center p-3 font-medium">Answered + VM</th>
            <th className="text-center p-3 font-medium">Pickups 40s+</th>
            <th className="text-center p-3 font-medium">Conversations 2m+</th>
            <th className="text-center p-3 font-medium">Booked</th>
            <th className="text-center p-3 font-medium">Time on Phone</th>
            <th className="text-center p-3 font-medium">Avg Duration (S)</th>
            <th className="text-center p-3 font-medium">Avg Duration (M)</th>
            <th className="text-center p-3 font-medium">Appts Scheduled</th>
            <th className="text-center p-3 font-medium">Shows</th>
            <th className="text-center p-3 font-medium">No Shows</th>
            <th className="text-center p-3 font-medium">Show Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((agent) => (
            <tr key={agent.id} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{agent.date}</span>
                </div>
              </td>
              <td className="p-3">
                <div className="font-medium">{agent.agent_name}</div>
              </td>
              <td className="text-center p-3">
                <div className="flex items-center justify-center space-x-1">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{agent.total_dials_made}</span>
                </div>
              </td>
              <td className="text-center p-3">{agent.answered_calls_vm}</td>
              <td className="text-center p-3">{agent.pickups_40_seconds_plus}</td>
              <td className="text-center p-3">{agent.conversations_2_minutes_plus}</td>
              <td className="text-center p-3">
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {agent.booked_appointments}
                </Badge>
              </td>
              <td className="text-center p-3">
                <div className="flex items-center justify-center space-x-1">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span>{agent.time_on_phone_minutes}m</span>
                </div>
              </td>
              <td className="text-center p-3">{agent.average_duration_per_call_seconds}s</td>
              <td className="text-center p-3">{agent.average_duration_per_call_minutes.toFixed(1)}m</td>
              <td className="text-center p-3">{agent.appts_to_take_place}</td>
              <td className="text-center p-3">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {agent.shows}
                </Badge>
              </td>
              <td className="text-center p-3">
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  {agent.no_shows}
                </Badge>
              </td>
              <td className="text-center p-3">
                <Badge variant={getShowRateBadgeVariant(agent.show_rate)}>
                  {formatShowRate(agent.show_rate)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AgentPerformanceTable;
