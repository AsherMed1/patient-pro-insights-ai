
import React, { useState } from 'react';
import { subDays } from 'date-fns';
import { useFullDataMetrics } from './hooks/useFullDataMetrics';
import FullDataDateFilter from './FullDataDateFilter';
import FullDataMetricsOverview from './FullDataMetricsOverview';
import FullDataTrendCharts from './FullDataTrendCharts';

interface FullDataDashboardProps {
  projectName?: string;
}

const FullDataDashboard = ({ projectName }: FullDataDashboardProps) => {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const { metrics, trendData, loading } = useFullDataMetrics(projectName, dateRange);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span>Loading full data metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FullDataDateFilter 
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <FullDataMetricsOverview metrics={metrics} />

      <FullDataTrendCharts trendData={trendData} />
    </div>
  );
};

export default FullDataDashboard;
