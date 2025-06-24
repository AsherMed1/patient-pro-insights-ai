
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Key, Copy, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyInfo {
  name: string;
  value: string | null;
  status: 'active' | 'missing' | 'error';
  description: string;
}

const ApiKeysDisplay = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleKeyVisibility = (keyName: string) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const copyToClipboard = (value: string, keyName: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied!",
      description: `${keyName} copied to clipboard`,
    });
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      
      // Test Google Sheets API by calling the edge function
      const { data: googleSheetsTest, error: googleError } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'testConnection',
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Google's sample sheet
          clientId: 'test'
        },
      });

      const keys: ApiKeyInfo[] = [
        {
          name: 'Google Sheets API Key',
          value: googleError ? null : 'API Key is configured and working',
          status: googleError ? 'error' : 'active',
          description: 'Used for Google Sheets integration - fetching sheet data and metadata'
        },
        {
          name: 'Facebook Ads API',
          value: 'Webhook-based integration (no API key required)',
          status: 'active',
          description: 'Receives data via POST webhook to facebook-ad-spend-api endpoint'
        },
        {
          name: 'GoHighLevel API Key',
          value: 'Stored per-project in projects table (ghl_api_key column)',
          status: 'active',
          description: 'CRM integration - API keys stored individually for each project'
        }
      ];

      setApiKeys(keys);

    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Error",
        description: "Failed to fetch API key information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'missing':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Key className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'missing':
        return <Badge variant="destructive">Missing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>API Keys Configuration</span>
          </CardTitle>
          <CardDescription>Loading API key information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span>Fetching API keys...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>API Keys Configuration</span>
        </CardTitle>
        <CardDescription>
          Current API integrations and their status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={fetchApiKeys} variant="outline" size="sm">
          Refresh Status
        </Button>
        
        <div className="space-y-4">
          {apiKeys.map((apiKey, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(apiKey.status)}
                  <span className="font-medium">{apiKey.name}</span>
                </div>
                {getStatusBadge(apiKey.status)}
              </div>
              
              <p className="text-sm text-gray-600">{apiKey.description}</p>
              
              {apiKey.value && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-2 bg-gray-50 rounded border font-mono text-sm">
                      {visibleKeys[apiKey.name] ? apiKey.value : maskKey(apiKey.value)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.name)}
                    >
                      {visibleKeys[apiKey.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {apiKey.value !== 'Webhook-based integration (no API key required)' && 
                     apiKey.value !== 'Stored per-project in projects table (ghl_api_key column)' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey.value!, apiKey.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Integration Details:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Google Sheets:</strong> API key stored in Supabase secrets as GOOGLE_API_KEY</li>
            <li>• <strong>Facebook Ads:</strong> Uses webhook endpoint (no API key needed)</li>
            <li>• <strong>GoHighLevel:</strong> API keys stored per-project in database</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeysDisplay;
