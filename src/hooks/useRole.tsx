import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'agent' | 'project_user' | 'va' | 'review_only' | 'qa_specialist' | 'recapture';

const MAX_ROLE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;

export const useRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessibleProjects, setAccessibleProjects] = useState<string[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Re-run the role lookup whenever the auth session lands or refreshes.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setRefreshTick((t) => t + 1);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setRole(null);
      setAccessibleProjects([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRole = async (attempt = 1) => {
      try {
        console.log('🔍 [useRole] Fetching role for user:', user.email, 'attempt', attempt);

        // Make sure a session is actually attached before querying; a freshly
        // issued session can lag behind the first render and the request would
        // otherwise go out as signed-out and return nothing.
        const { data: sessionData } = await supabase.auth.getSession();
        const hasSession = !!sessionData.session?.access_token;

        const { data: roleData, error: roleError } = hasSession
          ? await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .maybeSingle()
          : { data: null, error: null as any };

        if (cancelled) return;

        const userRole = (roleData?.role as UserRole) || null;

        // Retry on error, missing session, or an empty result — an empty result
        // this early usually means the request went out unauthenticated.
        if ((roleError || !hasSession || !userRole) && attempt < MAX_ROLE_ATTEMPTS) {
          console.log('⏳ [useRole] Role unresolved, retrying...', roleError?.code || (hasSession ? 'no-row' : 'no-session'));
          setTimeout(() => {
            if (!cancelled) fetchRole(attempt + 1);
          }, RETRY_DELAY_MS * attempt);
          return; // keep loading=true so the spinner stays up
        }

        if (roleError) {
          console.error('❌ [useRole] Persistent error fetching role:', roleError);
          setLoading(false);
          return;
        }

        console.log('✅ [useRole] Role resolved:', userRole);
        setRole(userRole);

        // If project_user, qa_specialist, or review_only, get accessible projects
        if (userRole === 'project_user' || userRole === 'qa_specialist' || userRole === 'review_only' || userRole === 'recapture') {
          console.log('👤 [useRole] Fetching project access for scoped user');
          const { data: projectAccess, error: projectError } = await supabase
            .from('project_user_access')
            .select('projects(project_name)')
            .eq('user_id', user.id);

          if (projectError) {
            console.error('❌ [useRole] Error fetching project access:', projectError);
            if (accessibleProjects.length === 0) {
              setAccessibleProjects([]);
            }
          } else {
            const projects = projectAccess?.map((access: any) => access.projects.project_name) || [];
            console.log('📁 [useRole] Accessible projects:', projects);
            setAccessibleProjects(projects);
          }
        } else if (userRole === 'admin' || userRole === 'agent' || userRole === 'va') {
          console.log('👑 [useRole] Fetching all projects for admin/agent/va');
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
        setLoading(false);
      } catch (error) {
        console.error('💥 [useRole] Unexpected error in fetchRole:', error);
        if (!cancelled && attempt < MAX_ROLE_ATTEMPTS) {
          setTimeout(() => {
            if (!cancelled) fetchRole(attempt + 1);
          }, RETRY_DELAY_MS * attempt);
          return;
        }
        setLoading(false);
      }
    };

    setLoading(true);
    fetchRole();

    return () => { cancelled = true; };
  }, [user, authLoading, refreshTick]);

  const hasRole = (requiredRole: UserRole | UserRole[]) => {
    if (!role) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    
    return role === requiredRole;
  };

  const hasProjectAccess = (projectName: string) => {
    if (!role) return false;
    
    // Admin, agents, and VAs have access to all projects
    if (role === 'admin' || role === 'agent' || role === 'va') return true;
    
    // Project users only have access to assigned projects
    return accessibleProjects.includes(projectName);
  };

  const isAdmin = () => hasRole('admin');
  const isAgent = () => hasRole('agent');
  const isProjectUser = () => hasRole('project_user');
  const isVA = () => hasRole('va');
  const isReviewOnly = () => hasRole('review_only');
  const isRecaptureRole = () => hasRole('recapture');
  const isQASpecialist = () => hasRole('qa_specialist');
  const hasManagementAccess = () => hasRole(['admin', 'agent']);
  const hasQAAccess = () => hasRole(['admin', 'agent', 'qa_specialist']);
  const hasRecaptureAccess = () => hasRole(['admin', 'agent', 'va', 'review_only', 'recapture']);
  const canEditNotes = () => hasRole(['admin', 'agent', 'va']);

  return {
    role,
    loading: loading || authLoading,
    accessibleProjects,
    hasRole,
    hasProjectAccess,
    isAdmin,
    isAgent,
    isProjectUser,
    isVA,
    isReviewOnly,
    isRecaptureRole,
    isQASpecialist,
    hasManagementAccess,
    hasQAAccess,
    hasRecaptureAccess,
    canEditNotes
  };
};