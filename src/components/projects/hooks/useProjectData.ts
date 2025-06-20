
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectStats } from '../types';
import { isAppointmentConfirmed } from '@/utils/appointmentUtils';

// Cache for project stats with timestamp
interface CacheEntry {
  data: ProjectStats[];
  timestamp: number;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let statsCache: CacheEntry | null = null;

export const useProjectData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Function to refresh materialized views
  const refreshMaterializedViews = useCallback(async () => {
    try {
      await supabase.rpc('refresh_performance_views');
      console.log('Materialized views refreshed successfully');
    } catch (error) {
      console.error('Error refreshing materialized views:', error);
    }
  }, []);

  // Function to get stats from cache or database
  const getProjectStats = useCallback(async (forceRefresh = false): Promise<ProjectStats[]> => {
    // Check cache first
    if (!forceRefresh && statsCache && (Date.now() - statsCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached project stats');
      return statsCache.data;
    }

    try {
      // Try to use the optimized materialized view first
      const { data: viewData, error: viewError } = await supabase
        .from('project_stats_view')
        .select('*')
        .order('project_name');

      if (!viewError && viewData && viewData.length > 0) {
        console.log('Using materialized view for project stats');
        const optimizedStats = viewData.map(row => ({
          project_name: row.project_name,
          leads_count: row.leads_count || 0,
          calls_count: row.calls_count || 0,
          appointments_count: row.appointments_count || 0,
          confirmed_appointments_count: row.confirmed_appointments_count || 0,
          ad_spend: row.ad_spend || 0,
          last_activity: row.last_activity || null
        }));

        // Cache the results
        statsCache = {
          data: optimizedStats,
          timestamp: Date.now()
        };

        return optimizedStats;
      }

      // Fallback to the original method if materialized view fails
      console.log('Falling back to individual queries for project stats');
      return await fetchStatsIndividually();

    } catch (error) {
      console.error('Error fetching project stats:', error);
      // Fallback to individual queries
      return await fetchStatsIndividually();
    }
  }, []);

  // Fallback method for fetching stats individually
  const fetchStatsIndividually = async (): Promise<ProjectStats[]> => {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('project_name')
      .order('project_name');

    if (!projectsData) return [];

    const statsPromises = projectsData.map(async (project) => {
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

    return await Promise.all(statsPromises);
  };

  const fetchProjectsAndStats = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Get stats using optimized method
      const stats = await getProjectStats(forceRefresh);
      setProjectStats(stats);

      console.log(`Fetched ${stats.length} project statistics`);
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
  }, [getProjectStats, toast]);

  // Function to manually refresh data and materialized views
  const forceRefresh = useCallback(async () => {
    await refreshMaterializedViews();
    await fetchProjectsAndStats(true);
  }, [refreshMaterializedViews, fetchProjectsAndStats]);

  // Function to invalidate cache
  const invalidateCache = useCallback(() => {
    statsCache = null;
    console.log('Project stats cache invalidated');
  }, []);

  return {
    projects,
    projectStats,
    loading,
    fetchProjectsAndStats,
    forceRefresh,
    invalidateCache,
    refreshMaterializedViews,
  };
};
