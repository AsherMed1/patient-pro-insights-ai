
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSheetTabs } from './useSheetTabs';
import { findBestTab, createRange } from '@/config/googleSheets';

interface UseGoogleSheetsProps {
  spreadsheetId: string;
  range?: string;
  clientId: string;
  dataType?: 'campaign' | 'calls' | 'health';
  enableDynamicTabs?: boolean;
}

interface GoogleSheetsResponse {
  data: string[][];
}

export const useGoogleSheets = ({ 
  spreadsheetId, 
  range, 
  clientId, 
  dataType,
  enableDynamicTabs = false 
}: UseGoogleSheetsProps) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedTabName, setUsedTabName] = useState<string | null>(null);

  // Fetch available tabs if dynamic tabs are enabled
  const { tabs, loading: tabsLoading, error: tabsError } = useSheetTabs({
    spreadsheetId: enableDynamicTabs ? spreadsheetId : '',
    clientId: enableDynamicTabs ? clientId : '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let finalRange = range;

        // If dynamic tabs are enabled and we have a dataType, find the best matching tab
        if (enableDynamicTabs && dataType && tabs.length > 0) {
          const bestTab = findBestTab(tabs, dataType);
          if (bestTab) {
            finalRange = createRange(bestTab);
            setUsedTabName(bestTab);
            console.log(`Using dynamic tab "${bestTab}" for ${dataType} data`);
          }
        }

        if (!finalRange) {
          throw new Error('No range specified and could not determine tab');
        }

        const { data: response, error: functionError } = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId,
            range: finalRange,
            clientId,
          },
        });

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (response?.error) {
          throw new Error(response.error);
        }

        setData(response?.data || []);
      } catch (err) {
        console.error('Error fetching Google Sheets data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data when we have the required info
    const canFetch = spreadsheetId && clientId && (
      range || // We have a specific range
      !enableDynamicTabs || // Dynamic tabs disabled, so range should be provided
      (enableDynamicTabs && !tabsLoading && tabs.length > 0) // Dynamic tabs enabled and tabs are loaded
    );

    if (canFetch) {
      fetchData();
    } else if (enableDynamicTabs && tabsError) {
      setError(tabsError);
      setLoading(false);
    }
  }, [spreadsheetId, range, clientId, dataType, enableDynamicTabs, tabs, tabsLoading, tabsError]);

  return { 
    data, 
    loading: loading || (enableDynamicTabs && tabsLoading), 
    error: error || (enableDynamicTabs ? tabsError : null),
    usedTabName 
  };
};
