
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Play, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface SpeedToLeadHeaderProps {
  lastUpdateTime: string;
  calculating: boolean;
  onTriggerCalculation: () => void;
  outlierCount: number;
  onViewOutliers: () => void;
  onForceRefresh?: () => void;
}

const SpeedToLeadHeader = ({ 
  lastUpdateTime, 
  calculating, 
  onTriggerCalculation,
  outlierCount,
  onViewOutliers,
  onForceRefresh
}: SpeedToLeadHeaderProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-6 w-6" />
            <div>
              <CardTitle>Speed to Lead Analytics</CardTitle>
              <CardDescription>
                Live tracking of lead response times (Times in Central Time Zone)
                {lastUpdateTime && ` - Last updated: ${lastUpdateTime}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onForceRefresh && (
              <Button
                variant="outline"
                onClick={onForceRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </Button>
            )}
            {outlierCount > 0 && (
              <Button
                variant="outline"
                onClick={onViewOutliers}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                View Outliers
                <Badge variant="secondary">{outlierCount}</Badge>
              </Button>
            )}
            <Button 
              onClick={onTriggerCalculation}
              disabled={calculating}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {calculating ? 'Calculating...' : 'Trigger Calculation'}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default SpeedToLeadHeader;
