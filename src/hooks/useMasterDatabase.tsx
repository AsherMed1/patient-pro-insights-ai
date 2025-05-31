
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseStats {
  totalClients: number;
  totalAppointments: number;
  totalCampaigns: number;
  lastSyncTime?: string;
}

interface AppointmentFilters {
  clientId?: string;
  dateRange?: { from: Date; to: Date };
  patientName?: string;
  status?: string;
  procedureOrdered?: boolean;
}

interface CampaignFilters {
  clientId?: string;
  dateRange?: { from: Date; to: Date };
  minSpend?: number;
  maxSpend?: number;
}

export const useMasterDatabase = () => {
  const [stats, setStats] = useState<DatabaseStats>({
    totalClients: 0,
    totalAppointments: 0,
    totalCampaigns: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get counts from all tables
      const [clientsCount, appointmentsCount, campaignsCount, lastSync] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase
          .from('sync_logs')
          .select('completed_at')
          .eq('status', 'success')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);
      
      setStats({
        totalClients: clientsCount.count || 0,
        totalAppointments: appointmentsCount.count || 0,
        totalCampaigns: campaignsCount.count || 0,
        lastSyncTime: lastSync.data?.completed_at
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
      .select(`
        *,
        clients!inner(name)
      `)
      .order('appointment_date', { ascending: false });

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
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

  const searchCampaigns = async (filters: CampaignFilters) => {
    let query = supabase
      .from('campaigns')
      .select(`
        *,
        clients!inner(name)
      `)
      .order('campaign_date', { ascending: false });

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters.dateRange) {
      query = query
        .gte('campaign_date', filters.dateRange.from.toISOString().split('T')[0])
        .lte('campaign_date', filters.dateRange.to.toISOString().split('T')[0]);
    }

    if (filters.minSpend !== undefined) {
      query = query.gte('ad_spend', filters.minSpend);
    }

    if (filters.maxSpend !== undefined) {
      query = query.lte('ad_spend', filters.maxSpend);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error searching campaigns:', error);
      return [];
    }
    
    return data || [];
  };

  const getAggregatedMetrics = async (clientId?: string, dateRange?: { from: Date; to: Date }) => {
    let appointmentsQuery = supabase
      .from('appointments')
      .select('procedure_ordered, showed, cancelled, confirmed');
    
    let campaignsQuery = supabase
      .from('campaigns')
      .select('ad_spend, leads, appointments, procedures, show_rate');

    if (clientId) {
      appointmentsQuery = appointmentsQuery.eq('client_id', clientId);
      campaignsQuery = campaignsQuery.eq('client_id', clientId);
    }

    if (dateRange) {
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      appointmentsQuery = appointmentsQuery
        .gte('appointment_date', fromDate)
        .lte('appointment_date', toDate);
        
      campaignsQuery = campaignsQuery
        .gte('campaign_date', fromDate)
        .lte('campaign_date', toDate);
    }

    const [appointmentsResult, campaignsResult] = await Promise.all([
      appointmentsQuery,
      campaignsQuery
    ]);

    if (appointmentsResult.error || campaignsResult.error) {
      console.error('Error fetching aggregated metrics:', {
        appointmentsError: appointmentsResult.error,
        campaignsError: campaignsResult.error
      });
      return null;
    }

    const appointments = appointmentsResult.data || [];
    const campaigns = campaignsResult.data || [];

    // Calculate aggregated metrics
    const totalAppointments = appointments.length;
    const proceduresOrdered = appointments.filter(a => a.procedure_ordered).length;
    const showedAppointments = appointments.filter(a => a.showed).length;
    const cancelledAppointments = appointments.filter(a => a.cancelled).length;
    const confirmedAppointments = appointments.filter(a => a.confirmed).length;

    const totalAdSpend = campaigns.reduce((sum, c) => sum + (c.ad_spend || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
    const totalCampaignAppointments = campaigns.reduce((sum, c) => sum + (c.appointments || 0), 0);
    const totalProcedures = campaigns.reduce((sum, c) => sum + (c.procedures || 0), 0);

    const showRate = totalAppointments > 0 ? (showedAppointments / totalAppointments) * 100 : 0;
    const cpl = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
    const cpa = totalCampaignAppointments > 0 ? totalAdSpend / totalCampaignAppointments : 0;
    const cpp = totalProcedures > 0 ? totalAdSpend / totalProcedures : 0;

    return {
      // Use appointment data when available, fallback to campaign data
      appointments: totalAppointments || totalCampaignAppointments,
      procedures: proceduresOrdered || totalProcedures,
      showedAppointments,
      cancelledAppointments,
      confirmedAppointments,
      showRate,
      adSpend: totalAdSpend,
      leads: totalLeads,
      cpl,
      cpa,
      cpp,
      dataSource: totalAppointments > 0 ? 'appointments' : 'campaigns'
    };
  };

  return {
    stats,
    loading,
    fetchStats,
    searchAppointments,
    searchCampaigns,
    getAggregatedMetrics
  };
};
