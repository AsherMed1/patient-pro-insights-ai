
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle, LogOut, Shield } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EnhancedProjectPasswordPromptProps {
  projectName: string;
  onPasswordSubmit: (password: string) => Promise<boolean>;
  onSignOut?: () => void;
  error?: string;
  loading?: boolean;
  isAuthenticated?: boolean;
}

export const EnhancedProjectPasswordPrompt = ({ 
  projectName, 
  onPasswordSubmit, 
  onSignOut,
  error,
  loading,
  isAuthenticated
}: EnhancedProjectPasswordPromptProps) => {
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      const success = await onPasswordSubmit(password);
      if (!success) {
        setPassword('');
      }
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Project Portal
          </CardTitle>
          <CardDescription>
            Enter the password to access the {projectName} project portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter project password"
                disabled={loading}
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
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !password.trim()}
            >
              {loading ? 'Verifying...' : 'Access Portal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
