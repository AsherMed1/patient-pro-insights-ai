import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useProjectRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkAndRedirectUser = async () => {
      if (!user || loading || isRedirecting || hasChecked) return;

      try {
        setIsRedirecting(true);
        setHasChecked(true);

        // Get user role
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError || !userRole) {
          console.error('Error fetching user role:', roleError);
          setIsRedirecting(false);
          return;
        }

        // Redirect based on user role
        if (userRole.role === 'admin' || userRole.role === 'agent') {
          // Redirect admin/agent users to main dashboard
          navigate('/', { replace: true });
          return;
        }

        // Only redirect project users to their specific project
        if (userRole.role !== 'project_user') {
          setIsRedirecting(false);
          return;
        }

        // Get user's assigned project
        const { data: projectAccess, error: accessError } = await supabase
          .from('project_user_access')
          .select(`
            projects (
              id,
              project_name
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (accessError || !projectAccess) {
          console.error('Error fetching project access:', accessError);
          setIsRedirecting(false);
          return;
        }

        const project = projectAccess.projects as any;
        if (project) {
          // Redirect to project portal using the correct route structure
          navigate(`/project/${encodeURIComponent(project.project_name)}`, { replace: true });
        }
      } catch (error) {
        console.error('Error in project redirect:', error);
      } finally {
        setIsRedirecting(false);
      }
    };

    checkAndRedirectUser();
  }, [user, loading, navigate, isRedirecting, hasChecked]);

  return { isRedirecting };
};