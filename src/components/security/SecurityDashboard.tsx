
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { Navigation } from '../Navigation';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';

export const SecurityDashboard: React.FC = () => {
  const { sessionRisk, deviceTrusted, isSecureSession, lastSecurityCheck } = useEnhancedAuth();

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 border-green-600';
      case 'MEDIUM': return 'text-yellow-600 border-yellow-600';
      case 'HIGH': return 'text-red-600 border-red-600';
      default: return 'text-gray-600 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Security Center</h1>
            <p className="mt-2 text-gray-600">Monitor and manage your account security</p>
          </div>

          {/* Security Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Session Status</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {isSecureSession ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-semibold ${isSecureSession ? 'text-green-600' : 'text-red-600'}`}>
                    {isSecureSession ? 'Secure' : 'At Risk'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Device Trust</CardTitle>
                <Lock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {deviceTrusted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-semibold ${deviceTrusted ? 'text-green-600' : 'text-red-600'}`}>
                    {deviceTrusted ? 'Trusted' : 'Untrusted'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <Eye className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={getRiskColor(sessionRisk)}>
                  {sessionRisk}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Security Features */}
          <Card>
            <CardHeader>
              <CardTitle>Active Security Features</CardTitle>
              <CardDescription>Your account is protected by these security measures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Device Fingerprinting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Session Monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Input Validation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>CSRF Protection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Rate Limiting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>Threat Detection</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Security Check */}
          {lastSecurityCheck && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Security Check</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {lastSecurityCheck.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
