
import React, { useState } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';

interface SecurityEnhancedAuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const SecurityEnhancedAuthForm = ({ mode, onToggleMode }: SecurityEnhancedAuthFormProps) => {
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      {securityAlerts.length > 0 && (
        <div className="space-y-2">
          {securityAlerts.map((alert, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <AuthForm 
        mode={mode} 
        onToggleMode={onToggleMode}
      />
    </div>
  );
};
