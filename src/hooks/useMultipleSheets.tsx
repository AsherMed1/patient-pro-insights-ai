
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSheetTabs } from './useSheetTabs';
import { findAllCampaignTabs, createRange } from '@/config/googleSheets';

interface UseMultipleSheetsProps {
  spreadsheetId: string;
  clientId: string;
  dataType: 'campaign' | 'calls' | 'health';
}

interface MultipleSheetData {
  tabName: string;
  data: string[][];
}

export const useMultipleSheets = ({ 
  spreadsheetId, 
  clientId, 
  dataType 
}: UseMultipleSheetsProps) => {
  const [allData, setAllData] = useState<MultipleSheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedTabs, setUsedTabs] = useState<string[]>([]);

  // Fetch available tabs
  const { tabs, loading: tabsLoading, error: tabsError } = useSheetTabs({
    spreadsheetId,
    clientId,
  });

  useEffect(() => {
    const fetchMultipleSheets = async () => {
      try {
        setLoading(true);
        setError(null);

        if (tabs.length === 0) return;

        let tabsToFetch: string[] = [];

        if (dataType === 'campaign') {
          tabsToFetch = findAllCampaignTabs(tabs);
        } else {
          // For other data types, use single tab approach
          return;
        }

        if (tabsToFetch.length === 0) {
          throw new Error('No relevant tabs found');
        }

        console.log(`Fetching data from ${tabsToFetch.length} tabs:`, tabsToFetch);

        // Fetch data from all relevant tabs
        const fetchPromises = tabsToFetch.map(async (tabName) => {
          const range = createRange(tabName);
          
          const { data: response, error: functionError } = await supabase.functions.invoke('google-sheets', {
            body: {
              spreadsheetId,
              range,
              clientId,
            },
          });

          if (functionError) {
            console.error(`Error fetching tab ${tabName}:`, functionError);
            return null;
          }

          if (response?.error) {
            console.error(`API error for tab ${tabName}:`, response.error);
            return null;
          }

          return {
            tabName,
            data: response?.data || [],
          };
        });

        const results = await Promise.all(fetchPromises);
        const validResults = results.filter((result): result is MultipleSheetData => result !== null);
        
        setAllData(validResults);
        setUsedTabs(validResults.map(r => r.tabName));

      } catch (err) {
        console.error('Error fetching multiple sheets:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (spreadsheetId && clientId && tabs.length > 0 && !tabsLoading) {
      fetchMultipleSheets();
    } else if (tabsError) {
      setError(tabsError);
      setLoading(false);
    }
  }, [spreadsheetId, clientId, dataType, tabs, tabsLoading, tabsError]);

  return { 
    allData, 
    loading: loading || tabsLoading, 
    error: error || tabsError,
    usedTabs 
  };
};
