import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAutoIntakeParsing = () => {
  useEffect(() => {
    // Set up interval to check for and process unparsed intake notes
    const interval = setInterval(async () => {
      try {
        console.log('[AUTO-PARSE CLIENT] Checking for notes that need parsing...');
        const { data, error } = await supabase.functions.invoke('auto-parse-intake-notes');
        
        if (error) {
          console.error('[AUTO-PARSE CLIENT] Auto-parsing error:', error);
          return;
        }

        if (data?.processed > 0) {
          console.log(`[AUTO-PARSE CLIENT] ✓ Auto-parsed ${data.processed} records`);
          if (data.errors > 0) {
            console.warn(`[AUTO-PARSE CLIENT] ${data.errors} records failed parsing`);
            if (data.errorDetails) {
              console.error('[AUTO-PARSE CLIENT] Error details:', data.errorDetails);
            }
          }
        }
      } catch (error) {
        console.error('[AUTO-PARSE CLIENT] Auto-parsing failed:', error);
      }
    }, 30000); // Check every 30 seconds

    // Also run immediately on mount
    setTimeout(async () => {
      try {
        console.log('[AUTO-PARSE CLIENT] Initial parsing check...');
        const { data } = await supabase.functions.invoke('auto-parse-intake-notes');
        if (data?.processed > 0) {
          console.log(`[AUTO-PARSE CLIENT] ✓ Initial parse: ${data.processed} records processed`);
        }
      } catch (error) {
        console.error('[AUTO-PARSE CLIENT] Initial auto-parsing failed:', error);
      }
    }, 2000); // Wait 2 seconds after page load

    return () => clearInterval(interval);
  }, []);
};