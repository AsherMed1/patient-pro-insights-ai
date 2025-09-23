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
        console.log('🔍 [useRole] Fetching role for user:', user.email, 'ID:', user.id);
        
        // Get user role with improved error handling
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        // Handle 406 errors and other temporary issues more gracefully
        if (roleError) {
          console.log('🚨 [useRole] Role fetch error:', roleError.code, roleError.message);
          
          // If it's a temporary error (like 406) and we don't have role data yet, retry after delay
          if (roleError.code === 'PGRST301' || roleError.message?.includes('406')) {
            console.log('⏳ [useRole] Temporary error detected, retrying in 1 second...');
            // Set loading to false to prevent infinite loading, then retry
            setLoading(false);
            setTimeout(() => {
              if (user) { // Only retry if user is still authenticated
                setLoading(true);
                fetchRole();
              }
            }, 1000);
            return;
          }
          
          // For "no rows" error, continue with null role
          if (roleError.code !== 'PGRST116') {
            console.error('❌ [useRole] Persistent error fetching role:', roleError);
            // Don't clear role state immediately on errors - preserve existing data
            if (!role) {
              setRole(null);
            }
            setLoading(false);
            return;
          }
        }

        const userRole = roleData?.role as UserRole || null;
        console.log('✅ [useRole] Role fetched successfully:', userRole);
        setRole(userRole);

        // If project_user, get accessible projects
        if (userRole === 'project_user') {
          console.log('👤 [useRole] Fetching project access for project user');
          const { data: projectAccess, error: projectError } = await supabase
            .from('project_user_access')
            .select('projects(project_name)')
            .eq('user_id', user.id);

          if (projectError) {
            console.error('❌ [useRole] Error fetching project access:', projectError);
            // Don't clear existing accessible projects on error
            if (accessibleProjects.length === 0) {
              setAccessibleProjects([]);
            }
          } else {
            const projects = projectAccess?.map((access: any) => access.projects.project_name) || [];
            console.log('📁 [useRole] Accessible projects:', projects);
            setAccessibleProjects(projects);
          }
        } else if (userRole === 'admin' || userRole === 'agent') {
          console.log('👑 [useRole] Fetching all projects for admin/agent');
          // Admin and agents have access to all projects
          const { data: allProjects, error: projectsError } = await supabase
            .from('projects')
            .select('project_name')
            .eq('active', true);

          if (projectsError) {
            console.error('❌ [useRole] Error fetching projects:', projectsError);
            // Don't clear existing accessible projects on error
            if (accessibleProjects.length === 0) {
              setAccessibleProjects([]);
            }
          } else {
            const projects = allProjects?.map(p => p.project_name) || [];
            console.log('📁 [useRole] All accessible projects:', projects);
            setAccessibleProjects(projects);
          }
        }
      } catch (error) {
        console.error('💥 [useRole] Unexpected error in fetchRole:', error);
        // On unexpected errors, preserve existing state if possible
        if (!role) {
          setRole(null);
        }
        if (accessibleProjects.length === 0) {
          setAccessibleProjects([]);
        }
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