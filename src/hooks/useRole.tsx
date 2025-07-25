import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'agent' | 'project_user';

export const useRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessibleProjects, setAccessibleProjects] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setRole(null);
      setAccessibleProjects([]);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        // Get user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error fetching role:', roleError);
          setRole(null);
          setLoading(false);
          return;
        }

        const userRole = roleData?.role as UserRole || null;
        setRole(userRole);

        // If project_user, get accessible projects
        if (userRole === 'project_user') {
          const { data: projectAccess, error: projectError } = await supabase
            .from('project_user_access')
            .select('projects(project_name)')
            .eq('user_id', user.id);

          if (projectError) {
            console.error('Error fetching project access:', projectError);
            setAccessibleProjects([]);
          } else {
            setAccessibleProjects(
              projectAccess?.map((access: any) => access.projects.project_name) || []
            );
          }
        } else if (userRole === 'admin' || userRole === 'agent') {
          // Admin and agents have access to all projects
          const { data: allProjects, error: projectsError } = await supabase
            .from('projects')
            .select('project_name')
            .eq('active', true);

          if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            setAccessibleProjects([]);
          } else {
            setAccessibleProjects(allProjects?.map(p => p.project_name) || []);
          }
        }
      } catch (error) {
        console.error('Error in fetchRole:', error);
        setRole(null);
        setAccessibleProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, authLoading]);

  const hasRole = (requiredRole: UserRole | UserRole[]) => {
    if (!role) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    
    return role === requiredRole;
  };

  const hasProjectAccess = (projectName: string) => {
    if (!role) return false;
    
    // Admin and agents have access to all projects
    if (role === 'admin' || role === 'agent') return true;
    
    // Project users only have access to assigned projects
    return accessibleProjects.includes(projectName);
  };

  const isAdmin = () => hasRole('admin');
  const isAgent = () => hasRole('agent');
  const isProjectUser = () => hasRole('project_user');
  const hasManagementAccess = () => hasRole(['admin', 'agent']);

  return {
    role,
    loading: loading || authLoading,
    accessibleProjects,
    hasRole,
    hasProjectAccess,
    isAdmin,
    isAgent,
    isProjectUser,
    hasManagementAccess
  };
};