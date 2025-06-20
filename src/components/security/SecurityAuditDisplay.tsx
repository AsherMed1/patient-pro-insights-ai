
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: string;
  user_agent: string;
  details: any;
  created_at: string;
}

export const SecurityAuditDisplay: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventSeverity = (eventType: string) => {
    const highSeverity = ['auth_failed', 'suspicious_activity', 'rate_limit_exceeded'];
    const mediumSeverity = ['invalid_access', 'session_expired'];
    
    if (highSeverity.includes(eventType)) return 'high';
    if (mediumSeverity.includes(eventType)) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading security events...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No security events recorded
            </div>
          ) : (
            events.map((event) => {
              const severity = getEventSeverity(event.event_type);
              return (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{event.event_type}</span>
                      <Badge variant={getSeverityColor(severity) as any}>
                        {severity}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    IP: {event.ip_address || 'Unknown'} | 
                    User Agent: {event.user_agent ? event.user_agent.substring(0, 50) + '...' : 'Unknown'}
                  </div>
                  
                  {event.details && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(showDetails === event.id ? null : event.id)}
                        className="h-6 text-xs"
                      >
                        {showDetails === event.id ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Show Details
                          </>
                        )}
                      </Button>
                      
                      {showDetails === event.id && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <pre>{JSON.stringify(event.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
