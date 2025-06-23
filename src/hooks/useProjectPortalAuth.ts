
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useProjectPortalAuth = (projectName: string) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

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
      
      if (sessionPassword === project.portal_password) {
        setIsAuthenticated(true);
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

      if (project.portal_password === password) {
        // Store password in session storage
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
