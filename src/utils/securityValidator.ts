
// Enhanced security validation utilities
export class SecurityValidator {
  private static readonly MAX_STRING_LENGTH = 10000;
  private static readonly MAX_ARRAY_LENGTH = 100;
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi
  ];

  static validateInput(input: any, fieldName: string): { isValid: boolean; error?: string } {
    if (input === null || input === undefined) {
      return { isValid: true };
    }

    // String validation
    if (typeof input === 'string') {
      if (input.length > this.MAX_STRING_LENGTH) {
        return { isValid: false, error: `${fieldName} exceeds maximum length` };
      }

      // Check for dangerous patterns
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(input)) {
          return { isValid: false, error: `${fieldName} contains potentially dangerous content` };
        }
      }
    }

    // Array validation
    if (Array.isArray(input)) {
      if (input.length > this.MAX_ARRAY_LENGTH) {
        return { isValid: false, error: `${fieldName} array exceeds maximum length` };
      }

      // Validate each array element
      for (let i = 0; i < input.length; i++) {
        const elementValidation = this.validateInput(input[i], `${fieldName}[${i}]`);
        if (!elementValidation.isValid) {
          return elementValidation;
        }
      }
    }

    // Object validation
    if (typeof input === 'object' && input !== null) {
      const keys = Object.keys(input);
      if (keys.length > 50) {
        return { isValid: false, error: `${fieldName} object has too many properties` };
      }

      for (const key of keys) {
        const keyValidation = this.validateInput(key, `${fieldName}.key`);
        if (!keyValidation.isValid) {
          return keyValidation;
        }

        const valueValidation = this.validateInput(input[key], `${fieldName}.${key}`);
        if (!valueValidation.isValid) {
          return valueValidation;
        }
      }
    }

    return { isValid: true };
  }

  static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>'"&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      })
      .trim()
      .substring(0, this.MAX_STRING_LENGTH);
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  static validatePhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  static validateProjectName(projectName: string): boolean {
    const projectRegex = /^[a-zA-Z0-9\-_\s]{1,100}$/;
    return projectRegex.test(projectName);
  }

  static checkRateLimit(identifier: string, windowMinutes: number = 15, maxAttempts: number = 5): boolean {
    const key = `rate_limit_${identifier}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    localStorage.setItem(key, JSON.stringify(recentAttempts));
    return true;
  }
}
