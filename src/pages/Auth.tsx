
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, UserPlus, Eye, EyeOff, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EnhancedSecurityValidator } from '@/utils/securityEnhancedValidator';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';
import { useCSRFProtection } from '@/hooks/useCSRFProtection';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Honeypot field for spam detection
  const navigate = useNavigate();
  const { toast } = useToast();
  const { csrfToken, getCSRFHeaders } = useCSRFProtection();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (isSignUp: boolean) => {
    // Check honeypot field (should be empty)
    if (honeypot) {
      EnhancedSecurityLogger.logSuspiciousActivity('honeypot_filled', { honeypot });
      setError('Security validation failed');
      return false;
    }

    // Rate limiting check
    const clientId = `auth_${Date.now()}`;
    if (EnhancedSecurityValidator.isRateLimited(clientId, 5, 900000)) { // 5 attempts per 15 minutes
      EnhancedSecurityLogger.logRateLimitExceeded(clientId, 'auth_attempt');
      setError('Too many attempts. Please wait before trying again.');
      return false;
    }

    // Enhanced email validation
    const emailValidation = EnhancedSecurityValidator.validateAndSanitize(email, 'email');
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email');
      return false;
    }

    // Enhanced password validation
    const passwordValidation = EnhancedSecurityValidator.validateAndSanitize(password, 'password');
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Invalid password');
      return false;
    }

    if (isSignUp) {
      // Enhanced name validation
      const nameValidation = EnhancedSecurityValidator.validateAndSanitize(fullName, 'name');
      if (!nameValidation.isValid) {
        setError(nameValidation.error || 'Invalid name');
        return false;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }

      // Additional password strength check for signup
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return false;
      }

      // Check for basic password complexity
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        setError('Password must contain uppercase, lowercase, and numeric characters');
        return false;
      }
    }

    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm(false)) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        let errorMessage = 'Authentication failed';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait before trying again.';
        }
        
        setError(errorMessage);
        EnhancedSecurityLogger.logAuthAttempt(false, email, error.message);
      } else {
        toast({
          title: "Success",
          description: "Signed in successfully!",
        });
        EnhancedSecurityLogger.logAuthAttempt(true, email);
        navigate('/');
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      EnhancedSecurityLogger.logAuthAttempt(false, email, errorMessage);
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm(true)) return;

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      if (error) {
        let errorMessage = 'Registration failed';
        
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password does not meet security requirements.';
        }
        
        setError(errorMessage);
        EnhancedSecurityLogger.logAuthAttempt(false, email, error.message);
      } else {
        setMessage('Please check your email for a confirmation link to complete your registration.');
        toast({
          title: "Registration Successful",
          description: "Please check your email to confirm your account.",
        });
        EnhancedSecurityLogger.logAuthAttempt(true, email);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      EnhancedSecurityLogger.logAuthAttempt(false, email, errorMessage);
      console.error('Sign up error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setError('');
    setMessage('');
    setHoneypot('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Call Center Analytics
            </CardTitle>
          </div>
          <CardDescription>
            Secure access to your comprehensive tracking and management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full" onValueChange={resetForm}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Honeypot field - hidden from users */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />
                
                <input type="hidden" name="csrf_token" value={csrfToken} />
                
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      maxLength={128}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </div>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Honeypot field - hidden from users */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />
                
                <input type="hidden" name="csrf_token" value={csrfToken} />

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password (min 8 chars, mixed case, numbers)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      maxLength={128}
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Sign Up</span>
                    </div>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
