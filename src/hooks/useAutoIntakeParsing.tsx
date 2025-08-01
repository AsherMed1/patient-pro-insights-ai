import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAutoIntakeParsing = () => {
  useEffect(() => {
    // Set up interval to check for and process unparsed intake notes
    const interval = setInterval(async () => {
      try {
        console.log('Checking for notes that need parsing...');
        const { data, error } = await supabase.functions.invoke('auto-parse-intake-notes');
        
        if (error) {
          console.error('Auto-parsing error:', error);
          return;
        }

        if (data?.processed > 0) {
          console.log(`Auto-parsed ${data.processed} records`);
        }
      } catch (error) {
        console.error('Auto-parsing failed:', error);
      }
    }, 30000); // Check every 30 seconds

    // Also run immediately on mount
    setTimeout(async () => {
      try {
        await supabase.functions.invoke('auto-parse-intake-notes');
      } catch (error) {
        console.error('Initial auto-parsing failed:', error);
      }
    }, 2000); // Wait 2 seconds after page load

    return () => clearInterval(interval);
  }, []);
};