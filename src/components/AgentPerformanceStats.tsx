
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Clock, Calendar, TrendingUp, Users, CheckCircle, XCircle, Target } from 'lucide-react';

interface TotalStats {
  totalDials: number;
  totalAnswered: number;
  totalBooked: number;
  totalShows: number;
  totalNoShows: number;
  totalTimeOnPhone: number;
}

interface AgentPerformanceStatsProps {
  totalStats: TotalStats;
  averageShowRate: number;
  agentCount: number;
}

const AgentPerformanceStats = ({ totalStats, averageShowRate, agentCount }: AgentPerformanceStatsProps) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const answerRate = totalStats.totalDials > 0 
    ? ((totalStats.totalAnswered / totalStats.totalDials) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{agentCount}</div>
          <p className="text-xs text-muted-foreground">Active today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Dials</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.totalDials.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {totalStats.totalAnswered} answered ({answerRate}%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Appointments Booked</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{totalStats.totalBooked}</div>
          <p className="text-xs text-muted-foreground">Total bookings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Show Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{averageShowRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Across all agents</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Time on Phone</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatTime(totalStats.totalTimeOnPhone)}</div>
          <p className="text-xs text-muted-foreground">All agents combined</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Shows vs No Shows</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-lg font-bold text-green-600">{totalStats.totalShows}</span>
            </div>
            <span className="text-gray-400">vs</span>
            <div className="flex items-center space-x-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-lg font-bold text-red-600">{totalStats.totalNoShows}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Shows vs No-shows</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPerformanceStats;
