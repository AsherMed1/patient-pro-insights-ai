
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
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';
import { Shield, Loader2 } from 'lucide-react';
import { ThreatDetectionMonitor } from '@/components/security/ThreatDetectionMonitor';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';

interface LoadingState {
  securityData: boolean;
  threatMonitoring: boolean;
  userProfile: boolean;
}

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    securityData: true,
    threatMonitoring: true,
    userProfile: true
  });

  // Secure form hooks for login and signup with delays
  const loginForm = useSecureForm({
    formType: 'login',
    requireCSRF: true,
    rateLimitKey: 'auth_login',
    submissionDelay: 1000
  });

  const signupForm = useSecureForm({
    formType: 'signup',
    requireCSRF: true,
    rateLimitKey: 'auth_signup',
    submissionDelay: 1500
  });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Sequential API loading effect
  useEffect(() => {
    if (!user) return;

    const loadApisSequentially = async () => {
      try {
        // Load security data first
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoadingStates(prev => ({ ...prev, securityData: false }));

        // Load threat monitoring data
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoadingStates(prev => ({ ...prev, threatMonitoring: false }));

        // Load user profile data
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLoadingStates(prev => ({ ...prev, userProfile: false }));

      } catch (error) {
        console.error('Error loading auth page data:', error);
      }
    };

    loadApisSequentially();
  }, [user]);

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

  const LoadingSkeleton = ({ title, description }: { title: string; description: string }) => (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Security Dashboard Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Security Dashboard</h2>
            {loadingStates.securityData ? (
              <LoadingSkeleton 
                title="Loading Security Data..." 
                description="Fetching security metrics and audit logs"
              />
            ) : (
              <SecurityDashboard />
            )}
          </div>

          {/* Threat Detection Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Threat Monitoring</h2>
            {loadingStates.threatMonitoring ? (
              <LoadingSkeleton 
                title="Loading Threat Detection..." 
                description="Initializing real-time security monitoring"
              />
            ) : (
              <ThreatDetectionMonitor />
            )}
          </div>

          {/* User Profile Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
            {loadingStates.userProfile ? (
              <LoadingSkeleton 
                title="Loading Profile Data..." 
                description="Fetching user profile and preferences"
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>User Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>User ID:</strong> {user.id}</p>
                    <p><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
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
                {loginForm.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  'Sign In Securely'
                )}
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
                {signupForm.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </div>
                ) : (
                  'Create Secure Account'
                )}
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
