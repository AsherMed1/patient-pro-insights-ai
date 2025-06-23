
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, DollarSign, Users, Target, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { isAppointmentConfirmed } from '@/utils/appointmentUtils';
import { addDays, format, subDays } from 'date-fns';

interface FullDataMetrics {
  totalAdSpend: number;
  totalConfirmedAppointments: number;
  totalShowed: number;
  totalNoShow: number;
  proceduresOrdered: number;
  projectedRevenue: number;
  costPerConfirmedAppointment: number;
  costPerShow: number;
  costPerProcedure: number;
  showRate: number;
  procedureRate: number;
}

interface TrendData {
  date: string;
  adSpend: number;
  confirmedAppointments: number;
  showed: number;
  noShow: number;
  procedures: number;
  revenue: number;
}

interface FullDataDashboardProps {
  projectName?: string;
}

const FullDataDashboard = ({ projectName }: FullDataDashboardProps) => {
  const [metrics, setMetrics] = useState<FullDataMetrics>({
    totalAdSpend: 0,
    totalConfirmedAppointments: 0,
    totalShowed: 0,
    totalNoShow: 0,
    proceduresOrdered: 0,
    projectedRevenue: 0,
    costPerConfirmedAppointment: 0,
    costPerShow: 0,
    costPerProcedure: 0,
    showRate: 0,
    procedureRate: 0
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const { toast } = useToast();

  const fetchFullDataMetrics = async () => {
    try {
      setLoading(true);
      
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Build queries with optional project filter
      let appointmentsQuery = supabase
        .from('all_appointments')
        .select('*')
        .gte('date_of_appointment', fromDate)
        .lte('date_of_appointment', toDate);

      let adSpendQuery = supabase
        .from('facebook_ad_spend')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate);

      if (projectName && projectName !== 'ALL') {
        appointmentsQuery = appointmentsQuery.eq('project_name', projectName);
        adSpendQuery = adSpendQuery.eq('project_name', projectName);
      }

      const [appointmentsResult, adSpendResult] = await Promise.all([
        appointmentsQuery,
        adSpendQuery
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (adSpendResult.error) throw adSpendResult.error;

      const appointments = appointmentsResult.data || [];
      const adSpendRecords = adSpendResult.data || [];

      // Calculate metrics
      const confirmedAppointments = appointments.filter(isAppointmentConfirmed);
      const showedAppointments = confirmedAppointments.filter(apt => apt.showed === true);
      const noShowAppointments = confirmedAppointments.filter(apt => apt.showed === false);
      const proceduresOrderedCount = confirmedAppointments.filter(apt => apt.procedure_ordered === true).length;
      
      const totalAdSpend = adSpendRecords.reduce((sum, record) => {
        const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
        return sum + (isNaN(spendValue) ? 0 : spendValue);
      }, 0);

      const projectedRevenue = proceduresOrderedCount * 7000;
      const showRate = confirmedAppointments.length > 0 ? (showedAppointments.length / confirmedAppointments.length) * 100 : 0;
      const procedureRate = showedAppointments.length > 0 ? (proceduresOrderedCount / showedAppointments.length) * 100 : 0;

      const newMetrics: FullDataMetrics = {
        totalAdSpend,
        totalConfirmedAppointments: confirmedAppointments.length,
        totalShowed: showedAppointments.length,
        totalNoShow: noShowAppointments.length,
        proceduresOrdered: proceduresOrderedCount,
        projectedRevenue,
        costPerConfirmedAppointment: confirmedAppointments.length > 0 ? totalAdSpend / confirmedAppointments.length : 0,
        costPerShow: showedAppointments.length > 0 ? totalAdSpend / showedAppointments.length : 0,
        costPerProcedure: proceduresOrderedCount > 0 ? totalAdSpend / proceduresOrderedCount : 0,
        showRate,
        procedureRate
      };

      setMetrics(newMetrics);

      // Generate trend data by grouping by date
      const trendMap = new Map<string, TrendData>();
      
      // Initialize all dates in range
      let currentDate = new Date(dateRange.from);
      while (currentDate <= dateRange.to) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        trendMap.set(dateStr, {
          date: dateStr,
          adSpend: 0,
          confirmedAppointments: 0,
          showed: 0,
          noShow: 0,
          procedures: 0,
          revenue: 0
        });
        currentDate = addDays(currentDate, 1);
      }

      // Add ad spend data
      adSpendRecords.forEach(record => {
        const dateStr = record.date;
        const existing = trendMap.get(dateStr);
        if (existing) {
          const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
          existing.adSpend += isNaN(spendValue) ? 0 : spendValue;
        }
      });

      // Add appointment data
      appointments.forEach(appointment => {
        if (!appointment.date_of_appointment) return;
        
        const dateStr = appointment.date_of_appointment;
        const existing = trendMap.get(dateStr);
        if (existing && isAppointmentConfirmed(appointment)) {
          existing.confirmedAppointments += 1;
          
          if (appointment.showed === true) {
            existing.showed += 1;
          } else if (appointment.showed === false) {
            existing.noShow += 1;
          }
          
          if (appointment.procedure_ordered === true) {
            existing.procedures += 1;
            existing.revenue += 7000;
          }
        }
      });

      const trendArray = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      setTrendData(trendArray);

    } catch (error) {
      console.error('Error fetching full data metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch full data metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullDataMetrics();
  }, [dateRange, projectName]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span>Loading full data metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Date Range Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <DatePickerWithRange
              date={dateRange}
              onDateChange={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: subDays(new Date(), 7),
                  to: new Date()
                })}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: subDays(new Date(), 30),
                  to: new Date()
                })}
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  from: subDays(new Date(), 90),
                  to: new Date()
                })}
              >
                Last 90 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
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

      {/* Trend Charts */}
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
    </div>
  );
};

export default FullDataDashboard;
