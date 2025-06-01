import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneCall, Clock, UserCheck, TrendingUp } from 'lucide-react';

interface CallCenterDashboardProps {
  projectId: string;
}

const CallCenterDashboard = ({ projectId }: CallCenterDashboardProps) => {
  // Mock call center data
  const callData = {
    'project-1': {
      totalDials: 542,
      connectRate: 68.2,
      appointmentsSet: 89,
      avgCallDuration: 4.3,
      leadContactRatio: 2.9,
      agents: [
        { name: 'Rachel M.', appointments: 52, connectRate: 72.1 },
        { name: 'Marcus T.', appointments: 37, connectRate: 64.8 }
      ]
    },
    'project-2': {
      totalDials: 698,
      connectRate: 61.4,
      appointmentsSet: 112,
      avgCallDuration: 5.1,
      leadContactRatio: 2.8,
      agents: [
        { name: 'Sarah K.', appointments: 67, connectRate: 69.3 },
        { name: 'David L.', appointments: 45, connectRate: 58.2 }
      ]
    },
    'project-3': {
      totalDials: 445,
      connectRate: 74.6,
      appointmentsSet: 74,
      avgCallDuration: 3.8,
      leadContactRatio: 2.1,
      agents: [
        { name: 'Jennifer R.', appointments: 48, connectRate: 78.9 },
        { name: 'Alex P.', appointments: 26, connectRate: 69.1 }
      ]
    },
    'project-4': {
      totalDials: 289,
      connectRate: 59.2,
      appointmentsSet: 42,
      avgCallDuration: 4.7,
      leadContactRatio: 3.4,
      agents: [
        { name: 'Michelle C.', appointments: 28, connectRate: 62.3 },
        { name: 'Ryan B.', appointments: 14, connectRate: 54.8 }
      ]
    }
  };

  const data = callData[projectId as keyof typeof callData] || callData['project-1'];

  return (
    <div className="space-y-6">
      {/* Call Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Dials</CardTitle>
            <Phone className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDials.toLocaleString()}</div>
            <p className="text-xs opacity-90 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Connect Rate</CardTitle>
            <PhoneCall className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.connectRate.toFixed(1)}%</div>
            <Progress value={data.connectRate} className="mt-2 bg-cyan-400" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Appointments Set</CardTitle>
            <UserCheck className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.appointmentsSet}</div>
            <p className="text-xs opacity-90 mt-1">From calls</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Avg Call Time</CardTitle>
            <Clock className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgCallDuration} min</div>
            <p className="text-xs opacity-90 mt-1">Per connected call</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics */}
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
                  {Math.round(data.totalDials * (data.connectRate / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Appointments Booked</span>
                <span className="text-2xl font-bold text-green-600">{data.appointmentsSet}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Conversion Rate</span>
                <span className="text-xl font-bold text-purple-600">
                  {((data.appointmentsSet / (data.totalDials * (data.connectRate / 100))) * 100).toFixed(1)}%
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
                  {(data.totalDials / data.appointmentsSet).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Lead Contact Ratio</span>
                <span className="text-2xl font-bold text-red-600">{data.leadContactRatio}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Efficiency Score</span>
                  <Badge variant="default">
                    {data.leadContactRatio < 3 && data.connectRate > 65 ? 'Excellent' : 'Good'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Agent Performance</span>
          </CardTitle>
          <CardDescription>Individual agent metrics and contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.agents.map((agent, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{agent.name}</h4>
                    <p className="text-sm text-gray-600">Call Center Agent</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {agent.appointments} appointments
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Connect Rate</label>
                    <div className="mt-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-lg font-bold">{agent.connectRate.toFixed(1)}%</span>
                        <span className="text-sm text-gray-500">Target: 65%</span>
                      </div>
                      <Progress value={agent.connectRate} className="h-2" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Appointment Contribution</label>
                    <div className="mt-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-lg font-bold">
                          {((agent.appointments / data.appointmentsSet) * 100).toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-500">of total</span>
                      </div>
                      <Progress value={(agent.appointments / data.appointmentsSet) * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCenterDashboard;
