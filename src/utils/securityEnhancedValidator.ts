
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  error?: string;
}

export class EnhancedSecurityValidator {
  private static rateLimitStore = new Map<string, { count: number; lastReset: number }>();

  static validateAndSanitize(value: string, type: 'email' | 'password' | 'text' | 'phone' | 'name'): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: false, error: 'Value is required' };
    }

    const sanitizedValue = value.trim();

    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedValue)) {
          return { isValid: false, error: 'Invalid email format' };
        }
        return { isValid: true, sanitizedValue };

      case 'password':
        if (sanitizedValue.length < 8) {
          return { isValid: false, error: 'Password must be at least 8 characters long' };
        }
        return { isValid: true, sanitizedValue };

      case 'text':
      case 'name':
        if (sanitizedValue.length < 1) {
          return { isValid: false, error: 'This field is required' };
        }
        return { isValid: true, sanitizedValue };

      case 'phone':
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(sanitizedValue)) {
          return { isValid: false, error: 'Invalid phone number format' };
        }
        return { isValid: true, sanitizedValue };

      default:
        return { isValid: true, sanitizedValue };
    }
  }

  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static validateCSRFToken(token: string): boolean {
    return token && token.length === 64 && /^[a-f0-9]+$/.test(token);
  }

  static isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.rateLimitStore.get(identifier);

    if (!record) {
      this.rateLimitStore.set(identifier, { count: 1, lastReset: now });
      return false;
    }

    // Reset if window has passed
    if (now - record.lastReset > windowMs) {
      this.rateLimitStore.set(identifier, { count: 1, lastReset: now });
      return false;
    }

    // Increment count
    record.count++;
    
    return record.count > maxAttempts;
  }
}
