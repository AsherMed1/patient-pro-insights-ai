import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react';
const BulkSyncPatientNotes = () => {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const {
    toast
  } = useToast();
  const handleBulkSync = async () => {
    setSyncing(true);
    setResults([]);
    try {
      const {
        data,
        error
      } = await supabase.rpc('bulk_sync_patient_intake_notes');
      if (error) {
        throw error;
      }
      setResults(data || []);
      toast({
        title: "Sync Complete",
        description: `Successfully synced patient intake notes for ${data?.length || 0} appointments.`
      });
    } catch (error) {
      console.error('Error syncing patient notes:', error);
      toast({
        title: "Error",
        description: "Failed to sync patient intake notes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };
  return;
};
export default BulkSyncPatientNotes;