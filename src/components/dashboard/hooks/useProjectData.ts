
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Project, ProjectStats, DateRange } from '../types';
import { fetchAllRecords } from './utils/dataFetcher';
import { 
  buildLeadsQuery, 
  buildAppointmentsQuery, 
  buildCallsQuery, 
  buildAdSpendQuery 
} from './utils/queryBuilders';
import { 
  calculateShowsAndNoShows, 
  calculateCallMetrics, 
  calculateAdSpend, 
  calculateAppointmentMetrics 
} from './utils/metricsCalculator';

export const useProjectData = (selectedProject: string, dateRange: DateRange) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      console.log('Starting to fetch all data with proper pagination...');
      
      const [leads, appointments, calls, adSpendData] = await Promise.all([
        fetchAllRecords(buildLeadsQuery(selectedProject, dateRange), 'leads'),
        fetchAllRecords(buildAppointmentsQuery(selectedProject, dateRange), 'appointments'),
        fetchAllRecords(buildCallsQuery(selectedProject, dateRange), 'calls'),
        fetchAllRecords(buildAdSpendQuery(selectedProject, dateRange), 'ad_spend')
      ]);

      console.log(`Final counts - Leads: ${leads.length}, Appointments: ${appointments.length}, Calls: ${calls.length}, Ad Spend: ${adSpendData.length}`);

      // Calculate metrics
      const newLeads = leads.length;
      const appointmentMetrics = calculateAppointmentMetrics(appointments);
      const { shows, noShows } = calculateShowsAndNoShows(appointments);
      const callMetrics = calculateCallMetrics(calls);
      const adSpend = calculateAdSpend(adSpendData);

      const costPerLead = newLeads > 0 && adSpend > 0 ? adSpend / newLeads : 0;
      const bookingPercentage = newLeads > 0 ? (appointmentMetrics.bookedAppointments / newLeads) * 100 : 0;
      const confirmedPercentage = appointmentMetrics.bookedAppointments > 0 ? (appointmentMetrics.confirmedAppointments / appointmentMetrics.bookedAppointments) * 100 : 0;

      setStats({
        adSpend,
        newLeads,
        costPerLead,
        ...appointmentMetrics,
        shows,
        noShows,
        confirmedPercentage,
        ...callMetrics,
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
