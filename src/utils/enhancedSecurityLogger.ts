
// Simple security logging utility
export class EnhancedSecurityLogger {
  static logAuthAttempt(success: boolean, details: any = {}) {
    try {
      console.log('Auth attempt:', { 
        success, 
        details: this.sanitizeDetails(details), 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }

  static logSecurityEvent(eventType: string, details: any = {}) {
    try {
      console.log('Security event:', { 
        eventType, 
        details: this.sanitizeDetails(details), 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static logSuspiciousActivity(activityType: string, details: any = {}) {
    try {
      console.warn('Suspicious activity:', { 
        activityType, 
        details: this.sanitizeDetails(details), 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  static logRateLimitHit(identifier: string, maxAttempts: number) {
    try {
      console.warn('Rate limit hit:', { 
        identifier, 
        maxAttempts, 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Failed to log rate limit hit:', error);
    }
  }

  private static sanitizeDetails(details: any): any {
    if (typeof details === 'object' && details !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(details)) {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('key')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return details;
  }
}

// Export as default for backward compatibility
export const securityLogger = EnhancedSecurityLogger;
