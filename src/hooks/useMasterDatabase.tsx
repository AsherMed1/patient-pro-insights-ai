import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseStats {
  totalProjects: number;
  totalAppointments: number;
  totalAgents: number;
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
    totalAgents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get counts from existing tables
      const [projectsCount, appointmentsCount, agentsCount] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase.from('agents').select('id', { count: 'exact', head: true })
      ]);
      
      setStats({
        totalProjects: projectsCount.count || 0,
        totalAppointments: appointmentsCount.count || 0,
        totalAgents: agentsCount.count || 0
      });
      
    } catch (error) {
      console.error('Error fetching database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchAppointments = async (filters: AppointmentFilters) => {
    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false });

    if (filters.projectName) {
      // Since appointments don't have project_name, we'll filter by client_id for now
      query = query.eq('client_id', filters.projectName);
    }

    if (filters.dateRange) {
      query = query
        .gte('appointment_date', filters.dateRange.from.toISOString().split('T')[0])
        .lte('appointment_date', filters.dateRange.to.toISOString().split('T')[0]);
    }

    if (filters.patientName) {
      query = query.ilike('patient_name', `%${filters.patientName}%`);
    }

    if (filters.status) {
      query = query.ilike('status', `%${filters.status}%`);
    }

    if (filters.procedureOrdered !== undefined) {
      query = query.eq('procedure_ordered', filters.procedureOrdered);
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
      .from('appointments')
      .select('procedure_ordered, showed, cancelled, confirmed');

    if (projectName) {
      appointmentsQuery = appointmentsQuery.eq('client_id', projectName);
    }

    if (dateRange) {
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      appointmentsQuery = appointmentsQuery
        .gte('appointment_date', fromDate)
        .lte('appointment_date', toDate);
    }

    const appointmentsResult = await appointmentsQuery;

    if (appointmentsResult.error) {
      console.error('Error fetching aggregated metrics:', appointmentsResult.error);
      return null;
    }

    const appointments = appointmentsResult.data || [];

    // Calculate aggregated metrics from appointments
    const totalAppointments = appointments.length;
    const proceduresOrdered = appointments.filter(a => a.procedure_ordered).length;
    const showedAppointments = appointments.filter(a => a.showed).length;
    const cancelledAppointments = appointments.filter(a => a.cancelled).length;
    const confirmedAppointments = appointments.filter(a => a.confirmed).length;

    const showRate = totalAppointments > 0 ? (showedAppointments / totalAppointments) * 100 : 0;

    return {
      appointments: totalAppointments,
      procedures: proceduresOrdered,
      showedAppointments,
      cancelledAppointments,
      confirmedAppointments,
      showRate,
      dataSource: 'appointments'
    };
  };

  return {
    stats,
    loading,
    fetchStats,
    searchAppointments,
    getAggregatedMetrics
  };
};
