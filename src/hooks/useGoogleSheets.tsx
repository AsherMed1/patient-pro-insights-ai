
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGoogleSheetsProps {
  spreadsheetId: string;
  range: string;
  clientId: string;
}

interface GoogleSheetsResponse {
  data: string[][];
}

export const useGoogleSheets = ({ spreadsheetId, range, clientId }: UseGoogleSheetsProps) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: response, error: functionError } = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId,
            range,
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

    if (spreadsheetId && range && clientId) {
      fetchData();
    }
  }, [spreadsheetId, range, clientId]);

  return { data, loading, error };
};
