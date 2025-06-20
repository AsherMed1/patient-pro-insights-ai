
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from 'lucide-react';

interface SecurityEnhancedAuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const SecurityEnhancedAuthForm = ({ mode, onToggleMode }: SecurityEnhancedAuthFormProps) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle>Authentication Removed</CardTitle>
        <CardDescription>
          The authentication forms have been removed from this application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600">
          No authentication functionality is currently available.
        </p>
      </CardContent>
    </Card>
  );
};
