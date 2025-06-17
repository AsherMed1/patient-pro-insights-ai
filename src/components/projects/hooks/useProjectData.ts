
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectStats } from '../types';
import { isAppointmentConfirmed } from '@/utils/appointmentUtils';

export const useProjectData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjectsAndStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch stats for each project
      const statsPromises = (projectsData || []).map(async (project) => {
        const [leadsResult, callsResult, appointmentsResult, adSpendResult] = await Promise.all([
          supabase
            .from('new_leads')
            .select('id', { count: 'exact', head: true })
            .eq('project_name', project.project_name),
          supabase
            .from('all_calls')
            .select('id, call_datetime', { count: 'exact' })
            .eq('project_name', project.project_name)
            .order('call_datetime', { ascending: false })
            .limit(1),
          supabase
            .from('all_appointments')
            .select('id', { count: 'exact', head: true })
            .eq('project_name', project.project_name),
          supabase
            .from('facebook_ad_spend')
            .select('spend')
            .eq('project_name', project.project_name)
        ]);

        // Fetch confirmed appointments using standardized logic
        const confirmedAppointmentsResult = await supabase
          .from('all_appointments')
          .select('confirmed, status')
          .eq('project_name', project.project_name);

        const confirmedCount = confirmedAppointmentsResult.data?.filter(isAppointmentConfirmed).length || 0;

        const totalAdSpend = adSpendResult.data?.reduce((sum, record) => {
          const spendValue = typeof record.spend === 'string' ? parseFloat(record.spend) : Number(record.spend);
          return sum + (isNaN(spendValue) ? 0 : spendValue);
        }, 0) || 0;

        return {
          project_name: project.project_name,
          leads_count: leadsResult.count || 0,
          calls_count: callsResult.count || 0,
          appointments_count: appointmentsResult.count || 0,
          confirmed_appointments_count: confirmedCount,
          ad_spend: totalAdSpend,
          last_activity: callsResult.data?.[0]?.call_datetime || null
        };
      });

      const stats = await Promise.all(statsPromises);
      setProjectStats(stats);
    } catch (error) {
      console.error('Error fetching projects and stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    projects,
    projectStats,
    loading,
    fetchProjectsAndStats,
  };
};
