
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calculator, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface SpeedToLeadTrackerProps {
  onCalculationComplete?: () => void;
}

const SpeedToLeadTracker = ({ onCalculationComplete }: SpeedToLeadTrackerProps) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<{
    totalProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    leadsWithoutCalls?: number;
  } | null>(null);
  const { toast } = useToast();

  const triggerCalculation = async () => {
    try {
      setIsCalculating(true);
      console.log('Triggering speed-to-lead calculation...');
      
      const response = await fetch('https://bhabbokbhnqioykjimix.supabase.co/functions/v1/speed-to-lead-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      console.log('Calculation result:', result);

      if (response.ok && result.success) {
        setLastCalculation(result.stats);
        
        const { totalProcessed, recordsCreated, recordsUpdated, leadsWithoutCalls } = result.stats;
        
        toast({
          title: "Calculation Complete",
          description: `Processed ${totalProcessed} leads. Created ${recordsCreated}, updated ${recordsUpdated}. ${leadsWithoutCalls || 0} leads had no calls.`
        });

        // Call the callback to refresh the data
        if (onCalculationComplete) {
          onCalculationComplete();
        }
      } else {
        throw new Error(result.error || 'Failed to calculate speed-to-lead');
      }
    } catch (error) {
      console.error('Error calculating speed-to-lead:', error);
      toast({
        title: "Error",
        description: "Failed to calculate speed-to-lead statistics. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Speed to Lead Calculator
        </CardTitle>
        <CardDescription>
          Calculate speed-to-lead times by matching new leads with their first call times
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={triggerCalculation} 
            disabled={isCalculating}
            className="flex items-center gap-2"
          >
            {isCalculating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {isCalculating ? 'Calculating...' : 'Calculate Speed to Lead'}
          </Button>
          
          {lastCalculation && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                {lastCalculation.totalProcessed} processed
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-blue-600" />
                {lastCalculation.recordsCreated} created
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-orange-600" />
                {lastCalculation.recordsUpdated} updated
              </Badge>
              {lastCalculation.leadsWithoutCalls && lastCalculation.leadsWithoutCalls > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-600" />
                  {lastCalculation.leadsWithoutCalls} no calls
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Process:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Fetches all leads from the new_leads table</li>
            <li>Matches each lead with their first call from all_calls table</li>
            <li>Calculates time difference between lead creation and first call</li>
            <li>Creates or updates records in speed_to_lead_stats table</li>
          </ul>
          
          {lastCalculation && lastCalculation.leadsWithoutCalls && lastCalculation.leadsWithoutCalls > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Note:</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                {lastCalculation.leadsWithoutCalls} leads don't have matching calls in the system. 
                Check that lead names match between the new_leads and all_calls tables.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeedToLeadTracker;
