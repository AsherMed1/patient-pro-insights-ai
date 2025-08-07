
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from 'lucide-react';

interface Agent {
  name: string;
  callsMade: number;
  timeOnCalls: number; // in minutes
  appointmentsBooked: number;
}

interface AgentPerformanceSectionProps {
  agents: Agent[];
  totalAppointments: number;
}

const AgentPerformanceSection = ({ agents, totalAppointments }: AgentPerformanceSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Agent Performance</span>
        </CardTitle>
        <CardDescription>Individual agent metrics and contributions</CardDescription>
      </CardHeader>
      <CardContent>
        {agents.length > 0 ? (
          <div className="space-y-4">
            {agents.map((agent, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{agent.name}</h4>
                    <p className="text-sm text-gray-600">Call Center Agent</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {agent.appointmentsBooked} appointments booked
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Calls Made</label>
                    <div className="mt-1">
                      <span className="text-lg font-bold">{agent.callsMade}</span>
                      <p className="text-sm text-gray-500">Total calls</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Time on Calls</label>
                    <div className="mt-1">
                      <span className="text-lg font-bold">{Math.round(agent.timeOnCalls)} min</span>
                      <p className="text-sm text-gray-500">Talk time</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Appointments Booked</label>
                    <div className="mt-1">
                      <span className="text-lg font-bold">{agent.appointmentsBooked}</span>
                      <p className="text-sm text-gray-500">Scheduled</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No agent data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentPerformanceSection;
