
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
  return null;
};

export default AppointmentsStats;
