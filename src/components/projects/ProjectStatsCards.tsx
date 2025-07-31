
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, UserCheck, Activity, TrendingUp } from 'lucide-react';

interface AppointmentStats {
  totalAppointments: number;
  totalShowed: number;
  totalProceduresOrdered: number;
  projectedRevenue: number;
}

interface ProjectStatsCardsProps {
  stats: AppointmentStats;
}

export const ProjectStatsCards: React.FC<ProjectStatsCardsProps> = ({ stats }) => {
  const showRate = stats.totalAppointments > 0 ? (stats.totalShowed / stats.totalAppointments) * 100 : 0;
  const procedureRate = stats.totalShowed > 0 ? (stats.totalProceduresOrdered / stats.totalShowed) * 100 : 0;

  return (
    <div className="portal-section">
      <h2 className="text-xl font-semibold text-foreground mb-4">Practice Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Appointments */}
        <Card className="stats-card stats-card-medical">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Appointments</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalAppointments}</p>
                <Badge variant="secondary" className="text-xs">
                  All scheduled
                </Badge>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Show Rate */}
        <Card className="stats-card stats-card-positive">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Patients Showed</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalShowed}</p>
                <Badge variant="default" className="text-xs bg-green-600">
                  {showRate.toFixed(1)}% show rate
                </Badge>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Procedures Ordered */}
        <Card className="stats-card stats-card-procedure">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Procedures Ordered</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalProceduresOrdered}</p>
                <Badge variant="outline" className="text-xs">
                  {procedureRate.toFixed(1)}% conversion
                </Badge>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Projection */}
        <Card className="stats-card stats-card-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Projected Revenue</p>
                <p className="text-3xl font-bold text-foreground">${stats.projectedRevenue.toLocaleString()}</p>
                <Badge variant="outline" className="text-xs text-orange-600">
                  $7K avg per procedure
                </Badge>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
