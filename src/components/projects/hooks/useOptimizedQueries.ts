
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardFilters {
  projectName?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface DashboardData {
  leads_count: number;
  appointments_count: number;
  calls_count: number;
  ad_spend_total: number;
}

// Cache for dashboard data
interface DashboardCacheEntry {
  data: DashboardData;
  filters: DashboardFilters;
  timestamp: number;
}

const DASHBOARD_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
let dashboardCache: DashboardCacheEntry | null = null;

export const useOptimizedQueries = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Function to generate cache key
  const generateCacheKey = (filters: DashboardFilters): string => {
    return JSON.stringify(filters);
  };

  // Function to check if cache is valid
  const isCacheValid = (filters: DashboardFilters): boolean => {
    if (!dashboardCache) return false;
    
    const cacheAge = Date.now() - dashboardCache.timestamp;
    const filtersMatch = generateCacheKey(filters) === generateCacheKey(dashboardCache.filters);
    
    return cacheAge < DASHBOARD_CACHE_DURATION && filtersMatch;
  };

  // Optimized dashboard data fetching using database function
  const getDashboardData = useCallback(async (
    filters: DashboardFilters = {},
    forceRefresh = false
  ): Promise<DashboardData | null> => {
    // Check cache first
    if (!forceRefresh && isCacheValid(filters)) {
      console.log('Using cached dashboard data');
      return dashboardCache!.data;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_dashboard_data', {
        p_project_name: filters.projectName || 'ALL',
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_limit: 1000
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        const dashboardData: DashboardData = {
          leads_count: Number(result.leads_count) || 0,
          appointments_count: Number(result.appointments_count) || 0,
          calls_count: Number(result.calls_count) || 0,
          ad_spend_total: Number(result.ad_spend_total) || 0
        };

        // Cache the results
        dashboardCache = {
          data: dashboardData,
          filters,
          timestamp: Date.now()
        };

        console.log('Dashboard data fetched and cached:', dashboardData);
        return dashboardData;
      }

      return null;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Get agent performance data from materialized view
  const getAgentPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('agent_performance_view')
        .select('*')
        .order('total_dials_made', { ascending: false });

      if (error) throw error;

      console.log(`Fetched ${data?.length || 0} agent performance records`);
      return data || [];
    } catch (error) {
      console.error('Error fetching agent performance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent performance data",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Function to refresh all materialized views
  const refreshAllViews = useCallback(async () => {
    try {
      await supabase.rpc('refresh_performance_views');
      // Invalidate all caches
      dashboardCache = null;
      console.log('All materialized views refreshed and caches cleared');
    } catch (error) {
      console.error('Error refreshing materialized views:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data views",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Function to invalidate dashboard cache
  const invalidateDashboardCache = useCallback(() => {
    dashboardCache = null;
    console.log('Dashboard cache invalidated');
  }, []);

  return {
    loading,
    getDashboardData,
    getAgentPerformanceData,
    refreshAllViews,
    invalidateDashboardCache,
  };
};
