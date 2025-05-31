
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  success: boolean;
  clientId: string;
  syncType: string;
  recordsProcessed: number;
  error?: string;
}

export const useDataSync = () => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const syncClient = async (clientId: string, syncType: 'full' | 'appointments' | 'campaigns' = 'full'): Promise<SyncResult> => {
    setSyncing(true);
    
    try {
      console.log(`Starting sync for client: ${clientId}, type: ${syncType}`);
      
      const { data, error } = await supabase.functions.invoke('sync-sheets-data', {
        body: { clientId, syncType }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data as SyncResult;
      
      if (result.success) {
        toast({
          title: "Sync Successful",
          description: `Processed ${result.recordsProcessed} records for ${clientId}`,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Sync error:', error);
      
      toast({
        title: "Sync Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        success: false,
        clientId,
        syncType,
        recordsProcessed: 0,
        error: errorMessage
      };
      
    } finally {
      setSyncing(false);
    }
  };

  const syncAllClients = async (): Promise<SyncResult[]> => {
    setSyncing(true);
    
    try {
      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('client_id');
      
      if (clientsError || !clients) {
        throw new Error('Failed to fetch clients');
      }
      
      const results: SyncResult[] = [];
      
      // Sync each client
      for (const client of clients) {
        const result = await syncClient(client.client_id);
        results.push(result);
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
      
      toast({
        title: "Bulk Sync Complete",
        description: `Successfully synced ${successCount}/${clients.length} clients. Total records: ${totalRecords}`,
      });
      
      return results;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Bulk sync error:', error);
      
      toast({
        title: "Bulk Sync Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return [];
      
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncing,
    syncClient,
    syncAllClients
  };
};
