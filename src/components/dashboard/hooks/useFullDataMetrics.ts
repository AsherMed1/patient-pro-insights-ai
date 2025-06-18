
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { isAppointmentConfirmed } from '@/utils/appointmentUtils';
import { addDays, format, subDays } from 'date-fns';

export interface FullDataMetrics {
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

export interface TrendData {
  date: string;
  adSpend: number;
  confirmedAppointments: number;
  showed: number;
  noShow: number;
  procedures: number;
  revenue: number;
}

export const useFullDataMetrics = (projectName?: string, dateRange?: { from: Date; to: Date }) => {
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
  const { toast } = useToast();

  const fetchFullDataMetrics = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
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

  return {
    metrics,
    trendData,
    loading
  };
};
