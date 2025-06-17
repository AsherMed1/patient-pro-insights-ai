
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSupabaseHealthCheck } from '@/hooks/useSupabaseHealthCheck';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const SupabaseDebugPanel = () => {
  const { results, loading, runHealthCheck } = useSupabaseHealthCheck();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Supabase Health Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runHealthCheck} disabled={loading}>
          {loading ? 'Checking...' : 'Run Health Check'}
        </Button>
        
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Results:</h3>
            {results.map((result) => (
              <div key={result.tableName} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">{result.tableName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={result.canRead ? "default" : "destructive"}>
                    {result.canRead ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Read OK
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Read Failed
                      </>
                    )}
                  </Badge>
                  {result.error && (
                    <span className="text-sm text-red-600">{result.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h4 className="font-semibold mb-2">Common Supabase Deployment Issues:</h4>
          <ul className="text-sm space-y-1">
            <li>• Missing Row Level Security (RLS) policies</li>
            <li>• Incorrect foreign key references to auth.users</li>
            <li>• Check constraints that reference time functions</li>
            <li>• Missing database functions or triggers</li>
            <li>• Edge functions missing required secrets</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
