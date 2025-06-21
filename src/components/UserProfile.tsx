
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, Mail, Clock, LogOut } from 'lucide-react';
import { EnhancedSecurityLogger } from '@/utils/enhancedSecurityLogger';

export const UserProfile: React.FC = () => {
  const { user, session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      // Log successful access to protected resource
      EnhancedSecurityLogger.logSecurityEvent({
        type: 'auth_attempt',
        severity: 'LOW',
        details: {
          success: true,
          userId: user.id,
          email: user.email,
          accessedResource: 'user_profile'
        }
      });
    }
  }, [user]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setMessage('Successfully signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      setMessage('Error signing out');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Secure Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to your protected user area</p>
        </div>

        <div className="space-y-6">
          {/* User Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">User ID:</span>
                <span className="font-mono text-sm">{user.id}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Last Sign In:</span>
                <span className="text-sm">
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : 'First time'
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Session Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Session Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Status:</span>
                <span className="font-medium text-green-600">Authenticated</span>
              </div>
              
              {session?.expires_at && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Session Expires:</span>
                  <span className="text-sm">
                    {new Date(session.expires_at * 1000).toLocaleString()}
                  </span>
                </div>
              )}
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Your session is secured with enhanced protection
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSignOut}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {loading ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </CardContent>
          </Card>

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};
