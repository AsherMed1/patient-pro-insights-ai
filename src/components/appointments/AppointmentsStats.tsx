
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { AllAppointment } from './types';
import { filterAppointments } from './utils';

interface AppointmentsStatsProps {
  appointments: AllAppointment[];
  isProjectPortal?: boolean;
}

const AppointmentsStats = ({ appointments, isProjectPortal = false }: AppointmentsStatsProps) => {
  console.log('AppointmentsStats - Total appointments:', appointments.length);
  
  const futureAppointments = filterAppointments(appointments, 'future', isProjectPortal);
  const pastAppointments = filterAppointments(appointments, 'past', isProjectPortal);
  const needsReviewAppointments = filterAppointments(appointments, 'needs-review', isProjectPortal);
  const cancelledAppointments = filterAppointments(appointments, 'cancelled', isProjectPortal);

  console.log('AppointmentsStats - Filtered counts:', {
    future: futureAppointments.length,
    past: pastAppointments.length,
    needsReview: needsReviewAppointments.length,
    cancelled: cancelledAppointments.length
  });

  const stats = [
    {
      label: 'Upcoming',
      count: futureAppointments.length,
      icon: Calendar,
      variant: 'default' as const,
      color: 'text-blue-600'
    },
    {
      label: 'Past',
      count: pastAppointments.length,
      icon: Clock,
      variant: 'secondary' as const,
      color: 'text-gray-600'
    },
    {
      label: 'Needs Review',
      count: needsReviewAppointments.length,
      icon: AlertCircle,
      variant: 'destructive' as const,
      color: 'text-red-600'
    },
    {
      label: 'Cancelled',
      count: cancelledAppointments.length,
      icon: XCircle,
      variant: 'outline' as const,
      color: 'text-gray-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <Icon className={`h-4 w-4 ${stat.color}`} />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <Badge variant={stat.variant} className="w-fit text-xs">
                {stat.count}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AppointmentsStats;
