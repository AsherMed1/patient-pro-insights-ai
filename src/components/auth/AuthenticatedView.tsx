
import React from 'react';
import { LoadingState } from '@/controllers/SecurityController';
import { LoadingSkeleton } from './LoadingSkeleton';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import { ThreatDetectionMonitor } from '@/components/security/ThreatDetectionMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
};
