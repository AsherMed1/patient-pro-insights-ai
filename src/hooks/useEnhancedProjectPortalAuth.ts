
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

  // Enhanced session validation with IP tracking
  const validateSession = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_secure_session', {
        project_name_param: projectName,
        session_token_param: token,
        ip_address_param: null // Browser can't reliably get client IP
      });

      if (error) {
        console.error('Session validation error:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  };

  // Enhanced login with rate limiting and security logging
  const login = async (password: string): Promise<boolean> => {
    if (authState.rateLimited) {
      toast({
        title: "Rate Limited",
        description: "Too many login attempts. Please try again later.",
        variant: "destructive",
      });
      return false;
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Log security event
      await supabase.rpc('log_security_event', {
        event_type_param: 'portal_login_attempt',
        details_param: { project: projectName }
      });

      const { data, error } = await supabase.rpc('create_secure_portal_session', {
        project_name_param: projectName,
        password_param: password,
        ip_address_param: null,
        user_agent_param: navigator.userAgent
      });

      if (error || !data) {
        // Check if it's a rate limiting error
        if (error?.message?.includes('rate_limit')) {
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Too many attempts. Please try again later.',
            rateLimited: true 
          }));
          
          // Reset rate limit after 15 minutes
          setTimeout(() => {
            setAuthState(prev => ({ ...prev, rateLimited: false }));
          }, 15 * 60 * 1000);
          
          return false;
        }

        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Invalid credentials or project not found' 
        }));
        return false;
      }

      const sessionToken = data as string;
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

    // Log security event
    await supabase.rpc('log_security_event', {
      event_type_param: 'portal_logout',
      details_param: { project: projectName }
    });

    toast({
      title: "Logged Out",
      description: "Successfully logged out of project portal",
    });
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedToken = localStorage.getItem(`portal_session_${projectName}`);
      
      if (!savedToken) {
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }

      const isValid = await validateSession(savedToken);
      
      if (isValid) {
        setAuthState({
          isAuthenticated: true,
          loading: false,
          sessionToken: savedToken,
          error: null,
          rateLimited: false
        });
      } else {
        localStorage.removeItem(`portal_session_${projectName}`);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    checkExistingSession();
  }, [projectName]);

  return {
    ...authState,
    login,
    logout,
    validateSession
  };
};
