import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useProjectRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const checkAndRedirectUser = async () => {
      // Prevent multiple redirects and only run once per session
      if (!user || loading || isRedirecting || hasRedirected) return;

      try {
        setIsRedirecting(true);

        console.log('🔍 Checking user redirect for:', user.email);

        // Get user role with proper error handling
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError) {
          console.error('❌ Error fetching user role:', roleError);
          setHasRedirected(true); // Prevent retry
          return;
        }

        if (!userRole) {
          console.warn('⚠️ No role found for user');
          setHasRedirected(true);
          return;
        }

        console.log('👤 User role:', userRole.role);

        // Redirect based on user role
        if (userRole.role === 'admin' || userRole.role === 'agent') {
          console.log('🔄 Redirecting admin/agent to dashboard');
          navigate('/', { replace: true });
          setHasRedirected(true);
          return;
        }

        // Only handle project users
        if (userRole.role !== 'project_user') {
          console.log('ℹ️ User is not a project user, no redirect needed');
          setHasRedirected(true);
          return;
        }

        // Get user's assigned project
        const { data: projectAccess, error: accessError } = await supabase
          .from('project_user_access')
          .select(`
            projects!inner (
              id,
              project_name
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (accessError) {
          console.error('❌ Error fetching project access:', accessError);
          setHasRedirected(true);
          return;
        }

        if (!projectAccess?.projects) {
          console.warn('⚠️ No project access found for user');
          setHasRedirected(true);
          return;
        }

        const project = projectAccess.projects as any;
        console.log('🎯 Redirecting to project:', project.project_name);
        
        // Navigate to the project page
        navigate(`/project/${encodeURIComponent(project.project_name)}`, { replace: true });
        setHasRedirected(true);

      } catch (error) {
        console.error('❌ Error in project redirect:', error);
        setHasRedirected(true); // Prevent retry loops
      } finally {
        setIsRedirecting(false);
      }
    };

    checkAndRedirectUser();
  }, [user, loading, navigate, isRedirecting, hasRedirected]);

  return { isRedirecting };
};