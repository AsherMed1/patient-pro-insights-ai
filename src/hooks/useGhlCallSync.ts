import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncProgress {
  currentProject: string;
  projectIndex: number;
  totalProjects: number;
  totalSynced: number;
  totalProcessed: number;
  hasMore: boolean;
}

export const useGhlCallSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const abortRef = useRef(false);
  const { toast } = useToast();

  const syncAllProjects = useCallback(async (opts: {
    dateFrom?: string;
    dateTo?: string;
    projectName?: string; // single project or 'ALL'
    onComplete?: () => void;
  }) => {
    setSyncing(true);
    abortRef.current = false;

    try {
      // Get list of projects with GHL credentials
      let projectNames: string[] = [];

      if (opts.projectName && opts.projectName !== 'ALL' && opts.projectName !== 'project-1') {
        projectNames = [opts.projectName];
      } else {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('project_name')
          .eq('active', true)
          .not('ghl_api_key', 'is', null)
          .not('ghl_location_id', 'is', null)
          .neq('project_name', 'PPM - Test Account');

        if (error) throw error;
        projectNames = (projects || []).map(p => p.project_name);
      }

      if (projectNames.length === 0) {
        toast({ title: 'No Projects', description: 'No projects with GHL credentials found.' });
        return;
      }

      let grandTotalSynced = 0;

      for (let pi = 0; pi < projectNames.length; pi++) {
        if (abortRef.current) break;

        const projectName = projectNames[pi];
        let hasMore = true;
        let projectSynced = 0;
        let projectProcessed = 0;

        while (hasMore && !abortRef.current) {
          setProgress({
            currentProject: projectName,
            projectIndex: pi,
            totalProjects: projectNames.length,
            totalSynced: grandTotalSynced + projectSynced,
            totalProcessed: projectProcessed,
            hasMore,
          });

          const { data, error } = await supabase.functions.invoke('sync-ghl-calls', {
            body: {
              projectName,
              dateFrom: opts.dateFrom,
              dateTo: opts.dateTo,
            },
          });

          if (error) {
            console.error(`[SYNC] ${projectName} error:`, error);
            break;
          }

          projectSynced = data?.totalSynced || 0;
          projectProcessed = data?.totalProcessed || 0;
          hasMore = data?.hasMore || false;
        }

        grandTotalSynced += projectSynced;
      }

      toast({
        title: 'Sync Complete',
        description: `Synced ${grandTotalSynced.toLocaleString()} call records across ${projectNames.length} projects`,
      });

      opts.onComplete?.();
    } catch (err) {
      console.error('GHL sync error:', err);
      toast({
        title: 'Sync Failed',
        description: err instanceof Error ? err.message : 'Failed to sync from GHL',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  }, [toast]);

  const cancelSync = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { syncing, progress, syncAllProjects, cancelSync };
};
