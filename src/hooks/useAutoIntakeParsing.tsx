import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

const runParse = async (label: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('auto-parse-intake-notes');
    if (error) {
      console.error(`[AUTO-PARSE CLIENT] ${label} error:`, error);
      return;
    }
    if (data?.processed > 0) {
      console.log(`[AUTO-PARSE CLIENT] ✓ ${label}: ${data.processed} records processed`);
      if (data.errors > 0) {
        console.warn(`[AUTO-PARSE CLIENT] ${data.errors} records failed parsing`);
      }
    }
  } catch (error) {
    console.error(`[AUTO-PARSE CLIENT] ${label} failed:`, error);
  }
};

export const useAutoIntakeParsing = () => {
  // Run once shortly after mount, then on a slow, visibility-aware interval.
  useEffect(() => {
    const t = setTimeout(() => runParse('Initial parse'), 2000);
    return () => clearTimeout(t);
  }, []);

  useVisibilityPolling(() => runParse('Periodic parse'), 180000);
};
