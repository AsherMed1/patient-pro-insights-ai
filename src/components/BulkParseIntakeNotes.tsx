import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, CheckCircle, XCircle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ParseResult {
  success: boolean;
  totalProcessed: number;
  totalErrors: number;
  message: string;
}

export const BulkParseIntakeNotes = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const { toast } = useToast();

  const handleBulkParse = async () => {
    try {
      setIsParsing(true);
      setResult(null);

      toast({
        title: "Parsing Started",
        description: "AI is now parsing all intake notes. This may take several minutes...",
      });

      const { data, error } = await supabase.functions.invoke('bulk-parse-all-intake-notes');

      if (error) {
        throw error;
      }

      setResult(data);
      
      if (data.success) {
        toast({
          title: "Parsing Complete!",
          description: `Successfully parsed ${data.totalProcessed} records with ${data.totalErrors} errors`,
        });
      } else {
        toast({
          title: "Parsing Failed",
          description: data.error || "Failed to parse intake notes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error parsing intake notes:', error);
      toast({
        title: "Error",
        description: "Failed to parse intake notes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-amber-600" />
          <span>Bulk Parse Medical Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Parse all patient intake notes using AI to extract structured medical information including pathology, symptoms, imaging, and PCP details.
        </p>
        
        <Button 
          onClick={handleBulkParse} 
          disabled={isParsing}
          className="w-full"
        >
          {isParsing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing in Progress...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Parse All Intake Notes
            </>
          )}
        </Button>

        {isParsing && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4 animate-pulse" />
              <span>Processing intake notes with AI...</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Results:</span>
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Processed:</span>
                <span className="font-medium">{result.totalProcessed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errors:</span>
                <span className={result.totalErrors > 0 ? "font-medium text-red-600" : "font-medium text-green-600"}>
                  {result.totalErrors}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground pt-2">
              {result.message}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <p><strong>Note:</strong> This will parse all appointments and leads with patient intake notes.</p>
          <p>Extracted information includes: Pathology type, Duration, Pain Level, Symptoms, Treatments, Imaging details, PCP information, and more.</p>
        </div>
      </CardContent>
    </Card>
  );
};