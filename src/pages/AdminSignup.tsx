import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminSignup = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (adminKey !== 'ADMIN_SIGNUP_KEY_2024') {
      toast.error('Invalid admin registration key');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) {
        toast.error(authError.message);
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        // Add admin role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'admin'
          });

        if (roleError) {
          console.error('Error adding admin role:', roleError);
          toast.error('Account created but role assignment failed. Contact support.');
        } else {
          toast.success('Admin account created successfully! Please check your email to verify your account.');
        }
      }

      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setAdminKey('');
      
    } catch (error) {
      console.error('Error creating admin account:', error);
      toast.error('Failed to create admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Admin Registration</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Create a new administrator account
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Admin registration requires a special registration key. Contact your system administrator for access.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAdminSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-key">Admin Registration Key</Label>
              <Input
                id="admin-key"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter admin registration key"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input
                id="admin-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin-confirm-password">Confirm Password</Label>
              <Input
                id="admin-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Create Admin Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth" className="text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSignup;