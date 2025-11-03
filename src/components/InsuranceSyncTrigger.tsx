import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Loader2 } from 'lucide-react';

export const InsuranceSyncTrigger = () => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log('Starting insurance data sync from leads to appointments...');
      
      const { data, error } = await supabase.functions.invoke('sync-intake-notes');
      
      if (error) {
        console.error('Sync error:', error);
        throw error;
      }
      
      console.log('Sync completed:', data);
      
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.syncedCount || 0} appointment records with intake notes and ${data.leadDataSyncedCount || 0} with lead data (including insurance IDs).`,
      });
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Failed to sync insurance data:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync insurance data from leads",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {syncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Sync Insurance Data
        </>
      )}
    </Button>
  );
};
