
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DeviceFingerprintManager } from '@/utils/deviceFingerprinting';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

interface EnhancedAuthState {
  isSecureSession: boolean;
  sessionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  deviceTrusted: boolean;
  lastSecurityCheck: Date | null;
}

export const useEnhancedAuth = () => {
  const { user, session, signOut } = useAuth();
  const [enhancedState, setEnhancedState] = useState<EnhancedAuthState>({
    isSecureSession: false,
    sessionRisk: 'LOW',
    deviceTrusted: true,
    lastSecurityCheck: null
  });

  useEffect(() => {
    if (!session || !user) {
      setEnhancedState({
        isSecureSession: false,
        sessionRisk: 'HIGH',
        deviceTrusted: false,
        lastSecurityCheck: new Date()
      });
      return;
    }

    const performSecurityCheck = () => {
      const currentFingerprint = DeviceFingerprintManager.generateFingerprint();
      const storedFingerprint = DeviceFingerprintManager.getStoredFingerprint();
      
      let sessionRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      let deviceTrusted = true;
      
      if (storedFingerprint) {
        const validation = DeviceFingerprintManager.validateSession(currentFingerprint, storedFingerprint);
        sessionRisk = validation.riskLevel;
        deviceTrusted = validation.isValid;
        
        if (sessionRisk === 'HIGH') {
          EnhancedSecurityLogger.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'HIGH',
            details: {
              reason: 'device_fingerprint_mismatch',
              changedComponents: validation.changedComponents,
              userId: user.id
            }
          });
        }
      }
      
      // Check session validity
      const now = Date.now();
      const sessionExpiry = (session.expires_at || 0) * 1000;
      const isSessionValid = sessionExpiry > now;
      
      // Session expires in less than 15 minutes - medium risk
      if (sessionExpiry - now < 15 * 60 * 1000) {
        sessionRisk = sessionRisk === 'HIGH' ? 'HIGH' : 'MEDIUM';
      }
      
      setEnhancedState({
        isSecureSession: isSessionValid && deviceTrusted,
        sessionRisk,
        deviceTrusted,
        lastSecurityCheck: new Date()
      });
    };

    // Initial check
    performSecurityCheck();
    
    // Periodic security checks
    const interval = setInterval(performSecurityCheck, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [session, user]);

  const forceSecureSignOut = async () => {
    try {
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'MEDIUM',
        details: {
          reason: 'security_forced_signout',
          userId: user?.id
        }
      });
      
      await signOut();
    } catch (error) {
      console.error('Secure sign out failed:', error);
    }
  };

  return {
    ...enhancedState,
    user,
    session,
    signOut: forceSecureSignOut
  };
};
