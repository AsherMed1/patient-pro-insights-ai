import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export const SyncLeadDataButton = () => {
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    try {
      setLoading(true);
      setSynced(false);

      // Call the optimized sync function
      const { data, error } = await supabase.rpc('sync_lead_data_to_appointments', {
        batch_size: 100
      });

      if (error) {
        console.error('Sync error details:', error);
        throw error;
      }

      const syncedCount = data?.[0]?.total_updated || data || 0;

      toast({
        title: "Sync Completed",
        description: `Successfully synced data for ${syncedCount} appointment${syncedCount !== 1 ? 's' : ''}. DOB, insurance, and intake notes have been updated from matching leads.`,
      });

      setSynced(true);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Error syncing lead data:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sync lead data";
      toast({
        title: "Sync Failed",
        description: `${errorMessage}. This might be due to a large number of records. Please try again or contact support.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={loading || synced}
      variant={synced ? "outline" : "default"}
      size="sm"
      className="gap-2"
    >
      {synced ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Synced
        </>
      ) : (
        <>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Syncing...' : 'Sync Lead Data'}
        </>
      )}
    </Button>
  );
};
