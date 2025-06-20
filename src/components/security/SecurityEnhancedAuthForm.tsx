
import React, { useState, useEffect } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { securityLogger } from '@/utils/enhancedSecurityLogger';
import { SecurityValidator } from '@/utils/securityValidator';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';

interface SecurityEnhancedAuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const SecurityEnhancedAuthForm = ({ mode, onToggleMode }: SecurityEnhancedAuthFormProps) => {
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);
  const [rateLimitStatus, setRateLimitStatus] = useState({
    attempts: 0,
    blocked: false,
    resetTime: 0
  });

  useEffect(() => {
    // Check rate limiting status
    const checkRateLimit = () => {
      const identifier = 'auth_form';
      const isAllowed = SecurityValidator.checkRateLimit(identifier, 15 * 60 * 1000, 5);
      
      if (!isAllowed) {
        setRateLimitStatus(prev => ({ 
          ...prev, 
          blocked: true,
          resetTime: Date.now() + 15 * 60 * 1000 
        }));
        
        securityLogger.logRateLimitHit('auth_form', 5);
      }
    };

    checkRateLimit();
  }, []);

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

      {rateLimitStatus.blocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Too many failed attempts. Please try again in {Math.ceil((rateLimitStatus.resetTime - Date.now()) / 60000)} minutes.
          </AlertDescription>
        </Alert>
      )}

      <AuthForm 
        mode={mode} 
        onToggleMode={onToggleMode}
      />
    </div>
  );
};
