import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

export const BulkParseAllIntakeNotes = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleBulkParse = async () => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      toast({
        title: "Processing Started",
        description: "Bulk parsing all patient intake notes...",
      });

      // Simulate progress during processing
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 2000);

      const { data, error } = await supabase.functions.invoke('bulk-parse-all-intake-notes');

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw error;
      }

      setResult(data);
      
      toast({
        title: "Bulk Processing Complete!",
        description: `Successfully parsed ${data.totalProcessed} records with ${data.totalErrors} errors.`,
      });

    } catch (error) {
      console.error('Bulk parsing error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process intake notes",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          Bulk Parse All Intake Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Process all existing patient intake notes to extract structured information (insurance, pathology, contact details, etc.) and display them on appointment cards.
        </p>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              Processing... {progress}%
            </p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 p-3 rounded-md border border-green-200">
            <h4 className="font-medium text-green-800">Processing Complete!</h4>
            <div className="text-sm text-green-700 mt-1">
              <p>✅ Successfully processed: {result.totalProcessed} records</p>
              {result.totalErrors > 0 && (
                <p>❌ Errors: {result.totalErrors} records</p>
              )}
            </div>
          </div>
        )}

        <Button 
          onClick={handleBulkParse}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing All Records...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Parse All Existing Notes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};