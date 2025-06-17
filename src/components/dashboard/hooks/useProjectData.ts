
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Project, ProjectStats, DateRange } from '../types';

export const useProjectData = (selectedProject: string, dateRange: DateRange) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAllRecords = async (baseQuery: any, tableName: string) => {
    let allRecords: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await baseQuery
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allRecords = [...allRecords, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
        console.log(`Fetched ${tableName} batch: ${data.length} records, total so far: ${allRecords.length}`);
      } else {
        hasMore = false;
      }
    }

    console.log(`Total ${tableName} fetched: ${allRecords.length}`);
    return allRecords;
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    }
  };

  const isAppointmentConfirmed = (appointment: any) => {
    return appointment.confirmed === true || 
           (appointment.status && appointment.status.toLowerCase() === 'confirmed');
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Build base queries - clone them for each pagination call
      const buildLeadsQuery = () => {
        let query = supabase.from('new_leads').select('*');
        if (selectedProject !== 'ALL') {
          query = query.eq('project_name', selectedProject);
        }
        if (dateRange.from) {
          const fromDate = dateRange.from.toISOString().split('T')[0];
          query = query.gte('date', fromDate);
        }
        if (dateRange.to) {
          const toDate = dateRange.to.toISOString().split('T')[0];
          query = query.lte('date', toDate);
        }
        return query;
      };

      const buildAppointmentsQuery = () => {
        let query = supabase.from('all_appointments').select('*');
        if (selectedProject !== 'ALL') {
          query = query.eq('project_name', selectedProject);
        }
        if (dateRange.from) {
          const fromDate = dateRange.from.toISOString().split('T')[0];
          query = query.gte('date_appointment_created', fromDate);
        }
        if (dateRange.to) {
          const toDate = dateRange.to.toISOString().split('T')[0];
          query = query.lte('date_appointment_created', toDate);
        }
        return query;
      };

      const buildCallsQuery = () => {
        let query = supabase.from('all_calls').select('*');
        if (selectedProject !== 'ALL') {
          query = query.eq('project_name', selectedProject);
        }
        if (dateRange.from) {
          const fromDate = dateRange.from.toISOString().split('T')[0];
          query = query.gte('date', fromDate);
        }
        if (dateRange.to) {
          const toDate = dateRange.to.toISOString().split('T')[0];
          query = query.lte('date', toDate);
        }
        return query;
      };

      const buildAdSpendQuery = () => {
        let query = supabase.from('facebook_ad_spend').select('spend');
        if (selectedProject !== 'ALL') {
          query = query.eq('project_name', selectedProject);
        }
        if (dateRange.from) {
          const fromDate = dateRange.from.toISOString().split('T')[0];
          query = query.gte('date', fromDate);
        }
        if (dateRange.to) {
          const toDate = dateRange.to.toISOString().split('T')[0];
          query = query.lte('date', toDate);
        }
        return query;
      };

      // Execute queries - fetch all records with pagination for large datasets
      console.log('Starting to fetch all data with proper pagination...');
      
      const [leads, appointments, calls, adSpendData] = await Promise.all([
        fetchAllRecords(buildLeadsQuery(), 'leads'),
        fetchAllRecords(buildAppointmentsQuery(), 'appointments'),
        fetchAllRecords(buildCallsQuery(), 'calls'),
        fetchAllRecords(buildAdSpendQuery(), 'ad_spend')
      ]);

      console.log(`Final counts - Leads: ${leads.length}, Appointments: ${appointments.length}, Calls: ${calls.length}, Ad Spend: ${adSpendData.length}`);

      // Calculate metrics
      const newLeads = leads.length;
      const bookedAppointments = appointments.length;
      
      // Use standardized confirmed logic: confirmed === true OR status === 'Confirmed'
      const confirmedAppointments = appointments.filter(isAppointmentConfirmed).length;
      const unconfirmedAppointments = bookedAppointments - confirmedAppointments;
      
      // For appointments to take place, we need to check the actual appointment date in the future
      const appointmentsToTakePlace = appointments.filter(apt => 
        apt.date_of_appointment && new Date(apt.date_of_appointment) >= new Date()
      ).length;

      // Fixed shows and no-shows calculation logic
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only count appointments that have occurred (past appointment date)
      const pastAppointments = appointments.filter(apt => {
        if (!apt.date_of_appointment) return false;
        const appointmentDate = new Date(apt.date_of_appointment);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate < today;
      });

      console.log(`Past appointments for shows/no-shows calculation: ${pastAppointments.length}`);

      // Shows: appointments that actually showed up (status = 'Showed' OR showed = true)
      const shows = pastAppointments.filter(apt => 
        apt.status === 'Showed' || apt.showed === true
      ).length;

      // No Shows: past appointments that didn't show and weren't cancelled
      const noShows = pastAppointments.filter(apt => 
        (apt.status === 'No Show' || (apt.showed === false && apt.status !== 'Cancelled')) &&
        apt.status !== 'Showed' && apt.showed !== true
      ).length;

      console.log(`Shows: ${shows}, No Shows: ${noShows}`);
      
      const outboundDials = calls.filter(call => call.direction === 'outbound').length;
      const pickups40Plus = calls.filter(call => 
        call.status === 'completed' && call.duration_seconds >= 40
      ).length;
      const conversations2Plus = calls.filter(call => call.duration_seconds >= 120).length;

      const adSpend = adSpendData.reduce((sum, record) => {
        const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
        return sum + (isNaN(spendValue) ? 0 : spendValue);
      }, 0);

      const costPerLead = newLeads > 0 && adSpend > 0 ? adSpend / newLeads : 0;
      const bookingPercentage = newLeads > 0 ? (bookedAppointments / newLeads) * 100 : 0;
      const confirmedPercentage = bookedAppointments > 0 ? (confirmedAppointments / bookedAppointments) * 100 : 0;

      setStats({
        adSpend,
        newLeads,
        costPerLead,
        bookedAppointments,
        confirmedAppointments,
        unconfirmedAppointments,
        appointmentsToTakePlace,
        shows,
        noShows,
        confirmedPercentage,
        outboundDials,
        pickups40Plus,
        conversations2Plus,
        bookingPercentage
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch project statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedProject, dateRange]);

  return {
    projects,
    stats,
    loading,
    fetchStats
  };
};
