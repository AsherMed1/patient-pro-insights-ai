
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSecureProjectPortalAuth = (projectName: string) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkProjectAccess();
  }, [projectName]);

  const checkProjectAccess = async () => {
    try {
      setLoading(true);
      const decodedProjectName = decodeURIComponent(projectName);
      
      // Check if session token exists
      const sessionKey = `project_portal_session_${decodedProjectName}`;
      const sessionToken = sessionStorage.getItem(sessionKey);
      
      if (sessionToken) {
        // Verify session with server
        const { data: isValid, error: verifyError } = await supabase
          .rpc('verify_portal_session', {
            project_name_param: decodedProjectName,
            session_token_param: sessionToken
          });

        if (verifyError) {
          console.error('Error verifying session:', verifyError);
          sessionStorage.removeItem(sessionKey);
          setIsAuthenticated(false);
        } else if (isValid) {
          setIsAuthenticated(true);
        } else {
          // Remove invalid session token
          sessionStorage.removeItem(sessionKey);
          setIsAuthenticated(false);
        }
      } else {
        // Check if project requires password
        const { data: project, error } = await supabase
          .from('projects')
          .select('portal_password')
          .eq('project_name', decodedProjectName)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
          setIsAuthenticated(false);
          return;
        }

        // If no password is set, allow access
        if (!project.portal_password) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error checking project access:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = async (password: string) => {
    try {
      setLoading(true);
      setError('');
      
      // Basic password validation
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return false;
      }

      const sanitizedPassword = password.trim();
      const decodedProjectName = decodeURIComponent(projectName);
      
      // Get user's IP and user agent for session security
      const userAgent = navigator.userAgent;
      
      // Create secure session using server function
      const { data: sessionToken, error: sessionError } = await supabase
        .rpc('create_portal_session', {
          project_name_param: decodedProjectName,
          password_param: sanitizedPassword,
          user_agent_param: userAgent
        });

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        setError('Failed to verify password. Please try again.');
        return false;
      }

      if (sessionToken) {
        // Store secure session token
        const sessionKey = `project_portal_session_${decodedProjectName}`;
        sessionStorage.setItem(sessionKey, sessionToken);
        setIsAuthenticated(true);
        return true;
      } else {
        setError('Incorrect password. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setError('Failed to verify password. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    const decodedProjectName = decodeURIComponent(projectName);
    const sessionKey = `project_portal_session_${decodedProjectName}`;
    sessionStorage.removeItem(sessionKey);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    loading,
    error,
    verifyPassword,
    signOut
  };
};
