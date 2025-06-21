
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSecurityConfig } from '@/hooks/useSecurityConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const SessionTimeoutWarning: React.FC = () => {
  const { session, user } = useAuth();
  const { config } = useSecurityConfig();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!session || !config?.session_timeout || !user) return;

    const warningMinutes = config.session_timeout.warning_minutes || 5;
    const maxIdleMinutes = config.session_timeout.max_idle_minutes || 30;

    // Calculate session expiry time
    const sessionExpiry = new Date((session.expires_at || 0) * 1000);
    const warningTime = new Date(sessionExpiry.getTime() - (warningMinutes * 60 * 1000));

    const checkSessionTimeout = () => {
      const now = new Date();
      const timeUntilExpiry = sessionExpiry.getTime() - now.getTime();
      const timeUntilWarning = warningTime.getTime() - now.getTime();

      if (timeUntilExpiry <= 0) {
        // Session expired - force logout
        window.location.reload();
        return;
      }

      if (timeUntilWarning <= 0 && timeUntilExpiry > 0) {
        setShowWarning(true);
        setTimeLeft(Math.ceil(timeUntilExpiry / 1000 / 60)); // minutes
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkSessionTimeout();

    // Check every 30 seconds
    const interval = setInterval(checkSessionTimeout, 30000);

    return () => clearInterval(interval);
  }, [session, config, user]);

  const handleExtendSession = async () => {
    // Refresh the session by making a simple authenticated request
    try {
      await fetch('/api/extend-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  if (!showWarning || !user) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant="destructive" className="border-orange-500 bg-orange-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-medium">Session Expiring Soon</p>
            <p className="text-sm">Your session will expire in {timeLeft} minute{timeLeft !== 1 ? 's' : ''}.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExtendSession}
            className="ml-4 border-orange-500 text-orange-700 hover:bg-orange-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Extend
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
