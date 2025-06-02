
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle, Stethoscope, DollarSign } from 'lucide-react';

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
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalAppointments}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Showed</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalShowed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Procedures Ordered</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalProceduresOrdered}</p>
            </div>
            <Stethoscope className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Projected Revenue</p>
              <p className="text-2xl font-bold text-orange-600">${stats.projectedRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
