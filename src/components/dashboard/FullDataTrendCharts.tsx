
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format } from 'date-fns';
import type { TrendData } from './hooks/useFullDataMetrics';

interface FullDataTrendChartsProps {
  trendData: TrendData[];
}

const FullDataTrendCharts = ({ trendData }: FullDataTrendChartsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              adSpend: {
                label: "Ad Spend",
                color: "#ef4444",
              },
              revenue: {
                label: "Revenue",
                color: "#f97316",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="adSpend" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Ad Spend"
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              confirmedAppointments: {
                label: "Confirmed",
                color: "#3b82f6",
              },
              showed: {
                label: "Showed",
                color: "#10b981",
              },
              noShow: {
                label: "No Show",
                color: "#ef4444",
              },
              procedures: {
                label: "Procedures",
                color: "#8b5cf6",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="confirmedAppointments" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Confirmed"
                />
                <Line 
                  type="monotone" 
                  dataKey="showed" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Showed"
                />
                <Line 
                  type="monotone" 
                  dataKey="noShow" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="No Show"
                />
                <Line 
                  type="monotone" 
                  dataKey="procedures" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Procedures"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default FullDataTrendCharts;
