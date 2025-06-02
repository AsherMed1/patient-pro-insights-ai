
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from 'lucide-react';

interface SpeedToLeadEmptyStateProps {
  calculating: boolean;
  onTriggerCalculation: () => void;
}

const SpeedToLeadEmptyState = ({ calculating, onTriggerCalculation }: SpeedToLeadEmptyStateProps) => {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500 mb-4">No speed to lead data available for the selected date range</p>
      <p className="text-sm text-gray-400 mb-4">
        Data will appear here automatically as new leads are processed
      </p>
      <Button
        onClick={onTriggerCalculation}
        disabled={calculating}
        className="flex items-center space-x-2"
      >
        {calculating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span>{calculating ? 'Calculating...' : 'Calculate Speed to Lead'}</span>
      </Button>
    </div>
  );
};

export default SpeedToLeadEmptyState;
