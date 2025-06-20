
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';

export const useSecureAuth = () => {
  const auth = useAuth();
  const [securityFlags, setSecurityFlags] = useState({
    isSecure: true,
    lastActivity: Date.now(),
    sessionValid: true
  });

  useEffect(() => {
    if (auth.user) {
      setSecurityFlags(prev => ({
        ...prev,
        lastActivity: Date.now(),
        sessionValid: true
      }));
    }
  }, [auth.user]);

  const secureSignOut = async () => {
    try {
      await auth.signOut();
      setSecurityFlags({
        isSecure: true,
        lastActivity: Date.now(),
        sessionValid: false
      });
    } catch (error) {
      console.error('Secure sign out failed:', error);
    }
  };

  const validateSession = (): boolean => {
    const timeSinceActivity = Date.now() - securityFlags.lastActivity;
    const maxInactivity = 8 * 60 * 60 * 1000; // 8 hours

    if (timeSinceActivity > maxInactivity) {
      setSecurityFlags(prev => ({ ...prev, sessionValid: false }));
      return false;
    }

    return true;
  };

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
