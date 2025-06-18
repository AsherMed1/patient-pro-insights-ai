
import React, { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lazy load dashboard components
const ProjectsDashboard = lazy(() => import('./ProjectsDashboard'));
const AgentsDashboard = lazy(() => import('./AgentsDashboard'));

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading...</span>
  </div>
);

const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="agents">Agents</TabsTrigger>
      </TabsList>

      <TabsContent value="projects" className="space-y-6">
        <Suspense fallback={<LoadingSpinner />}>
          <ProjectsDashboard />
        </Suspense>
      </TabsContent>

      <TabsContent value="agents" className="space-y-6">
        <Suspense fallback={<LoadingSpinner />}>
          <AgentsDashboard />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default DashboardTabs;
