
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectsDashboard from './ProjectsDashboard';
import AgentsDashboard from './AgentsDashboard';

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
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
  );
};

export default DashboardTabs;
