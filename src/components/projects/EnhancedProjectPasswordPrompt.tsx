
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Lock, AlertCircle, LogOut, Shield, Clock } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EnhancedProjectPasswordPromptProps {
  projectName: string;
  onPasswordSubmit: (password: string) => Promise<boolean>;
  onSignOut?: () => void;
  error?: string;
  loading?: boolean;
  isAuthenticated?: boolean;
  attempts?: number;
  remainingAttempts?: number;
  isLocked?: boolean;
}

export const EnhancedProjectPasswordPrompt = ({ 
  projectName, 
  onPasswordSubmit, 
  onSignOut,
  error,
  loading,
  isAuthenticated,
  attempts = 0,
  remainingAttempts = 5,
  isLocked = false
}: EnhancedProjectPasswordPromptProps) => {
  const [password, setPassword] = useState('');
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() && !isLocked) {
      const success = await onPasswordSubmit(password);
      if (!success) {
        setPassword(''); // Clear password on failed attempt
      }
    }
  };

  const getPasswordStrength = (pwd: string): { score: number; feedback: string } => {
    let score = 0;
    let feedback = 'Very weak';
    
    if (pwd.length >= 6) score += 20;
    if (pwd.length >= 8) score += 20;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    
    if (score >= 80) feedback = 'Strong';
    else if (score >= 60) feedback = 'Good';
    else if (score >= 40) feedback = 'Fair';
    else if (score >= 20) feedback = 'Weak';
    
    return { score, feedback };
  };

  const passwordStrength = getPasswordStrength(password);

  if (isAuthenticated && onSignOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              Authenticated
            </CardTitle>
            <CardDescription>
              You have secure access to the {projectName} project portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Protected Project Portal
          </CardTitle>
          <CardDescription>
            Enter the password to access the {projectName} project portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked ? (
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Account temporarily locked due to too many failed attempts. 
                Please try again in 15 minutes for security reasons.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setShowPasswordStrength(e.target.value.length > 0);
                  }}
                  placeholder="Enter project password"
                  disabled={loading || isLocked}
                  autoFocus
                  maxLength={100}
                  className={error ? 'border-red-500' : ''}
                />
                
                {showPasswordStrength && password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Password strength</span>
                      <span className={
                        passwordStrength.score >= 60 ? 'text-green-600' :
                        passwordStrength.score >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {passwordStrength.feedback}
                      </span>
                    </div>
                    <Progress 
                      value={passwordStrength.score} 
                      className="h-1"
                    />
                  </div>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {attempts > 0 && remainingAttempts > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {remainingAttempts} attempts remaining before temporary lockout
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !password.trim() || isLocked || password.length < 6}
              >
                {loading ? 'Verifying...' : 'Access Portal'}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                <p>🔒 This portal is protected by enhanced security measures</p>
                <p>• Rate limiting • Input validation • Session management</p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
