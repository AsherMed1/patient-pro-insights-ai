
import React, { useState } from 'react';
import ProjectFilters from './ProjectFilters';
import ProjectStatsDisplay from './ProjectStatsDisplay';
import { useProjectData } from './hooks/useProjectData';
import { getQuickDateRange } from './utils/dateUtils';
import type { DateRange } from './types';

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
    </div>
  );
};

export default ProjectsDashboard;
