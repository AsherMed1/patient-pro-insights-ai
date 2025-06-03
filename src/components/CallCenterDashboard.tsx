
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectsDashboard from './dashboard/ProjectsDashboard';
import AgentsDashboard from './dashboard/AgentsDashboard';

interface CallCenterDashboardProps {
  projectId: string;
}

const CallCenterDashboard = ({ projectId }: CallCenterDashboardProps) => {
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Analytics</h2>
        <p className="text-lg text-gray-600">Comprehensive project and agent performance metrics</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          <ProjectsDashboard />
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <AgentsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CallCenterDashboard;
