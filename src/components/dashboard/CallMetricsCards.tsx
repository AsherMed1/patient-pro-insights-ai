
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Phone, PhoneCall, Clock, UserCheck } from 'lucide-react';

interface CallMetricsCardsProps {
  totalDials: number;
  connectRate: number;
  appointmentsSet: number;
  avgCallDuration: number;
}

const CallMetricsCards = ({ totalDials, connectRate, appointmentsSet, avgCallDuration }: CallMetricsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Total Dials</CardTitle>
          <Phone className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDials.toLocaleString()}</div>
          <p className="text-xs opacity-90 mt-1">Call records in database</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Connect Rate</CardTitle>
          <PhoneCall className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{connectRate.toFixed(1)}%</div>
          <Progress value={connectRate} className="mt-2 bg-cyan-400" />
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Appointments Set</CardTitle>
          <UserCheck className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{appointmentsSet}</div>
          <p className="text-xs opacity-90 mt-1">From database</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Avg Call Time</CardTitle>
          <Clock className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgCallDuration.toFixed(1)} min</div>
          <p className="text-xs opacity-90 mt-1">Per connected call</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallMetricsCards;
