
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
      const isAllowed = SecurityValidator.checkRateLimit(identifier, 15, 5); // 5 attempts per 15 minutes
      
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

  const handleAuthAttempt = async (success: boolean, error?: string) => {
    const newAttempts = rateLimitStatus.attempts + 1;
    
    setRateLimitStatus(prev => ({
      ...prev,
      attempts: newAttempts
    }));

    // Log authentication attempt
    await securityLogger.logAuthAttempt(success, {
      mode,
      error: error || null,
      attempt_number: newAttempts
    });

    if (!success) {
      // Add security alerts for failed attempts
      const alerts: string[] = [];
      
      if (newAttempts >= 3) {
        alerts.push('Multiple failed attempts detected. Please verify your credentials.');
      }
      
      if (error?.includes('rate limit')) {
        alerts.push('Too many attempts. Please wait before trying again.');
      }
      
      setSecurityAlerts(alerts);
    } else {
      // Clear alerts on successful authentication
      setSecurityAlerts([]);
      setRateLimitStatus({
        attempts: 0,
        blocked: false,
        resetTime: 0
      });
    }
  };

  const handleFormSubmit = async (email: string, password: string) => {
    try {
      // Validate inputs
      const emailValidation = SecurityValidator.validateInput(email, 'email');
      const passwordValidation = SecurityValidator.validateInput(password, 'password');
      
      if (!emailValidation.isValid) {
        await handleAuthAttempt(false, emailValidation.error);
        return;
      }
      
      if (!passwordValidation.isValid) {
        await handleAuthAttempt(false, passwordValidation.error);
        return;
      }

      // Check rate limiting
      if (rateLimitStatus.blocked) {
        await handleAuthAttempt(false, 'Rate limit exceeded');
        return;
      }

      // Here you would normally call your auth function
      // For now, we'll simulate the auth attempt logging
      await handleAuthAttempt(true);
      
    } catch (error) {
      await handleAuthAttempt(false, error instanceof Error ? error.message : 'Unknown error');
    }
  };

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
