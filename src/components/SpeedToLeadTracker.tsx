import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calculator, RefreshCw, AlertCircle } from 'lucide-react';
interface SpeedToLeadTrackerProps {
  onCalculationComplete?: () => void;
}
const SpeedToLeadTracker = ({
  onCalculationComplete
}: SpeedToLeadTrackerProps) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<{
    totalProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
  } | null>(null);
  const {
    toast
  } = useToast();
  const triggerCalculation = async () => {
    try {
      setIsCalculating(true);
      const response = await fetch('https://bhabbokbhnqioykjimix.supabase.co/functions/v1/speed-to-lead-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setLastCalculation(result.stats);
        toast({
          title: "Calculation Complete",
          description: `Processed ${result.stats.totalProcessed} leads. Created ${result.stats.recordsCreated} new records, updated ${result.stats.recordsUpdated} existing records.`
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
        description: "Failed to calculate speed-to-lead statistics",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };
  return <Card>
      
      
    </Card>;
};
export default SpeedToLeadTracker;