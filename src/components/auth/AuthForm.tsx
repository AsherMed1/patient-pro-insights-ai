
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, User, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useSecureForm } from '@/hooks/useSecureForm';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const AuthForm = ({ mode, onToggleMode }: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formConfig = {
    email: {
      required: true,
      type: 'email' as const,
      maxLength: 100
    },
    password: {
      required: true,
      type: 'password' as const,
      minLength: 6
    },
    fullName: {
      required: mode === 'signup',
      type: 'text' as const,
      minLength: 2,
      maxLength: 50
    }
  };

  const {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    handleSubmit,
    reset
  } = useSecureForm(
    { email: '', password: '', fullName: '' },
    formConfig,
    `auth_${mode}`
  );

  const handleDemoLogin = () => {
    setValue('email', 'demo@example.com');
    setValue('password', 'demo123');
    toast({
      title: "Demo credentials loaded",
      description: "Click 'Sign In' to login with demo account",
    });
  };

  const onSubmit = async () => {
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: values.fullName
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          } else {
            throw new Error(error.message);
          }
        }

        toast({
          title: "Success!",
          description: "Account created successfully. Please check your email for verification.",
        });

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please try again.');
          } else {
            throw new Error(error.message);
          }
        }

        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
        <CardDescription>
          {mode === 'signin' 
            ? 'Sign in to access your dashboard' 
            : 'Create an account to get started'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit);
        }} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="fullName"
                  type="text"
                  value={values.fullName}
                  onChange={(e) => setValue('fullName', e.target.value)}
                  onBlur={() => setTouched('fullName')}
                  placeholder="Enter your full name"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              {touched.fullName && errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                onBlur={() => setTouched('email')}
                placeholder="Enter your email"
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
            {touched.email && errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={values.password}
                onChange={(e) => setValue('password', e.target.value)}
                onBlur={() => setTouched('password')}
                placeholder="Enter your password"
                className="pl-10"
                disabled={loading}
                required
                minLength={6}
              />
            </div>
            {touched.password && errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
            {mode === 'signup' && (
              <p className="text-sm text-gray-500">
                Password must be at least 6 characters long
              </p>
            )}
          </div>

          {(errors._form || errors.email || errors.password) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors._form || 'Please fix the errors above'}
              </AlertDescription>
            </Alert>
          )}

          {mode === 'signin' && (
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleDemoLogin}
              disabled={loading}
            >
              <Zap className="mr-2 h-4 w-4" />
              Demo Login
            </Button>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              disabled={loading}
            >
              {mode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
