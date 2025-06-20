
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Activity, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  totalEvents: number;
  highSeverityEvents: number;
  uniqueIPs: number;
  recentEvents: number;
}

export const SecurityMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    highSeverityEvents: 0,
    uniqueIPs: 0,
    recentEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityMetrics();
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      // Get total events
      const { count: totalEvents } = await supabase
        .from('security_audit_log')
        .select('*', { count: 'exact', head: true });

      // Get high severity events
      const { count: highSeverityEvents } = await supabase
        .from('security_audit_log')
        .select('*', { count: 'exact', head: true })
        .in('event_type', ['auth_failed', 'suspicious_activity', 'rate_limit_exceeded']);

      // Get recent events (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { count: recentEvents } = await supabase
        .from('security_audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString());

      // Get unique IPs
      const { data: ipData } = await supabase
        .from('security_audit_log')
        .select('ip_address')
        .not('ip_address', 'is', null);

      const uniqueIPs = new Set(ipData?.map(row => row.ip_address)).size;

      setMetrics({
        totalEvents: totalEvents || 0,
        highSeverityEvents: highSeverityEvents || 0,
        uniqueIPs,
        recentEvents: recentEvents || 0
      });
    } catch (error) {
      console.error('Error fetching security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityStatus = () => {
    if (metrics.highSeverityEvents > 10) return { status: 'high', color: 'destructive', text: 'High Risk' };
    if (metrics.highSeverityEvents > 5) return { status: 'medium', color: 'secondary', text: 'Medium Risk' };
    return { status: 'low', color: 'default', text: 'Low Risk' };
  };

  const securityStatus = getSecurityStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading security metrics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <div className="text-sm text-gray-500">Total Events</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.highSeverityEvents}</div>
            <div className="text-sm text-gray-500">High Severity</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">{metrics.uniqueIPs}</div>
            <div className="text-sm text-gray-500">Unique IPs</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">{metrics.recentEvents}</div>
            <div className="text-sm text-gray-500">Recent (24h)</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="font-medium">Security Status:</span>
          </div>
          <Badge variant={securityStatus.color as any} className="flex items-center gap-1">
            {securityStatus.status === 'high' && <AlertTriangle className="h-3 w-3" />}
            {securityStatus.text}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
