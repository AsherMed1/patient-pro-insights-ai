
import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

interface SecurityContextType {
  logSecurityEvent: typeof EnhancedSecurityLogger.logSecurityEvent;
  isSecureSession: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { user, session } = useAuth();

  useEffect(() => {
    // Log session events
    if (user) {
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'LOW',
        details: {
          success: true,
          sessionId: session?.access_token?.substring(0, 10) + '***'
        }
      });
    }
  }, [user, session]);

  const value = {
    logSecurityEvent: EnhancedSecurityLogger.logSecurityEvent,
    isSecureSession: !!session && Date.now() < (session.expires_at || 0) * 1000
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
