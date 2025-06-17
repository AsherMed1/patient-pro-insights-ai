
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AppointmentsStatsProps {
  totalCounts: {
    all: number;
    future: number;
    past: number;
    needsReview: number;
    cancelled: number;
  };
  isProjectPortal?: boolean;
}

const AppointmentsStats = ({ totalCounts, isProjectPortal = false }: AppointmentsStatsProps) => {
  const stats = [
    {
      label: 'Upcoming',
      count: totalCounts.future,
      icon: Calendar,
      variant: 'default' as const,
      color: 'text-blue-600'
    },
    {
      label: 'Past',
      count: totalCounts.past,
      icon: Clock,
      variant: 'secondary' as const,
      color: 'text-gray-600'
    },
    {
      label: 'Needs Review',
      count: totalCounts.needsReview,
      icon: AlertCircle,
      variant: 'destructive' as const,
      color: 'text-red-600'
    },
    {
      label: 'Cancelled',
      count: totalCounts.cancelled,
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
