
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: string;
  user_agent: string;
  details: any;
  created_at: string;
}

export const SecurityMonitor = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [rateLimitEvents, setRateLimitEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSecurityData();
    }
  }, [user]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent security events
      const { data: auditData, error: auditError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditError) {
        console.error('Error fetching audit log:', auditError);
      } else {
        setSecurityEvents(auditData || []);
      }

      // Fetch rate limit data
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('rate_limit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (rateLimitError) {
        console.error('Error fetching rate limit data:', rateLimitError);
      } else {
        setRateLimitEvents(rateLimitData || []);
      }

    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSecurityData();
    setRefreshing(false);
  };

  const cleanupSecurityTables = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_security_tables');
      
      if (error) {
        console.error('Error cleaning up security tables:', error);
      } else {
        console.log(`Cleaned up ${data} old records`);
        await fetchSecurityData(); // Refresh data
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'rate_limit_exceeded':
      case 'invalid_input':
      case 'portal_auth_failed':
      case 'session_ip_mismatch':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'portal_auth_success':
      case 'call_record_created':
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getEventSeverity = (eventType: string): 'default' | 'secondary' | 'destructive' => {
    const highSeverity = ['rate_limit_exceeded', 'invalid_input', 'portal_auth_failed', 'session_ip_mismatch'];
    const lowSeverity = ['portal_auth_success', 'call_record_created'];
    
    if (highSeverity.includes(eventType)) return 'destructive';
    if (lowSeverity.includes(eventType)) return 'secondary';
    return 'default';
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p>Please log in to view security monitoring data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security Monitor</span>
            </CardTitle>
            <CardDescription>
              Monitor security events, rate limiting, and suspicious activities
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupSecurityTables}
            >
              Cleanup Old Records
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="events">Security Events</TabsTrigger>
            <TabsTrigger value="ratelimit">Rate Limiting</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Loading security events...</div>
            ) : securityEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No security events found</div>
            ) : (
              <div className="space-y-2">
                {securityEvents.map((event) => (
                  <Card key={event.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getEventIcon(event.event_type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {formatEventType(event.event_type)}
                            </span>
                            <Badge variant={getEventSeverity(event.event_type)}>
                              {event.event_type}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>IP: {event.ip_address || 'Unknown'}</div>
                            {event.details && (
                              <div className="mt-1">
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(event.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ratelimit" className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Loading rate limit data...</div>
            ) : rateLimitEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No rate limit events found</div>
            ) : (
              <div className="space-y-2">
                {rateLimitEvents.map((event) => (
                  <Card key={event.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{event.action_type}</div>
                        <div className="text-sm text-gray-600">
                          Identifier: {event.identifier}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Count: {event.count}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
