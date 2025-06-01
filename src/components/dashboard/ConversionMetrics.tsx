
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConversionMetricsProps {
  totalDials: number;
  connectRate: number;
  appointmentsSet: number;
  leadContactRatio: number;
}

const ConversionMetrics = ({ totalDials, connectRate, appointmentsSet, leadContactRatio }: ConversionMetricsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call-to-Appointment Conversion</CardTitle>
          <CardDescription>Efficiency of converting calls to bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Connected Calls</span>
              <span className="text-2xl font-bold text-blue-600">
                {Math.round(totalDials * (connectRate / 100))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Appointments Booked</span>
              <span className="text-2xl font-bold text-green-600">{appointmentsSet}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Conversion Rate</span>
              <span className="text-xl font-bold text-purple-600">
                {connectRate > 0 && appointmentsSet > 0 
                  ? ((appointmentsSet / (totalDials * (connectRate / 100))) * 100).toFixed(1) 
                  : '0.0'}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Efficiency Metrics</CardTitle>
          <CardDescription>Lead contact and follow-up performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Calls Per Appointment</span>
              <span className="text-2xl font-bold text-orange-600">
                {appointmentsSet > 0 
                  ? (totalDials / appointmentsSet).toFixed(1) 
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Lead Contact Ratio</span>
              <span className="text-2xl font-bold text-red-600">
                {leadContactRatio ? leadContactRatio.toFixed(1) : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Efficiency Score</span>
                <Badge variant="default">
                  {leadContactRatio < 3 && connectRate > 65 ? 'Excellent' : 'Good'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversionMetrics;
