
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnhancedAuthState {
  isAuthenticated: boolean;
  loading: boolean;
  sessionToken: string | null;
  error: string | null;
  rateLimited: boolean;
}

export const useEnhancedProjectPortalAuth = (projectName: string) => {
  const [authState, setAuthState] = useState<EnhancedAuthState>({
    isAuthenticated: false,
    loading: true,
    sessionToken: null,
    error: null,
    rateLimited: false
  });
  const { toast } = useToast();

  const login = async (password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Simple password check - in production you'd want proper hashing
      const { data: project } = await supabase
        .from('projects')
        .select('portal_password')
        .eq('project_name', projectName)
        .single();

      if (!project || project.portal_password !== password) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Invalid credentials' 
        }));
        return false;
      }

      const sessionToken = `session_${Date.now()}_${Math.random()}`;
      localStorage.setItem(`portal_session_${projectName}`, sessionToken);
      
      setAuthState({
        isAuthenticated: true,
        loading: false,
        sessionToken,
        error: null,
        rateLimited: false
      });

      toast({
        title: "Success",
        description: "Successfully authenticated to project portal",
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Authentication failed. Please try again.' 
      }));
      return false;
    }
  };

  const logout = async () => {
    localStorage.removeItem(`portal_session_${projectName}`);
    setAuthState({
      isAuthenticated: false,
      loading: false,
      sessionToken: null,
      error: null,
      rateLimited: false
    });

    toast({
      title: "Logged Out",
      description: "Successfully logged out of project portal",
    });
  };

  useEffect(() => {
    const checkExistingSession = () => {
      const savedToken = localStorage.getItem(`portal_session_${projectName}`);
      
      if (savedToken) {
        setAuthState({
          isAuthenticated: true,
          loading: false,
          sessionToken: savedToken,
          error: null,
          rateLimited: false
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    checkExistingSession();
  }, [projectName]);

  return {
    ...authState,
    login,
    logout,
    validateSession: async () => true
  };
};
