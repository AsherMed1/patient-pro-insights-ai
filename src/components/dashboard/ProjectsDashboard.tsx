
import React, { useState, Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectFilters from './ProjectFilters';
import ProjectStatsDisplay from './ProjectStatsDisplay';
import { useProjectData } from './hooks/useProjectData';
import { getQuickDateRange } from './utils/dateUtils';
import type { DateRange } from './types';

// Lazy load the heavy FullDataDashboard component
const FullDataDashboard = lazy(() => import('./FullDataDashboard'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading full data dashboard...</span>
  </div>
);

const ProjectsDashboard = () => {
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  const { projects, stats, loading } = useProjectData(selectedProject, dateRange);

  const setQuickDateRange = (type: string) => {
    setDateRange(getQuickDateRange(type));
  };

  return (
    <div className="space-y-6">
      <ProjectFilters
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onQuickDateRange={setQuickDateRange}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fulldata">Full Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>Loading statistics...</p>
            </div>
          ) : stats ? (
            <ProjectStatsDisplay stats={stats} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fulldata" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <FullDataDashboard projectName={selectedProject} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectsDashboard;
