import { supabase } from '@/integrations/supabase/client';

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const DEFAULT_TZ = 'America/Chicago';

export const getCachedProjectTimezone = (projectName?: string | null): string | undefined => {
  if (!projectName) return undefined;
  return cache.get(projectName);
};

export const fetchProjectTimezone = async (projectName?: string | null): Promise<string> => {
  if (!projectName) return DEFAULT_TZ;
  const cached = cache.get(projectName);
  if (cached) return cached;
  const existing = inflight.get(projectName);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('timezone')
        .eq('project_name', projectName)
        .maybeSingle();
      const tz = (!error && data?.timezone) ? data.timezone : DEFAULT_TZ;
      cache.set(projectName, tz);
      return tz;
    } catch {
      cache.set(projectName, DEFAULT_TZ);
      return DEFAULT_TZ;
    } finally {
      inflight.delete(projectName);
    }
  })();

  inflight.set(projectName, promise);
  return promise;
};
