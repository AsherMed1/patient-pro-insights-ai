
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calculator, RefreshCw } from 'lucide-react';

const SpeedToLeadTracker = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<{
    totalProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
  } | null>(null);
  const { toast } = useToast();

  const triggerCalculation = async () => {
    try {
      setIsCalculating(true);
      
      const response = await fetch('https://bhabbokbhnqioykjimix.supabase.co/functions/v1/speed-to-lead-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setLastCalculation(result.stats);
        toast({
          title: "Calculation Complete",
          description: `Processed ${result.stats.totalProcessed} leads. Created ${result.stats.recordsCreated} new records, updated ${result.stats.recordsUpdated} existing records.`,
        });
      } else {
        throw new Error(result.error || 'Failed to calculate speed-to-lead');
      }
    } catch (error) {
      console.error('Error calculating speed-to-lead:', error);
      toast({
        title: "Error",
        description: "Failed to calculate speed-to-lead statistics",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Speed to Lead Tracker</span>
          </CardTitle>
          <CardDescription>
            Calculate the time between when new leads enter the system and when they receive their first call
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h4 className="font-medium">How it works:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Matches leads from "New Leads" with calls from "All Calls"</li>
                <li>• Uses lead name for matching (case-insensitive)</li>
                <li>• Calculates time from lead creation to first call</li>
                <li>• Updates existing records and creates new ones</li>
              </ul>
            </div>
            
            <Button 
              onClick={triggerCalculation} 
              disabled={isCalculating}
              className="flex items-center space-x-2"
            >
              {isCalculating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              <span>{isCalculating ? 'Calculating...' : 'Calculate Speed to Lead'}</span>
            </Button>
          </div>

          {lastCalculation && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Last Calculation Results:</h4>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="flex items-center space-x-1">
                  <span className="text-xs">Processed:</span>
                  <span className="font-semibold">{lastCalculation.totalProcessed}</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span className="text-xs">Created:</span>
                  <span className="font-semibold">{lastCalculation.recordsCreated}</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span className="text-xs">Updated:</span>
                  <span className="font-semibold">{lastCalculation.recordsUpdated}</span>
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpeedToLeadTracker;
