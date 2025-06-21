
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

interface ThreatAlert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
}

export const ThreatDetectionMonitor: React.FC = () => {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);

  useEffect(() => {
    // Simulate threat detection monitoring
    const interval = setInterval(() => {
      if (isMonitoring) {
        // Check for suspicious activities
        checkForThreats();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const checkForThreats = () => {
    // Simulate threat detection logic
    const randomCheck = Math.random();
    
    if (randomCheck < 0.1) { // 10% chance of detecting something
      const newAlert: ThreatAlert = {
        id: Date.now().toString(),
        type: 'Suspicious Activity',
        severity: 'MEDIUM',
        message: 'Multiple failed login attempts detected',
        timestamp: new Date()
      };
      
      setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
      
      EnhancedSecurityLogger.logSuspiciousActivity('Multiple failed logins', {
        alertId: newAlert.id,
        timestamp: newAlert.timestamp
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-blue-600 border-blue-600';
      case 'MEDIUM': return 'text-yellow-600 border-yellow-600';
      case 'HIGH': return 'text-orange-600 border-orange-600';
      case 'CRITICAL': return 'text-red-600 border-red-600';
      default: return 'text-gray-600 border-gray-600';
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Threat Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm font-medium">
                {isMonitoring ? 'Active Monitoring' : 'Monitoring Paused'}
              </span>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Shield className="h-3 w-3 mr-1" />
              Protected
            </Badge>
          </div>

          {alerts.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Recent Security Alerts</h4>
              {alerts.map((alert) => (
                <Alert key={alert.id} className="border-l-4 border-l-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{alert.type}</span>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No security threats detected</p>
              <p className="text-xs text-gray-500 mt-1">Your account is secure</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
