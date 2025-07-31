import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, CheckCircle } from 'lucide-react';

const BulkSyncPatientNotes = () => {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleBulkSync = async () => {
    setSyncing(true);
    setResults([]);
    
    try {
      const { data, error } = await supabase.rpc('bulk_sync_patient_intake_notes');
      
      if (error) {
        throw error;
      }

      setResults(data || []);
      
      toast({
        title: "Sync Complete",
        description: `Successfully synced patient intake notes for ${data?.length || 0} appointments.`,
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

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <RotateCcw className="h-5 w-5 mr-2" />
        Sync Patient Intake Notes
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Automatically copy patient intake notes from leads to their associated appointments. 
        This will update all appointments that are missing patient intake notes but have matching leads with notes.
      </p>
      
      <Button onClick={handleBulkSync} disabled={syncing} className="mb-4">
        {syncing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4 mr-2" />
            Sync All Patient Notes
          </>
        )}
      </Button>

      {results.length > 0 && (
        <div className="mt-4 p-3 bg-white border border-green-300 rounded">
          <h4 className="font-medium text-green-800 mb-2 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Sync Results ({results.length} appointments updated)
          </h4>
          <div className="max-h-32 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="text-sm text-gray-700 py-1">
                ✓ {result.lead_name} - {result.project_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkSyncPatientNotes;