
import React, { useState } from 'react';
import { EnhancedRateLimiter } from '@/utils/enhancedRateLimiter';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SecureFormSubmissionHandlerProps {
  children: React.ReactNode;
  onSubmit: (data: any) => Promise<void>;
  formData: any;
  endpoint: string;
}

export const SecureFormSubmissionHandler: React.FC<SecureFormSubmissionHandlerProps> = ({
  children,
  onSubmit,
  formData,
  endpoint
}) => {
  const { user } = useAuth();
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSecureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setRateLimitError(null);

    try {
      // Check rate limit
      const identifier = user?.id || EnhancedRateLimiter.getClientIdentifier();
      const isAllowed = await EnhancedRateLimiter.checkRateLimit({
        identifier,
        endpoint,
        maxRequests: 5, // 5 form submissions per minute
        windowMinutes: 1
      });

      if (!isAllowed) {
        setRateLimitError('Too many submissions. Please wait a moment before trying again.');
        
        // Log rate limit violation
        await EnhancedRateLimiter.logSecurityEvent(
          'form_rate_limit_exceeded',
          'MEDIUM',
          { endpoint, identifier: identifier.substring(0, 10) + '***' },
          endpoint
        );
        return;
      }

      // Log form submission attempt
      await EnhancedRateLimiter.logSecurityEvent(
        'form_submission_attempt',
        'LOW',
        { 
          endpoint,
          form_data_keys: Object.keys(formData),
          user_authenticated: !!user
        },
        endpoint
      );

      // Add honeypot field check (should be empty)
      if (formData.website || formData.url) {
        // Honeypot field was filled - likely spam
        await EnhancedRateLimiter.logSecurityEvent(
          'spam_detection_honeypot',
          'HIGH',
          { endpoint, honeypot_field: formData.website || formData.url },
          endpoint
        );
        return; // Silently reject
      }

      // Proceed with form submission
      await onSubmit(formData);

      // Log successful submission
      await EnhancedRateLimiter.logSecurityEvent(
        'form_submission_success',
        'LOW',
        { endpoint },
        endpoint
      );

    } catch (error) {
      console.error('Form submission failed:', error);
      
      // Log submission failure
      await EnhancedRateLimiter.logSecurityEvent(
        'form_submission_failed',
        'MEDIUM',
        { 
          endpoint,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        endpoint
      );
      
      throw error; // Re-throw to be handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSecureSubmit}>
      {/* Honeypot field - hidden from users */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0
        }}
        onChange={() => {}} // Controlled but hidden
      />
      
      {rateLimitError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{rateLimitError}</AlertDescription>
        </Alert>
      )}
      
      {children}
    </form>
  );
};
