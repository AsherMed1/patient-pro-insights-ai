
export class EnhancedSecurityLogger {
  static logAuthAttempt(success: boolean) {
    console.log('Auth attempt:', { success, timestamp: new Date().toISOString() });
  }

  static logSecurityEvent(eventType: string) {
    console.log('Security event:', { eventType, timestamp: new Date().toISOString() });
  }
}

export const securityLogger = EnhancedSecurityLogger;
