import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'agent' | 'project_user' | 'va' | 'review_only' | 'qa_specialist' | 'recapture' | 'trainer';

interface RoleData {
  role: UserRole | null;
  accessibleProjects: string[];
  setterTeamLead: boolean;
}

// Module-level cache so every mounted useRole() shares a single set of
// requests per user instead of each component refetching role + projects.
let cachedUserId: string | null = null;
let cachedData: RoleData | null = null;
let inflight: Promise<RoleData> | null = null;

const loadRoleData = async (userId: string): Promise<RoleData> => {
  const [{ data: roleData, error: roleError }, { data: profile }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId).single(),
    supabase.from('profiles').select('is_setter_team_lead').eq('id', userId).maybeSingle(),
  ]);

  if (roleError && roleError.code !== 'PGRST116') {
    throw roleError;
  }

  const role = (roleData?.role as UserRole) || null;
  const setterTeamLead = !!(profile as any)?.is_setter_team_lead;
  let accessibleProjects: string[] = [];

  if (role === 'project_user' || role === 'qa_specialist' || role === 'review_only' || role === 'recapture') {
    const { data: projectAccess } = await supabase
      .from('project_user_access')
      .select('projects(project_name)')
      .eq('user_id', userId);
    accessibleProjects = (projectAccess || [])
      .map((access: any) => access.projects?.project_name)
      .filter(Boolean);
  } else if (role === 'admin' || role === 'agent' || role === 'va') {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('project_name')
      .eq('active', true);
    accessibleProjects = (allProjects || []).map((p) => p.project_name);
  }

  return { role, accessibleProjects, setterTeamLead };
};

const getRoleData = (userId: string): Promise<RoleData> => {
  if (cachedUserId === userId && cachedData) return Promise.resolve(cachedData);
  if (cachedUserId === userId && inflight) return inflight;
  cachedUserId = userId;
  cachedData = null;
  inflight = loadRoleData(userId)
    .then((data) => {
      if (cachedUserId === userId) cachedData = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

export const useRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(cachedData?.role ?? null);
  const [loading, setLoading] = useState(!cachedData);
  const [accessibleProjects, setAccessibleProjects] = useState<string[]>(cachedData?.accessibleProjects ?? []);
  const [setterTeamLead, setSetterTeamLead] = useState(cachedData?.setterTeamLead ?? false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      cachedUserId = null;
      cachedData = null;
      setRole(null);
      setAccessibleProjects([]);
      setSetterTeamLead(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getRoleData(user.id)
      .then((data) => {
        if (cancelled) return;
        setRole(data.role);
        setAccessibleProjects(data.accessibleProjects);
        setSetterTeamLead(data.setterTeamLead);
      })
      .catch((error) => {
        console.error('[useRole] Failed to load role data:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
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
  const isSetterTeamLead = () => setterTeamLead;
  // Full Trainee Review powers: leadership, trainers, and flagged Setter Team Leads
  const canReviewTrainees = () => hasRole(['admin', 'agent', 'trainer']) || setterTeamLead;

  return {
    role,
    loading: loading || authLoading,
    accessibleProjects,
    setterTeamLead,
    isSetterTeamLead,
    canReviewTrainees,
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