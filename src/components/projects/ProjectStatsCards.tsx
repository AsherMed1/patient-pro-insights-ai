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
  onCardClick?: (filter: 'all' | 'showed' | 'procedures') => void;
}

export const ProjectStatsCards: React.FC<ProjectStatsCardsProps> = ({ stats, onCardClick }) => {
  const showRate = stats.totalAppointments > 0 ? (stats.totalShowed / stats.totalAppointments) * 100 : 0;
  const procedureRate = stats.totalShowed > 0 ? (stats.totalProceduresOrdered / stats.totalShowed) * 100 : 0;

  return (
    <div className="section-card animate-fade-in-up">
      <h2 className="text-xl font-semibold text-foreground mb-5">Practice Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Appointments */}
        <Card 
          className="group stats-card stats-card-medical"
          onClick={() => onCardClick?.('all')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground tracking-wide">Total Appointments</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{stats.totalAppointments}</p>
                <Badge variant="secondary" className="text-xs font-normal mt-1.5">
                  All scheduled
                </Badge>
              </div>
              <div className="p-3.5 bg-blue-100/80 dark:bg-blue-900/50 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <CalendarDays className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Show Rate */}
        <Card 
          className="group stats-card stats-card-positive"
          onClick={() => onCardClick?.('showed')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground tracking-wide">Patients Showed</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{stats.totalShowed}</p>
                <Badge variant="default" className="text-xs font-normal mt-1.5 bg-green-600 hover:bg-green-600">
                  {showRate.toFixed(1)}% show rate
                </Badge>
              </div>
              <div className="p-3.5 bg-green-100/80 dark:bg-green-900/50 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <UserCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Procedures Ordered */}
        <Card 
          className="group stats-card stats-card-procedure"
          onClick={() => onCardClick?.('procedures')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground tracking-wide">Procedures Ordered</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{stats.totalProceduresOrdered}</p>
                <Badge variant="outline" className="text-xs font-normal mt-1.5">
                  {procedureRate.toFixed(1)}% conversion
                </Badge>
              </div>
              <div className="p-3.5 bg-purple-100/80 dark:bg-purple-900/50 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <Activity className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Projection */}
        <Card className="group stats-card stats-card-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground tracking-wide">Projected Revenue</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">${stats.projectedRevenue.toLocaleString()}</p>
                <Badge variant="outline" className="text-xs font-normal mt-1.5 text-orange-600 border-orange-200">
                  $7K avg per procedure
                </Badge>
              </div>
              <div className="p-3.5 bg-orange-100/80 dark:bg-orange-900/50 rounded-xl group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="h-7 w-7 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
