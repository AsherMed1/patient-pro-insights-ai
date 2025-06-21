
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Enhanced security logging
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to avoid potential deadlock
          setTimeout(() => {
            EnhancedSecurityLogger.logSecurityEvent({
              type: 'auth_attempt',
              severity: 'LOW',
              details: {
                success: true,
                event: event,
                userId: session.user.id,
                email: session.user.email,
                sessionExpires: session.expires_at
              }
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            EnhancedSecurityLogger.logSecurityEvent({
              type: 'auth_attempt',
              severity: 'LOW',
              details: {
                success: true,
                event: event,
                reason: 'user_logout'
              }
            });
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Log security event for failed sign out
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'MEDIUM',
        details: {
          success: false,
          event: 'SIGN_OUT_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
