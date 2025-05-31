
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { clientSheetConfigs } from '@/config/googleSheets';
import { CheckCircle, XCircle, Loader2, Wifi } from 'lucide-react';

interface TestResult {
  clientId: string;
  success: boolean;
  error?: string;
  sheetCount?: number;
  sheets?: string[];
  testing?: boolean;
}

const ConnectionTester = () => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testingAll, setTestingAll] = useState(false);

  const testSingleClient = async (clientId: string) => {
    const config = clientSheetConfigs[clientId];
    if (!config) return;

    setTestResults(prev => ({
      ...prev,
      [clientId]: { clientId, success: false, testing: true }
    }));

    try {
      const { data: response, error: functionError } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: config.spreadsheetId,
          clientId,
          action: 'testConnection',
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      setTestResults(prev => ({
        ...prev,
        [clientId]: {
          clientId,
          success: response.success,
          error: response.error,
          sheetCount: response.sheetCount,
          sheets: response.sheets,
          testing: false
        }
      }));

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [clientId]: {
          clientId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          testing: false
        }
      }));
    }
  };

  const testAllClients = async () => {
    setTestingAll(true);
    setTestResults({});
    
    const clientIds = Object.keys(clientSheetConfigs);
    
    // Test all clients in parallel
    await Promise.all(clientIds.map(clientId => testSingleClient(clientId)));
    
    setTestingAll(false);
  };

  const clientIds = Object.keys(clientSheetConfigs);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wifi className="h-5 w-5" />
          <span>Google Sheets Connection Test</span>
        </CardTitle>
        <CardDescription>
          Test connectivity to all client Google Sheets to verify permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={testAllClients} 
            disabled={testingAll}
            className="flex items-center space-x-2"
          >
            {testingAll && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Test All Clients</span>
          </Button>
          <span className="text-sm text-gray-500">
            This will test access to all {clientIds.length} client spreadsheets
          </span>
        </div>

        <div className="space-y-3">
          {clientIds.map(clientId => {
            const config = clientSheetConfigs[clientId];
            const result = testResults[clientId];
            
            return (
              <div key={clientId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{clientId}</span>
                    {result?.testing && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {result && !result.testing && (
                      result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {config.spreadsheetId}
                  </div>
                  {result && !result.testing && (
                    <div className="mt-2">
                      {result.success ? (
                        <div className="space-y-1">
                          <Badge variant="default" className="text-xs">
                            ✓ Connected - {result.sheetCount} tabs found
                          </Badge>
                          {result.sheets && result.sheets.length > 0 && (
                            <div className="text-xs text-gray-600">
                              Tabs: {result.sheets.slice(0, 3).join(', ')}
                              {result.sheets.length > 3 && ` +${result.sheets.length - 3} more`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          ✗ Failed: {result.error}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSingleClient(clientId)}
                  disabled={result?.testing || testingAll}
                >
                  Test
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionTester;
