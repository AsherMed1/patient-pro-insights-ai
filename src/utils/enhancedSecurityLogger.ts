
import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  type: 'auth_attempt' | 'form_submission' | 'api_call' | 'suspicious_activity' | 'rate_limit_exceeded';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details?: Record<string, any>;
  userAgent?: string;
  timestamp?: Date;
}

export class EnhancedSecurityLogger {
  private static getClientInfo() {
    return {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer
    };
  }

  static async logSecurityEvent(event: SecurityEvent) {
    const clientInfo = this.getClientInfo();
    
    try {
      // Log to console for development
      console.log(`[SECURITY ${event.severity}] ${event.type}:`, {
        ...event.details,
        ...clientInfo
      });

      // Also call the database function directly
      await supabase.rpc('log_security_event_enhanced', {
        event_type_param: event.type,
        ip_address_param: null, // Will be handled server-side
        user_agent_param: clientInfo.userAgent,
        details_param: {
          ...event.details,
          ...clientInfo
        },
        severity_param: event.severity
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static logAuthAttempt(success: boolean, email?: string, error?: string) {
    this.logSecurityEvent({
      type: 'auth_attempt',
      severity: success ? 'LOW' : 'MEDIUM',
      details: {
        success,
        email: email ? email.substring(0, 3) + '***' : undefined,
        error: error ? error.substring(0, 100) : undefined
      }
    });
  }

  static logSuspiciousActivity(activity: string, details?: Record<string, any>) {
    this.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'HIGH',
      details: {
        activity,
        ...details
      }
    });
  }

  static logRateLimitExceeded(identifier: string, action: string) {
    this.logSecurityEvent({
      type: 'rate_limit_exceeded',
      severity: 'MEDIUM',
      details: {
        identifier: identifier.substring(0, 10) + '***',
        action
      }
    });
  }

  static logFormSubmission(formType: string, success: boolean, validationErrors?: string[]) {
    this.logSecurityEvent({
      type: 'form_submission',
      severity: success ? 'LOW' : 'MEDIUM',
      details: {
        formType,
        success,
        validationErrors: validationErrors?.slice(0, 5)
      }
    });
  }
}

// Backward compatibility
export const securityLogger = EnhancedSecurityLogger;
