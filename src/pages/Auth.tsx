import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Users, BarChart } from 'lucide-react';
import brandHeroImage from '@/assets/brand-hero.webp';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from || '/';

  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await signIn(email, password);
    
    if (!error) {
      navigate(from, { replace: true });
    }
    
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await signUp(email, password, fullName);
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="auth-container">
      {/* Hero Section */}
      <div className="auth-hero">
        <div className="auth-hero-overlay" />
        <img 
          src={brandHeroImage} 
          alt="Brand Hero" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="auth-hero-content">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <Shield className="h-16 w-16 mx-auto text-white" />
              <h1 className="text-4xl font-bold">Welcome to PatientPro</h1>
              <p className="text-xl text-white/90 max-w-md">
                Secure medical practice management platform designed for modern healthcare professionals
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mt-12">
              <div className="text-center space-y-2">
                <Users className="h-8 w-8 mx-auto text-white/80" />
                <h3 className="font-semibold">Patient Management</h3>
                <p className="text-sm text-white/70">Comprehensive patient records and care coordination</p>
              </div>
              <div className="text-center space-y-2">
                <BarChart className="h-8 w-8 mx-auto text-white/80" />
                <h3 className="font-semibold">Analytics Dashboard</h3>
                <p className="text-sm text-white/70">Real-time insights and performance metrics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="auth-form-section">
        <div className="auth-card">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-3xl font-bold text-foreground">Get Started</h2>
            <p className="text-muted-foreground">
              Access your secure medical practice dashboard
            </p>
          </div>

          <Card className="auth-brand-card">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Sign In to Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-11 border-border/60 focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 border-border/60 focus:border-primary"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 brand-button text-white font-medium" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Sign In to Dashboard
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Need admin access?{' '}
                  <Link to="/admin-signup" className="text-primary hover:underline font-medium">
                    Register as Admin
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;