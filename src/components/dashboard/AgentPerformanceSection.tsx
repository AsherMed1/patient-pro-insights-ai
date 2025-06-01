
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from 'lucide-react';

interface Agent {
  name: string;
  appointments: number;
  connectRate: number;
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
                          {totalAppointments > 0
                            ? ((agent.appointments / totalAppointments) * 100).toFixed(1)
                            : '0.0'}%
                        </span>
                        <span className="text-sm text-gray-500">of total</span>
                      </div>
                      <Progress 
                        value={totalAppointments > 0 ? (agent.appointments / totalAppointments) * 100 : 0} 
                        className="h-2" 
                      />
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
