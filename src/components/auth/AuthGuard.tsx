import { useAuth } from '@/hooks/useAuth';
import { useRole, UserRole } from '@/hooks/useRole';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { role, loading: roleLoading, hasRole, hasProjectAccess, accessibleProjects } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Extended wait for role loading to prevent race conditions
    if (authLoading || roleLoading) return;

    // Redirect to auth if not authenticated
    if (!user) {
      navigate(fallbackPath, { 
        state: { from: location.pathname } 
      });
      return;
    }

    // Check if user must change password (but not if already on settings page)
    if (user.user_metadata?.must_change_password && location.pathname !== '/settings') {
      toast({
        title: "Password Change Required",
        description: "Please change your password to continue",
        variant: "destructive",
      });
      navigate('/settings?forcePasswordChange=true', { replace: true });
      return;
    }

    // For project access checks, be more patient and allow for loading states
    if (projectName) {
      const decodedProjectName = decodeURIComponent(projectName);
      
      // If we have role data but no accessible projects yet, wait a bit longer
      if (role === 'project_user' && accessibleProjects.length === 0) {
        console.log('🕐 [AuthGuard] Waiting for project access data to load...');
        return;
      }
      
      // Only check project access after we have complete data
      if (role && !hasProjectAccess(decodedProjectName)) {
        console.log('❌ [AuthGuard] No access to project:', decodedProjectName);
        navigate('/', { replace: true });
        return;
      }
    }

    // Check role requirement (but be more lenient for project users)
    if (requiredRole && role && !hasRole(requiredRole)) {
      console.log('❌ [AuthGuard] Role check failed. Required:', requiredRole, 'Current:', role);
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
    accessibleProjects,
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

  // More patient checking for role requirements
  if (requiredRole && role && !hasRole(requiredRole)) {
    return null;
  }

  // More patient checking for project access
  if (projectName) {
    const decodedProjectName = decodeURIComponent(projectName);
    
    // If we're still loading project data for a project user, keep waiting
    if (role === 'project_user' && accessibleProjects.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    // Only block access if we have complete data and no access
    if (role && !hasProjectAccess(decodedProjectName)) {
      return null;
    }
  }

  return <>{children}</>;
};