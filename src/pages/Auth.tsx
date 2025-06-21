
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSecureForm } from '@/hooks/useSecureForm';
import { SecureInput } from '@/components/SecureInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';
import { Shield } from 'lucide-react';

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Secure form hooks for login and signup
  const loginForm = useSecureForm({
    formType: 'login',
    requireCSRF: true,
    rateLimitKey: 'auth_login'
  });

  const signupForm = useSecureForm({
    formType: 'signup',
    requireCSRF: true,
    rateLimitKey: 'auth_signup'
  });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      setError('');
      setMessage('');

      const email = loginForm.fields.email?.value || '';
      const password = loginForm.fields.password?.value || '';

      // Validate fields
      const emailValidation = loginForm.validateField('email', email, 'email');
      const passwordValidation = loginForm.validateField('password', password, 'password');

      if (!emailValidation.isValid || !passwordValidation.isValid) {
        setError('Please fix the validation errors above');
        return;
      }

      await loginForm.submitForm(async () => {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: emailValidation.sanitizedValue!,
          password
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
            email: email.substring(0, 3) + '***'
          }
        });
        
        navigate('/');
      });

    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
      
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'MEDIUM',
        details: {
          success: false,
          method: 'email_password',
          email: loginForm.fields.email?.value ? loginForm.fields.email.value.substring(0, 3) + '***' : undefined,
          error: error.message
        }
      });
    }
  };

  const handleSignup = async () => {
    try {
      setError('');
      setMessage('');

      const email = signupForm.fields.email?.value || '';
      const password = signupForm.fields.password?.value || '';

      // Validate fields
      const emailValidation = signupForm.validateField('email', email, 'email');
      const passwordValidation = signupForm.validateField('password', password, 'password');

      if (!emailValidation.isValid || !passwordValidation.isValid) {
        setError('Please fix the validation errors above');
        return;
      }

      await signupForm.submitForm(async () => {
        const { error: authError } = await supabase.auth.signUp({
          email: emailValidation.sanitizedValue!,
          password,
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
            email: email.substring(0, 3) + '***'
          }
        });
        
        setMessage('Please check your email to confirm your account');
      });

    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Signup failed');
      
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'MEDIUM',
        details: {
          success: false,
          method: 'email_password_signup',
          email: signupForm.fields.email?.value ? signupForm.fields.email.value.substring(0, 3) + '***' : undefined,
          error: error.message
        }
      });
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Secure Access</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <SecureInput
                label="Email"
                type="email"
                {...loginForm.getFieldProps('email')}
                placeholder="Enter your email"
                required
                showSecurityIndicator
              />
              
              <SecureInput
                label="Password"
                type="password"
                {...loginForm.getFieldProps('password')}
                placeholder="Enter your password"
                required
                showSecurityIndicator
              />

              <Button 
                onClick={handleLogin} 
                disabled={loginForm.isSubmitting}
                className="w-full"
              >
                {loginForm.isSubmitting ? 'Signing In...' : 'Sign In Securely'}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <SecureInput
                label="Email"
                type="email"
                {...signupForm.getFieldProps('email')}
                placeholder="Enter your email"
                required
                showSecurityIndicator
              />
              
              <SecureInput
                label="Password"
                type="password"
                {...signupForm.getFieldProps('password')}
                placeholder="Create a strong password (min 8 characters)"
                required
                showSecurityIndicator
              />

              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Password Requirements:</span>
                </div>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include numbers and special characters</li>
                  <li>Avoid common passwords</li>
                </ul>
              </div>

              <Button 
                onClick={handleSignup} 
                disabled={signupForm.isSubmitting}
                className="w-full"
              >
                {signupForm.isSubmitting ? 'Creating Account...' : 'Create Secure Account'}
              </Button>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 text-green-600" />
              <span>Protected by enhanced security</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
