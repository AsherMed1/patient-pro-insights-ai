
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from 'lucide-react';

const Auth = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Authentication forms have been removed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Authentication functionality is currently disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
