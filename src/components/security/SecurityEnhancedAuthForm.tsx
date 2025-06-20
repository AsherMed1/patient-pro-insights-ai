
import React, { useState, useEffect } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
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
    // Simple rate limiting check without external dependencies
    const checkRateLimit = () => {
      try {
        const identifier = 'auth_form';
        const storageKey = `rate_limit_${identifier}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const data = JSON.parse(stored);
          const now = Date.now();
          
          if (now - data.timestamp < 15 * 60 * 1000 && data.attempts >= 5) {
            setRateLimitStatus(prev => ({ 
              ...prev, 
              blocked: true,
              resetTime: data.timestamp + 15 * 60 * 1000 
            }));
          }
        }
      } catch (error) {
        console.error('Rate limit check failed:', error);
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
