
import React, { useState, useEffect, useCallback } from 'react';
import SpeedToLeadHeader from './speedtolead/SpeedToLeadHeader';
import SpeedToLeadDateFilter from './speedtolead/SpeedToLeadDateFilter';
import SpeedToLeadDashboardCards from './speedtolead/SpeedToLeadDashboardCards';
import SpeedToLeadCharts from './speedtolead/SpeedToLeadCharts';
import SpeedToLeadDataTable from './speedtolead/SpeedToLeadDataTable';
import SpeedToLeadEmptyState from './speedtolead/SpeedToLeadEmptyState';
import SpeedToLeadOutliersModal from './speedtolead/SpeedToLeadOutliersModal';
import { useSpeedToLeadData } from './speedtolead/hooks/useSpeedToLeadData';
import { useSpeedToLeadCalculation } from './speedtolead/hooks/useSpeedToLeadCalculation';
import { useSpeedToLeadRealtime } from './speedtolead/hooks/useSpeedToLeadRealtime';
import { filterValidStats, filterOutlierStats, generateSpeedRangeData } from './speedtolead/utils/speedToLeadUtils';
import type { DateRange } from './speedtolead/types';

interface SpeedToLeadManagerProps {
  viewOnly?: boolean;
}

const SpeedToLeadManager = ({ viewOnly = false }: SpeedToLeadManagerProps) => {
  const [showOutliersModal, setShowOutliersModal] = useState(false);
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  const { stats, setStats, loading, lastUpdateTime, fetchStats } = useSpeedToLeadData();
  const { calculating, triggerSpeedToLeadCalculation } = useSpeedToLeadCalculation();

  const fetchStatsWithDateRange = useCallback((isForceRefresh = false) => {
    fetchStats(dateRange, isForceRefresh);
  }, [fetchStats, dateRange]);

  const forceRefresh = useCallback(() => {
    setForceRefreshKey(prev => prev + 1);
    fetchStatsWithDateRange(true);
  }, [fetchStatsWithDateRange]);

  const handleTriggerCalculation = async () => {
    const success = await triggerSpeedToLeadCalculation();
    if (success) {
      // Force refresh the data after calculation
      setTimeout(() => {
        forceRefresh();
      }, 1000);
    }
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Set up real-time subscription
  useSpeedToLeadRealtime(forceRefreshKey, fetchStatsWithDateRange, setStats);

  useEffect(() => {
    fetchStatsWithDateRange();
  }, [fetchStatsWithDateRange]);

  // Process stats data
  const validStats = filterValidStats(stats);
  const outlierStats = filterOutlierStats(stats);
  const speedRangeData = generateSpeedRangeData(validStats);

  return (
    <div className="space-y-6">
      <SpeedToLeadHeader
        lastUpdateTime={lastUpdateTime}
        calculating={calculating}
        onTriggerCalculation={handleTriggerCalculation}
        outlierCount={outlierStats.length}
        onViewOutliers={() => setShowOutliersModal(true)}
        onForceRefresh={forceRefresh}
      />

      <SpeedToLeadDateFilter
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
      
      {loading ? (
        <div className="text-center py-8">Loading live data...</div>
      ) : validStats.length === 0 ? (
        <SpeedToLeadEmptyState
          calculating={calculating}
          onTriggerCalculation={handleTriggerCalculation}
        />
      ) : (
        <>
          <SpeedToLeadDashboardCards
            validStats={validStats}
            speedRangeData={speedRangeData}
          />

          <SpeedToLeadCharts speedRangeData={speedRangeData} />

          <SpeedToLeadDataTable
            validStats={validStats}
            dateRange={dateRange}
          />
        </>
      )}

      <SpeedToLeadOutliersModal
        isOpen={showOutliersModal}
        onClose={() => setShowOutliersModal(false)}
        outlierStats={outlierStats}
      />
    </div>
  );
};

export default SpeedToLeadManager;
