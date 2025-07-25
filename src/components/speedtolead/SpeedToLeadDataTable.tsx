
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface SpeedToLeadDataTableProps {
  validStats: SpeedToLeadStat[];
  dateRange: DateRange;
}

const SpeedToLeadDataTable = ({ validStats, dateRange }: SpeedToLeadDataTableProps) => {
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

  const getDateRangeText = () => {
    if (!dateRange.from && !dateRange.to) return '';
    if (dateRange.from && !dateRange.to) {
      return ` - From ${dateRange.from.toLocaleDateString()}`;
    }
    if (!dateRange.from && dateRange.to) {
      return ` - Until ${dateRange.to.toLocaleDateString()}`;
    }
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return ` - ${dateRange.from.toLocaleDateString()}`;
      }
      return ` - ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`;
    }
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speed to Lead Records</CardTitle>
        <CardDescription>
          Live data showing all speed to lead calculations (Times in Central Time Zone)
          {getDateRangeText()}
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
  );
};

export default SpeedToLeadDataTable;
