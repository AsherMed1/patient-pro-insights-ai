
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Database, Loader2, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SyncLog {
  id: string;
  client_id: string;
  sync_type: string;
  status: string;
  records_processed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

interface Client {
  client_id: string;
  name: string;
  gohighlevel_api_key: string;
}

const DataSyncManager = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchRecentSyncLogs();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id, name, gohighlevel_api_key')
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchRecentSyncLogs = async () => {
    try {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      running: 'secondary',
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* GoHighLevel Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>GoHighLevel Integration</span>
          </CardTitle>
          <CardDescription>
            Data synchronization is now handled directly through GoHighLevel API integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Direct API Integration</h4>
            <p className="text-sm text-blue-800">
              Your data is now automatically synchronized through GoHighLevel's API. 
              No manual sync required - all leads, appointments, and campaign data 
              flows directly into the system in real-time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Client Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Client API Configuration</CardTitle>
          <CardDescription>Manage GoHighLevel API keys for each client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div key={client.client_id} className="border rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-medium">{client.name}</h4>
                  <p className="text-xs text-gray-500">{client.client_id}</p>
                  <p className="text-xs text-gray-400">
                    API Key: {client.gohighlevel_api_key ? '*********************' + client.gohighlevel_api_key.slice(-4) : 'Not configured'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {client.gohighlevel_api_key ? (
                    <Badge variant="default" className="text-xs">Connected</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Not Connected</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest system activity and status</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading activity history...</span>
            </div>
          ) : syncLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{log.client_id}</span>
                        {getStatusBadge(log.status)}
                        <Badge variant="outline" className="text-xs">
                          {log.sync_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(log.started_at)}
                        {log.records_processed > 0 && (
                          <span className="ml-2">• {log.records_processed} records</span>
                        )}
                      </div>
                      {log.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataSyncManager;
