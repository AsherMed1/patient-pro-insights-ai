
import { useAuth } from './useAuth';
import { securityLogger } from '@/utils/enhancedSecurityLogger';
import { useState, useEffect } from 'react';

export const useSecureAuth = () => {
  const auth = useAuth();
  const [securityFlags, setSecurityFlags] = useState({
    isSecure: true,
    lastActivity: Date.now(),
    sessionValid: true
  });

  // Monitor authentication security
  useEffect(() => {
    if (auth.user) {
      // Log successful authentication
      securityLogger.logAuthAttempt(true, {
        user_id: auth.user.id,
        email: auth.user.email
      });

      // Update security flags
      setSecurityFlags(prev => ({
        ...prev,
        lastActivity: Date.now(),
        sessionValid: true
      }));
    }
  }, [auth.user]);

  // Enhanced sign out with security logging
  const secureSignOut = async () => {
    try {
      securityLogger.logSecurityEvent('user_logout', {
        user_id: auth.user?.id,
        session_duration: Date.now() - securityFlags.lastActivity
      });
      
      await auth.signOut();
      
      setSecurityFlags({
        isSecure: true,
        lastActivity: Date.now(),
        sessionValid: false
      });
    } catch (error) {
      console.error('Secure sign out failed:', error);
      securityLogger.logSuspiciousActivity('signout_failure', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Validate current session security
  const validateSession = (): boolean => {
    const timeSinceActivity = Date.now() - securityFlags.lastActivity;
    const maxInactivity = 8 * 60 * 60 * 1000; // 8 hours

    if (timeSinceActivity > maxInactivity) {
      securityLogger.logSuspiciousActivity('session_timeout', {
        inactive_duration: timeSinceActivity,
        user_id: auth.user?.id
      });
      setSecurityFlags(prev => ({ ...prev, sessionValid: false }));
      return false;
    }

    return true;
  };

  // Update activity timestamp
  const updateActivity = () => {
    setSecurityFlags(prev => ({
      ...prev,
      lastActivity: Date.now()
    }));
  };

  return {
    ...auth,
    secureSignOut,
    validateSession,
    updateActivity,
    securityFlags
  };
};
