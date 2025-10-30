import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, CreditCard, Clock } from "lucide-react";

const InsuranceQueueTrigger = () => {
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [queueStats, setQueueStats] = useState({ pending: 0, processing: 0, failed: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchQueueStats = async () => {
    setLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from('insurance_fetch_queue')
        .select('status');

      if (error) throw error;

      const stats = {
        pending: data?.filter(item => item.status === 'pending').length || 0,
        processing: data?.filter(item => item.status === 'processing').length || 0,
        failed: data?.filter(item => item.status === 'failed').length || 0,
      };

      setQueueStats(stats);
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchQueueStats();
      
      // Set up realtime subscription for queue updates
      const channel = supabase
        .channel('insurance-queue-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'insurance_fetch_queue',
        }, fetchQueueStats)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const handleTriggerQueue = async () => {
    setProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('backfill-insurance-cards', {
        body: {
          process_queue: true,
          process_batch: true,
          batch_size: 20
        }
      });

      if (error) throw error;

      toast({
        title: "Queue Processing Started",
        description: data?.message || "Insurance cards are being fetched from the queue.",
      });

      // Refresh stats after a short delay
      setTimeout(fetchQueueStats, 2000);
    } catch (error) {
      console.error('Error triggering queue:', error);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process insurance queue",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Only render for admin users
  if (!isAdmin()) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Insurance Card Queue</span>
        </CardTitle>
        <CardDescription>
          Manually process pending insurance card fetches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span>Pending</span>
            </div>
            {loadingStats ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{queueStats.pending}</div>
            )}
          </div>
          
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground mb-1">
              <RefreshCw className="h-3 w-3" />
              <span>Processing</span>
            </div>
            {loadingStats ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">{queueStats.processing}</div>
            )}
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground mb-1">
              <span className="text-sm">Failed</span>
            </div>
            {loadingStats ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
            )}
          </div>
        </div>

        <Button 
          onClick={handleTriggerQueue} 
          disabled={processing || queueStats.pending === 0}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Queue...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Process Queue ({queueStats.pending} pending)
            </>
          )}
        </Button>

        {queueStats.pending === 0 && !processing && (
          <p className="text-sm text-muted-foreground text-center">
            No pending items in queue
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default InsuranceQueueTrigger;
