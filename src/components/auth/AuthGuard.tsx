import { useAuth } from '@/hooks/useAuth';
import { useRole, UserRole } from '@/hooks/useRole';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  projectName?: string;
  fallbackPath?: string;
}

export const AuthGuard = ({ 
  children, 
  requiredRole, 
  projectName, 
  fallbackPath = '/auth' 
}: AuthGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, hasRole, hasProjectAccess } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Redirect to auth if not authenticated
    if (!user) {
      navigate(fallbackPath, { 
        state: { from: location.pathname } 
      });
      return;
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
      navigate('/', { replace: true });
      return;
    }

    // Check project access requirement
    if (projectName && !hasProjectAccess(projectName)) {
      navigate('/', { replace: true });
      return;
    }
  }, [
    user, 
    role, 
    authLoading, 
    roleLoading, 
    requiredRole, 
    projectName, 
    hasRole, 
    hasProjectAccess, 
    navigate, 
    location.pathname, 
    fallbackPath
  ]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return null;
  }

  if (projectName && !hasProjectAccess(projectName)) {
    return null;
  }

  return <>{children}</>;
};