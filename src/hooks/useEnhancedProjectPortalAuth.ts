
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  isAuthenticated: boolean | null;
  loading: boolean;
  error: string;
  attempts: number;
  isLocked: boolean;
}

export const useEnhancedProjectPortalAuth = (projectName: string) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: null,
    loading: true,
    error: '',
    attempts: 0,
    isLocked: false
  });

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  useEffect(() => {
    checkProjectAccess();
  }, [projectName]);

  const getClientIP = async (): Promise<string> => {
    try {
      // In production, you might want to use a service to get the real IP
      // For now, we'll use a fallback approach
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const checkLockoutStatus = (): boolean => {
    const lockoutKey = `portal_lockout_${projectName}`;
    const lockoutData = localStorage.getItem(lockoutKey);
    
    if (lockoutData) {
      const { timestamp, attempts } = JSON.parse(lockoutData);
      const now = Date.now();
      
      if (attempts >= MAX_ATTEMPTS && (now - timestamp) < LOCKOUT_DURATION) {
        return true;
      } else if ((now - timestamp) >= LOCKOUT_DURATION) {
        // Reset lockout after duration
        localStorage.removeItem(lockoutKey);
        return false;
      }
    }
    
    return false;
  };

  const updateLockoutStatus = (attempts: number): void => {
    const lockoutKey = `portal_lockout_${projectName}`;
    localStorage.setItem(lockoutKey, JSON.stringify({
      timestamp: Date.now(),
      attempts
    }));
  };

  const checkProjectAccess = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: '' }));
      
      // Check if user is locked out
      if (checkLockoutStatus()) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          isLocked: true,
          error: 'Too many failed attempts. Please try again later.'
        }));
        return;
      }

      const decodedProjectName = decodeURIComponent(projectName);
      const sessionKey = `project_portal_session_${decodedProjectName}`;
      const sessionToken = sessionStorage.getItem(sessionKey);
      
      if (sessionToken) {
        const clientIP = await getClientIP();
        
        // Verify session with enhanced security
        const { data: isValid, error: verifyError } = await supabase
          .rpc('verify_secure_portal_session', {
            project_name_param: decodedProjectName,
            session_token_param: sessionToken,
            ip_address_param: clientIP
          });

        if (verifyError) {
          console.error('Error verifying session:', verifyError);
          sessionStorage.removeItem(sessionKey);
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            error: 'Session verification failed'
          }));
        } else if (isValid) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            loading: false,
            error: ''
          }));
        } else {
          sessionStorage.removeItem(sessionKey);
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            error: 'Invalid session'
          }));
        }
      } else {
        // Check if project requires password
        const { data: project, error } = await supabase
          .from('projects')
          .select('portal_password, active')
          .eq('project_name', decodedProjectName)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            error: 'Project not found'
          }));
          return;
        }

        if (!project.active) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            error: 'Project is not active'
          }));
          return;
        }

        // If no password is set, allow access
        if (!project.portal_password) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            loading: false,
            error: ''
          }));
        } else {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            loading: false,
            error: ''
          }));
        }
      }
    } catch (error) {
      console.error('Error checking project access:', error);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        loading: false,
        error: 'Failed to check project access'
      }));
    }
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: '' }));
      
      // Check if locked out
      if (checkLockoutStatus()) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          isLocked: true,
          error: 'Too many failed attempts. Please try again later.'
        }));
        return false;
      }

      // Input validation
      if (!password || password.length < 6 || password.length > 100) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Password must be between 6 and 100 characters.'
        }));
        return false;
      }

      // Sanitize password (basic cleaning, but preserve special characters)
      const sanitizedPassword = password.trim();
      const decodedProjectName = decodeURIComponent(projectName);
      
      // Get client info for enhanced security
      const clientIP = await getClientIP();
      const userAgent = navigator.userAgent;
      
      // Create secure session using enhanced function
      const { data: sessionToken, error: sessionError } = await supabase
        .rpc('create_secure_portal_session', {
          project_name_param: decodedProjectName,
          password_param: sanitizedPassword,
          ip_address_param: clientIP,
          user_agent_param: userAgent
        });

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        
        const newAttempts = authState.attempts + 1;
        updateLockoutStatus(newAttempts);
        
        setAuthState(prev => ({
          ...prev,
          loading: false,
          attempts: newAttempts,
          isLocked: newAttempts >= MAX_ATTEMPTS,
          error: newAttempts >= MAX_ATTEMPTS 
            ? 'Too many failed attempts. Account locked for 15 minutes.'
            : 'Failed to verify password. Please try again.'
        }));
        return false;
      }

      if (sessionToken) {
        // Store secure session token
        const sessionKey = `project_portal_session_${decodedProjectName}`;
        sessionStorage.setItem(sessionKey, sessionToken);
        
        // Reset attempts on successful login
        localStorage.removeItem(`portal_lockout_${projectName}`);
        
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          loading: false,
          error: '',
          attempts: 0,
          isLocked: false
        }));
        return true;
      } else {
        const newAttempts = authState.attempts + 1;
        updateLockoutStatus(newAttempts);
        
        setAuthState(prev => ({
          ...prev,
          loading: false,
          attempts: newAttempts,
          isLocked: newAttempts >= MAX_ATTEMPTS,
          error: newAttempts >= MAX_ATTEMPTS 
            ? 'Too many failed attempts. Account locked for 15 minutes.'
            : 'Incorrect password. Please try again.'
        }));
        return false;
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to verify password. Please try again.'
      }));
      return false;
    }
  };

  const signOut = () => {
    const decodedProjectName = decodeURIComponent(projectName);
    const sessionKey = `project_portal_session_${decodedProjectName}`;
    sessionStorage.removeItem(sessionKey);
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false,
      error: '',
      attempts: 0,
      isLocked: false
    }));
  };

  return {
    ...authState,
    verifyPassword,
    signOut,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - authState.attempts)
  };
};
