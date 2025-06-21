
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true,
  redirectTo = '/auth'
}) => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    const checkAuth = () => {
      const isAuthenticated = !!(user && session);
      
      if (requireAuth && !isAuthenticated) {
        // Log unauthorized access attempt
        EnhancedSecurityLogger.logSecurityEvent({
          type: 'auth_attempt',
          severity: 'MEDIUM',
          details: {
            success: false,
            reason: 'unauthorized_access_attempt',
            path: location.pathname,
            timestamp: new Date().toISOString()
          }
        });
        
        navigate(redirectTo, { 
          replace: true, 
          state: { from: location.pathname } 
        });
        return;
      }

      if (!requireAuth && isAuthenticated) {
        // User is authenticated but accessing auth page
        navigate('/', { replace: true });
        return;
      }

      setHasChecked(true);
    };

    checkAuth();
  }, [user, session, loading, navigate, location, requireAuth, redirectTo]);

  // Show loading state while checking authentication
  if (loading || !hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
};
