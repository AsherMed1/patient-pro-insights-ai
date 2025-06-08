import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeForTable } from '@/utils/dateTimeUtils';
import { AlertTriangle } from 'lucide-react';
import type { SpeedToLeadStat } from './types';

interface SpeedToLeadOutliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlierStats: SpeedToLeadStat[];
}

const SpeedToLeadOutliersModal = ({ isOpen, onClose, outlierStats }: SpeedToLeadOutliersModalProps) => {
  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return 'N/A';
    return formatDateTimeForTable(dateTimeString);
  };

  const formatSpeedToLead = (minutes: number | null) => {
    if (minutes === null || minutes < 0) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${remainingMinutes}m`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Outlier Records ({'>'}5 Hours)
          </DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardHeader>
            <CardTitle>Speed to Lead Outliers</CardTitle>
            <CardDescription>
              Records with speed to lead time greater than 5 hours (excluded from statistics)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {outlierStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No outlier records found</p>
              </div>
            ) : (
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
                    {outlierStats.map((stat) => (
                      <tr key={stat.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 font-medium">{stat.lead_name}</td>
                        <td className="border border-gray-300 px-4 py-3">{stat.lead_phone_number || 'N/A'}</td>
                        <td className="border border-gray-300 px-4 py-3">{stat.project_name}</td>
                        <td className="border border-gray-300 px-4 py-3 text-sm">{formatDateTime(stat.date_time_in)}</td>
                        <td className="border border-gray-300 px-4 py-3 text-sm">{formatDateTime(stat.date_time_of_first_call)}</td>
                        <td className="border border-gray-300 px-4 py-3 text-orange-600 font-semibold">
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
      </DialogContent>
    </Dialog>
  );
};

export default SpeedToLeadOutliersModal;
