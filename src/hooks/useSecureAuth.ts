
import { useAuth } from './useAuth';
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
      console.log('Auth attempt successful for user:', auth.user.email);

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
      console.log('User logout initiated');
      
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

  // Validate current session security
  const validateSession = (): boolean => {
    const timeSinceActivity = Date.now() - securityFlags.lastActivity;
    const maxInactivity = 8 * 60 * 60 * 1000; // 8 hours

    if (timeSinceActivity > maxInactivity) {
      console.warn('Session timeout detected');
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
