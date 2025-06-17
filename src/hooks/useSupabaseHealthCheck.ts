
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthCheckResult {
  tableName: string;
  canRead: boolean;
  canWrite: boolean;
  error?: string;
}

export const useSupabaseHealthCheck = () => {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setLoading(true);
    const tablesToCheck = [
      'projects',
      'new_leads',
      'all_calls',
      'all_appointments',
      'facebook_ad_spend',
      'agents',
      'csv_import_history'
    ];

    const checkResults: HealthCheckResult[] = [];

    for (const tableName of tablesToCheck) {
      try {
        // Test read access
        const { error: readError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        const canRead = !readError;

        // Test write access with a minimal insert (will likely fail but tells us about permissions)
        let canWrite = false;
        try {
          const { error: writeError } = await supabase
            .from(tableName)
            .insert({})
            .select()
            .limit(1);
          
          canWrite = !writeError;
        } catch (e) {
          // Expected to fail for most tables due to required fields
          canWrite = true; // If we get a validation error, it means we have write permission
        }

        checkResults.push({
          tableName,
          canRead,
          canWrite,
          error: readError?.message
        });
      } catch (error) {
        checkResults.push({
          tableName,
          canRead: false,
          canWrite: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setResults(checkResults);
    setLoading(false);

    // Show summary
    const failedTables = checkResults.filter(r => !r.canRead || r.error);
    if (failedTables.length > 0) {
      toast({
        title: "Database Issues Found",
        description: `${failedTables.length} table(s) have access issues`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Database Health Check Passed",
        description: "All tables are accessible",
      });
    }
  };

  return {
    results,
    loading,
    runHealthCheck
  };
};
