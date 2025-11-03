
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseStats {
  totalProjects: number;
  activeProjects: number;
  disabledProjects: number;
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
    activeProjects: 0,
    disabledProjects: 0,
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
      
      // Get counts from all tables, excluding demo project
      const [projectsResult, activeProjectsResult, disabledProjectsResult, appointmentsResult, agentsResult] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).neq('project_name', 'PPM - Test Account'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('active', true).neq('project_name', 'PPM - Test Account'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('active', false).neq('project_name', 'PPM - Test Account'),
        supabase.from('all_appointments').select('id', { count: 'exact', head: true }).neq('project_name', 'PPM - Test Account'),
        supabase.from('agents').select('id', { count: 'exact', head: true })
      ]);
      
      setStats({
        totalProjects: projectsResult.count || 0,
        activeProjects: activeProjectsResult.count || 0,
        disabledProjects: disabledProjectsResult.count || 0,
        totalAppointments: appointmentsResult.count || 0,
        totalAgents: agentsResult.count || 0,
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
      query = query.ilike('status', `%${filters.status}%`);
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
      .select('status');

    if (projectName) {
      appointmentsQuery = appointmentsQuery.eq('project_name', projectName);
    }

    if (dateRange) {
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      appointmentsQuery = appointmentsQuery
        .gte('date_of_appointment', fromDate)
        .lte('date_of_appointment', toDate);
    }

    const appointmentsResult = await appointmentsQuery;

    if (appointmentsResult.error) {
      console.error('Error fetching aggregated metrics:', appointmentsResult.error);
      return null;
    }

    const appointments = appointmentsResult.data || [];

    // Calculate aggregated metrics based on status
    const totalAppointments = appointments.length;
    const showedAppointments = appointments.filter(a => a.status?.toLowerCase() === 'showed').length;
    const confirmedAppointments = appointments.filter(a => a.status?.toLowerCase() === 'confirmed').length;

    const showRate = totalAppointments > 0 ? (showedAppointments / totalAppointments) * 100 : 0;

    return {
      appointments: totalAppointments,
      showedAppointments,
      confirmedAppointments,
      showRate,
      dataSource: 'all_appointments'
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
