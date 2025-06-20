
// Enhanced security logging utility with proper error handling
export class EnhancedSecurityLogger {
  static logAuthAttempt(success: boolean, details: any = {}) {
    try {
      console.log('Auth attempt:', { success, details, timestamp: new Date().toISOString() });
      // In a production environment, this would send to a logging service
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }

  static logSecurityEvent(eventType: string, details: any = {}) {
    try {
      console.log('Security event:', { eventType, details, timestamp: new Date().toISOString() });
      // In a production environment, this would send to a logging service
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static logSuspiciousActivity(activityType: string, details: any = {}) {
    try {
      console.warn('Suspicious activity:', { activityType, details, timestamp: new Date().toISOString() });
      // In a production environment, this would send to a logging service
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  static logRateLimitHit(identifier: string, maxAttempts: number) {
    try {
      console.warn('Rate limit hit:', { identifier, maxAttempts, timestamp: new Date().toISOString() });
      // In a production environment, this would send to a logging service
    } catch (error) {
      console.error('Failed to log rate limit hit:', error);
    }
  }
}

// Export as default for backward compatibility
export const securityLogger = EnhancedSecurityLogger;
