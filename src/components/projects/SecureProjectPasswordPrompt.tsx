
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle, LogOut } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SecureProjectPasswordPromptProps {
  projectName: string;
  onPasswordSubmit: (password: string) => void;
  onSignOut?: () => void;
  error?: string;
  loading?: boolean;
  isAuthenticated?: boolean;
}

export const SecureProjectPasswordPrompt = ({ 
  projectName, 
  onPasswordSubmit, 
  onSignOut,
  error,
  loading,
  isAuthenticated 
}: SecureProjectPasswordPromptProps) => {
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() && attempts < maxAttempts) {
      onPasswordSubmit(password);
      setAttempts(prev => prev + 1);
    }
  };

  if (isAuthenticated && onSignOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Authenticated</CardTitle>
            <CardDescription>
              You have access to the {projectName} project portal
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

  const isLocked = attempts >= maxAttempts;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Protected Project Portal</CardTitle>
          <CardDescription>
            Enter the password to access the {projectName} project portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Too many failed attempts. Please refresh the page and try again later.
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter project password"
                  disabled={loading || isLocked}
                  autoFocus
                  maxLength={100}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {attempts > 2 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {maxAttempts - attempts} attempts remaining
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !password.trim() || isLocked}
              >
                {loading ? 'Verifying...' : 'Access Portal'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
