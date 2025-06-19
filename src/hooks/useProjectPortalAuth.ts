
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useProjectPortalAuth = (projectName: string) => {
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
        return;
      }

      // Check if password has been provided in session storage
      const sessionKey = `project_portal_${decodedProjectName}`;
      const sessionPassword = sessionStorage.getItem(sessionKey);
      
      if (sessionPassword) {
        // Use the new bcrypt verification function
        const { data: isValid, error: verifyError } = await supabase
          .rpc('verify_password', {
            password: sessionPassword,
            hash: project.portal_password
          });

        if (verifyError) {
          console.error('Error verifying password:', verifyError);
          sessionStorage.removeItem(sessionKey);
          setIsAuthenticated(false);
        } else if (isValid) {
          setIsAuthenticated(true);
        } else {
          // Remove invalid session password
          sessionStorage.removeItem(sessionKey);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
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

      // Sanitize input
      const sanitizedPassword = password.trim();
      
      const decodedProjectName = decodeURIComponent(projectName);
      
      const { data: project, error } = await supabase
        .from('projects')
        .select('portal_password')
        .eq('project_name', decodedProjectName)
        .single();

      if (error) {
        setError('Failed to verify password. Please try again.');
        return false;
      }

      // Use the new bcrypt verification function
      const { data: isValid, error: verifyError } = await supabase
        .rpc('verify_password', {
          password: sanitizedPassword,
          hash: project.portal_password
        });

      if (verifyError) {
        console.error('Error verifying password:', verifyError);
        setError('Failed to verify password. Please try again.');
        return false;
      }

      if (isValid) {
        // Store the plaintext password in session storage for this session
        const sessionKey = `project_portal_${decodedProjectName}`;
        sessionStorage.setItem(sessionKey, sanitizedPassword);
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

  return {
    isAuthenticated,
    loading,
    error,
    verifyPassword
  };
};
