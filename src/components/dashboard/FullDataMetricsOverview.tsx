
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Users, Target, Activity, TrendingUp } from 'lucide-react';
import type { FullDataMetrics } from './hooks/useFullDataMetrics';

interface FullDataMetricsOverviewProps {
  metrics: FullDataMetrics;
}

const FullDataMetricsOverview = ({ metrics }: FullDataMetricsOverviewProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Ad Spend</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalAdSpend)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmed Appointments</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.totalConfirmedAppointments}</p>
              <p className="text-xs text-gray-500">Cost: {formatCurrency(metrics.costPerConfirmedAppointment)}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Showed</p>
              <p className="text-2xl font-bold text-green-600">{metrics.totalShowed}</p>
              <p className="text-xs text-gray-500">Cost: {formatCurrency(metrics.costPerShow)}</p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total No Show</p>
              <p className="text-2xl font-bold text-red-600">{metrics.totalNoShow}</p>
              <p className="text-xs text-gray-500">Show Rate: {formatPercentage(metrics.showRate)}</p>
            </div>
            <Activity className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Procedures Ordered</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.proceduresOrdered}</p>
              <p className="text-xs text-gray-500">Cost: {formatCurrency(metrics.costPerProcedure)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Projected Revenue</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.projectedRevenue)}</p>
              <p className="text-xs text-gray-500">Rate: {formatPercentage(metrics.procedureRate)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FullDataMetricsOverview;
