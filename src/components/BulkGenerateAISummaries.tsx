import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface GenerationResult {
  id: string;
  lead_name: string;
  status: 'success' | 'error';
  error?: string;
}

interface BulkResult {
  success: boolean;
  message: string;
  summary: {
    total: number;
    successful: number;
    errors: number;
  };
  results: GenerationResult[];
}

export const BulkGenerateAISummaries = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const { toast } = useToast();

  const handleBulkGenerate = async () => {
    try {
      setIsGenerating(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke('generate-missing-ai-summaries');

      if (error) {
        throw error;
      }

      setResult(data);
      
      if (data.success) {
        toast({
          title: "AI Summary Generation Complete",
          description: `Generated ${data.summary.successful} AI summaries successfully`,
        });
      } else {
        toast({
          title: "Generation Failed",
          description: data.error || "Failed to generate AI summaries",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating AI summaries:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI summaries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5" />
          <span>Bulk Generate AI Summaries</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Generate AI summaries for all appointments that have patient intake notes but are missing AI summaries.
        </p>
        
        <Button 
          onClick={handleBulkGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating AI Summaries...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Missing AI Summaries
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium text-blue-900">Generation Summary</h3>
              <p className="text-sm text-blue-700 mt-1">{result.message}</p>
              <div className="flex space-x-4 mt-2 text-sm">
                <span className="text-green-600">✓ Successful: {result.summary.successful}</span>
                <span className="text-red-600">✗ Errors: {result.summary.errors}</span>
                <span className="text-gray-600">Total: {result.summary.total}</span>
              </div>
            </div>

            {result.results && result.results.length > 0 && (
              <div className="max-h-64 overflow-y-auto">
                <h4 className="font-medium mb-2">Detailed Results:</h4>
                <div className="space-y-2">
                  {result.results.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{item.lead_name}</span>
                      {item.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="flex items-center space-x-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          {item.error && (
                            <span className="text-xs text-red-600" title={item.error}>
                              Error
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};