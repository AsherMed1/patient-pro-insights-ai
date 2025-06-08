import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, TrendingUp, Users } from 'lucide-react';
import type { SpeedToLeadStat, SpeedRangeData } from './types';

interface SpeedToLeadDashboardCardsProps {
  validStats: SpeedToLeadStat[];
  speedRangeData: SpeedRangeData[];
}

const SpeedToLeadDashboardCards = ({ validStats, speedRangeData }: SpeedToLeadDashboardCardsProps) => {
  const formatSpeedToLead = (minutes: number | null) => {
    if (minutes === null || minutes < 0) return 'N/A';
    
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const averageSpeedToLead = validStats.length > 0 
    ? validStats.reduce((sum, stat) => sum + (stat.speed_to_lead_time_min || 0), 0) / validStats.length 
    : 0;

  const medianSpeedToLead = validStats.length > 0 
    ? (() => {
        const sorted = [...validStats].sort((a, b) => (a.speed_to_lead_time_min || 0) - (b.speed_to_lead_time_min || 0));
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 
          ? sorted[mid].speed_to_lead_time_min || 0
          : ((sorted[mid - 1].speed_to_lead_time_min || 0) + (sorted[mid].speed_to_lead_time_min || 0)) / 2;
      })()
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">{validStats.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Speed</p>
              <p className="text-2xl font-bold">{formatSpeedToLead(averageSpeedToLead)}</p>
            </div>
            <Clock className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Median Speed</p>
              <p className="text-2xl font-bold">{formatSpeedToLead(medianSpeedToLead)}</p>
            </div>
            <Target className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">≤ 5 Min Rate</p>
              <p className="text-2xl font-bold">
                {validStats.length > 0 
                  ? `${Math.round((speedRangeData[0].count / validStats.length) * 100)}%`
                  : '0%'
                }
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpeedToLeadDashboardCards;
