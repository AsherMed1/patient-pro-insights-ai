
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SheetTab {
  title: string;
  sheetId: number;
}

interface UseSheetTabsProps {
  spreadsheetId: string;
  clientId: string;
}

export const useSheetTabs = ({ spreadsheetId, clientId }: UseSheetTabsProps) => {
  const [tabs, setTabs] = useState<SheetTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTabs = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: response, error: functionError } = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId,
            clientId,
            action: 'getSheets',
          },
        });

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (response?.error) {
          throw new Error(response.error);
        }

        setTabs(response?.sheets || []);
      } catch (err) {
        console.error('Error fetching sheet tabs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sheet tabs');
      } finally {
        setLoading(false);
      }
    };

    if (spreadsheetId && clientId) {
      fetchTabs();
    }
  }, [spreadsheetId, clientId]);

  return { tabs, loading, error };
};
