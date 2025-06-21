
import { supabase } from '@/integrations/supabase/client';
import { SecureAPIClient } from '@/utils/secureApiClient';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {}

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: any;
}

export class AuthModel {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { error: authError, data } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (authError) {
        throw authError;
      }

      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'LOW',
        details: {
          success: true,
          method: 'email_password',
          email: credentials.email.substring(0, 3) + '***'
        }
      });

      return { success: true, user: data.user };
    } catch (error: any) {
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'MEDIUM',
        details: {
          success: false,
          method: 'email_password',
          email: credentials.email.substring(0, 3) + '***',
          error: error.message
        }
      });

      return { success: false, error: error.message || 'Login failed' };
    }
  }

  static async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const { error: authError, data } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) {
        throw authError;
      }

      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'LOW',
        details: {
          success: true,
          method: 'email_password_signup',
          email: credentials.email.substring(0, 3) + '***'
        }
      });

      return { success: true, user: data.user };
    } catch (error: any) {
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'MEDIUM',
        details: {
          success: false,
          method: 'email_password_signup',
          email: credentials.email.substring(0, 3) + '***',
          error: error.message
        }
      });

      return { success: false, error: error.message || 'Signup failed' };
    }
  }

  static async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign out failed' };
    }
  }
}
