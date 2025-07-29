import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectSession {
  projectName: string;
  sessionToken: string;
  expiresAt: string;
}

interface ProjectAuthContextType {
  session: ProjectSession | null;
  loading: boolean;
  signIn: (projectName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const ProjectAuthContext = createContext<ProjectAuthContextType | undefined>(undefined);

export const ProjectAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<ProjectSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session in localStorage
    const storedSession = localStorage.getItem('project_session');
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        // Check if session is still valid
        if (new Date(parsedSession.expiresAt) > new Date()) {
          setSession(parsedSession);
        } else {
          localStorage.removeItem('project_session');
        }
      } catch (error) {
        localStorage.removeItem('project_session');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (projectName: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('project-auth', {
        body: {
          action: 'login',
          projectName,
          password,
          ipAddress: null, // Could be enhanced to get real IP
          userAgent: navigator.userAgent
        }
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: "Invalid project or password",
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: "Invalid credentials" };
      }

      if (data?.sessionToken) {
        const newSession: ProjectSession = {
          projectName,
          sessionToken: data.sessionToken,
          expiresAt: data.expiresAt
        };
        
        setSession(newSession);
        localStorage.setItem('project_session', JSON.stringify(newSession));
        
        toast({
          title: "Login Successful",
          description: `Welcome to ${projectName}`,
        });
        
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: "Login failed" };
    } catch (error) {
      console.error('Project auth error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, error: "Login error" };
    }
  };

  const signOut = async () => {
    setSession(null);
    localStorage.removeItem('project_session');
    toast({
      title: "Signed Out",
      description: "You have been signed out of the project",
    });
  };

  const value = {
    session,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!session
  };

  return (
    <ProjectAuthContext.Provider value={value}>
      {children}
    </ProjectAuthContext.Provider>
  );
};

export const useProjectAuth = () => {
  const context = useContext(ProjectAuthContext);
  if (context === undefined) {
    throw new Error('useProjectAuth must be used within a ProjectAuthProvider');
  }
  return context;
};