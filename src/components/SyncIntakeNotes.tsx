import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';

export const SyncIntakeNotes = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setLoading(true);
    try {
      console.log('Starting intake notes sync...');
      const { data, error } = await supabase.functions.invoke('sync-intake-notes');
      
      if (error) {
        console.error('Sync error:', error);
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync intake notes",
          variant: "destructive",
        });
        return;
      }

      console.log('Sync result:', data);
      
      if (data?.success) {
        toast({
          title: "Sync Completed",
          description: `Successfully synced ${data.syncedCount} appointment records with intake notes`,
        });
      } else {
        toast({
          title: "Sync Issue",
          description: data?.error || "Unknown error occurred during sync",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error calling sync function:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing intake notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5" />
          <span>Sync Intake Notes</span>
        </CardTitle>
        <CardDescription>
          Sync patient intake notes from leads to appointments. This will copy intake notes from the leads table to matching appointment records that don't have notes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleSync} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Intake Notes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};