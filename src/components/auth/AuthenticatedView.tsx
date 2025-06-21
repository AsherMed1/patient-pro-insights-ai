
import React from 'react';
import { LoadingState } from '@/controllers/SecurityController';
import { LoadingSkeleton } from './LoadingSkeleton';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import { ThreatDetectionMonitor } from '@/components/security/ThreatDetectionMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Badge } from '@/components/ui/badge';
import { Shield, Settings, LogOut } from 'lucide-react';

interface AuthenticatedViewProps {
  user: any;
  loadingStates: LoadingState;
  securityData: any;
}

export const AuthenticatedView: React.FC<AuthenticatedViewProps> = ({
  user,
  loadingStates,
  securityData
}) => {
  const { signOut } = useAuth();
  const { roles, isAdmin, loading: rolesLoading } = useUserRoles();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with Sign Out */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!rolesLoading && roles.length > 0 && (
              <div className="flex gap-2">
                {roles.map(role => (
                  <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                    {role}
                  </Badge>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin() && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Administrator Controls
              </CardTitle>
              <CardDescription>
                You have administrator privileges. Access additional security features and user management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button variant="outline" size="sm">
                  User Management
                </Button>
                <Button variant="outline" size="sm">
                  Security Policies
                </Button>
                <Button variant="outline" size="sm">
                  Audit Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Dashboard Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Security Overview</h2>
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

        {/* Enhanced User Profile Section */}
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
                <CardDescription>Your account information and security status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-lg">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">User ID</label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">{user.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Sign In</label>
                      <p className="text-lg">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Created</label>
                      <p className="text-lg">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">User Roles</label>
                      <div className="flex gap-2 mt-1">
                        {rolesLoading ? (
                          <Badge variant="outline">Loading...</Badge>
                        ) : roles.length > 0 ? (
                          roles.map(role => (
                            <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">No roles assigned</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Security Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">Account Secure</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
