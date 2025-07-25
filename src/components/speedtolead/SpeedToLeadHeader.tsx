
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from 'lucide-react';

interface SpeedToLeadHeaderProps {
  lastUpdateTime: string;
  calculating: boolean;
  onTriggerCalculation: () => void;
}

const SpeedToLeadHeader = ({ lastUpdateTime, calculating, onTriggerCalculation }: SpeedToLeadHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Speed to Lead Analytics</h2>
        <p className="text-gray-600">Live speed-to-lead data with real-time updates (Central Time Zone)</p>
        {lastUpdateTime && (
          <p className="text-sm text-gray-500">Last updated: {lastUpdateTime}</p>
        )}
      </div>
      <div className="flex items-center space-x-4">
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
          <span>{calculating ? 'Calculating...' : 'Trigger Calculation'}</span>
        </Button>
        <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live Data</span>
        </div>
      </div>
    </div>
  );
};

export default SpeedToLeadHeader;
