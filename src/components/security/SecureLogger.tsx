
import React from 'react';

interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove potential sensitive information
      return data.replace(/password|token|key|secret/gi, '[REDACTED]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('secret')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  info(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  error(message: string, error?: any): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error);
    }
    
    // In production, only log error types without sensitive details
    if (this.isProduction && error) {
      console.error(`[ERROR] ${message}`, {
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Security-specific logging for audit trails
  securityEvent(eventType: string, details?: any): void {
    const sanitizedDetails = this.sanitizeData(details);
    
    if (this.isDevelopment) {
      console.warn(`[SECURITY] ${eventType}`, sanitizedDetails);
    }
    
    // In production, ensure security events are always logged but sanitized
    if (this.isProduction) {
      console.warn(`[SECURITY] ${eventType}`, {
        timestamp: new Date().toISOString(),
        type: eventType,
        details: sanitizedDetails
      });
    }
  }
}

export const secureLogger = new SecureLogger();

// React component for displaying security logs in development
export const SecurityLogViewer: React.FC = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-md">
      <h3 className="font-bold mb-2">Security Log (Dev Only)</h3>
      <p className="text-gray-300">
        Security events are being logged. Check console for details.
      </p>
    </div>
  );
};
