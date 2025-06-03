
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseStats {
  totalProjects: number;
  totalAppointments: number;
  totalAgents: number;
  totalAdSpend: number;
  lastSyncTime?: string;
}

interface AppointmentFilters {
  projectName?: string;
  dateRange?: { from: Date; to: Date };
  patientName?: string;
  status?: string;
  procedureOrdered?: boolean;
}

export const useMasterDatabase = () => {
  const [stats, setStats] = useState<DatabaseStats>({
    totalProjects: 0,
    totalAppointments: 0,
    totalAgents: 0,
    totalAdSpend: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get counts from all tables
      const [projectsResult, appointmentsResult, agentsResult, adSpendResult] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('all_appointments').select('id', { count: 'exact', head: true }),
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        supabase.from('facebook_ad_spend').select('spend').then(result => {
          if (result.error) return { data: [], error: result.error };
          const totalSpend = result.data?.reduce((sum, record) => sum + parseFloat(record.spend || '0'), 0) || 0;
          return { data: totalSpend, error: null };
        })
      ]);
      
      setStats({
        totalProjects: projectsResult.count || 0,
        totalAppointments: appointmentsResult.count || 0,
        totalAgents: agentsResult.count || 0,
        totalAdSpend: adSpendResult.data || 0,
        lastSyncTime: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchAppointments = async (filters: AppointmentFilters) => {
    let query = supabase
      .from('all_appointments')
      .select('*')
      .order('date_appointment_created', { ascending: false });

    if (filters.projectName) {
      query = query.eq('project_name', filters.projectName);
    }

    if (filters.dateRange) {
      query = query
        .gte('date_of_appointment', filters.dateRange.from.toISOString().split('T')[0])
        .lte('date_of_appointment', filters.dateRange.to.toISOString().split('T')[0]);
    }

    if (filters.patientName) {
      query = query.ilike('lead_name', `%${filters.patientName}%`);
    }

    if (filters.status) {
      if (filters.status === 'showed') {
        query = query.eq('showed', true);
      } else if (filters.status === 'no-show') {
        query = query.eq('showed', false);
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error searching appointments:', error);
      return [];
    }
    
    return data || [];
  };

  const getAggregatedMetrics = async (projectName?: string, dateRange?: { from: Date; to: Date }) => {
    let appointmentsQuery = supabase
      .from('all_appointments')
      .select('showed, confirmed');

    let adSpendQuery = supabase
      .from('facebook_ad_spend')
      .select('spend');

    if (projectName) {
      appointmentsQuery = appointmentsQuery.eq('project_name', projectName);
      adSpendQuery = adSpendQuery.eq('project_name', projectName);
    }

    if (dateRange) {
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      appointmentsQuery = appointmentsQuery
        .gte('date_of_appointment', fromDate)
        .lte('date_of_appointment', toDate);
      
      adSpendQuery = adSpendQuery
        .gte('date', fromDate)
        .lte('date', toDate);
    }

    const [appointmentsResult, adSpendResult] = await Promise.all([
      appointmentsQuery,
      adSpendQuery
    ]);

    if (appointmentsResult.error || adSpendResult.error) {
      console.error('Error fetching aggregated metrics:', appointmentsResult.error || adSpendResult.error);
      return null;
    }

    const appointments = appointmentsResult.data || [];
    const adSpendRecords = adSpendResult.data || [];

    // Calculate aggregated metrics from appointments
    const totalAppointments = appointments.length;
    const showedAppointments = appointments.filter(a => a.showed).length;
    const confirmedAppointments = appointments.filter(a => a.confirmed).length;
    const totalAdSpend = adSpendRecords.reduce((sum, record) => sum + parseFloat(record.spend || '0'), 0);

    const showRate = totalAppointments > 0 ? (showedAppointments / totalAppointments) * 100 : 0;

    return {
      appointments: totalAppointments,
      showedAppointments,
      confirmedAppointments,
      showRate,
      totalAdSpend,
      dataSource: 'all_appointments'
    };
  };

  const getAdSpendByProject = async (projectName: string, dateRange?: { from: Date; to: Date }) => {
    let query = supabase
      .from('facebook_ad_spend')
      .select('*')
      .eq('project_name', projectName)
      .order('date', { ascending: false });

    if (dateRange) {
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      query = query
        .gte('date', fromDate)
        .lte('date', toDate);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching ad spend:', error);
      return [];
    }
    
    return data || [];
  };

  return {
    stats,
    loading,
    fetchStats,
    searchAppointments,
    getAggregatedMetrics,
    getAdSpendByProject
  };
};
