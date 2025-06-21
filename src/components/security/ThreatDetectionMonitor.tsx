
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Eye, Activity } from 'lucide-react';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

interface ThreatEvent {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  details: string;
  blocked: boolean;
}

export const ThreatDetectionMonitor: React.FC = () => {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsMonitoring(true);
      
      // Simulate some threat detection for demo purposes
      const mockThreats: ThreatEvent[] = [
        {
          id: '1',
          type: 'Rate Limit Exceeded',
          severity: 'MEDIUM',
          timestamp: new Date(Date.now() - 300000),
          details: 'Multiple failed login attempts detected',
          blocked: true
        },
        {
          id: '2',
          type: 'Suspicious Input',
          severity: 'HIGH',
          timestamp: new Date(Date.now() - 600000),
          details: 'Potential XSS attempt in form field',
          blocked: true
        }
      ];
      
      setThreats(mockThreats);
    }
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Eye className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (!isMonitoring || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 w-96 max-h-96 overflow-y-auto z-50">
      <Card className="bg-white shadow-lg border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-green-600" />
            Threat Detection Monitor
            <Badge variant="outline" className="ml-auto">
              Dev Mode
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {threats.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
              No threats detected
            </div>
          ) : (
            threats.map((threat) => (
              <Alert key={threat.id} className="p-2">
                <div className="flex items-start gap-2">
                  <div className={`p-1 rounded ${getSeverityColor(threat.severity)} text-white`}>
                    {getSeverityIcon(threat.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs">{threat.type}</span>
                      <Badge 
                        variant={threat.blocked ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {threat.blocked ? 'Blocked' : 'Allowed'}
                      </Badge>
                    </div>
                    <AlertDescription className="text-xs text-gray-600">
                      {threat.details}
                    </AlertDescription>
                    <div className="text-xs text-gray-400 mt-1">
                      {threat.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </Alert>
            ))
          )}
          
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Real-time monitoring active</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
