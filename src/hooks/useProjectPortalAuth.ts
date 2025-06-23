
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
        // Hash the session password and compare with stored hash
        const hashedSessionPassword = await hashPassword(sessionPassword);
        if (hashedSessionPassword === project.portal_password) {
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

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyPassword = async (password: string) => {
    try {
      setLoading(true);
      setError('');
      
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

      const hashedPassword = await hashPassword(password);
      
      if (project.portal_password === hashedPassword) {
        // Store the plaintext password in session storage for this session
        const sessionKey = `project_portal_${decodedProjectName}`;
        sessionStorage.setItem(sessionKey, password);
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
