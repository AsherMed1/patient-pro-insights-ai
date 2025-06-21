
import { EnhancedSecurityLogger } from './enhancedSecurityLogger';

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: string;
  error?: string;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class EnhancedSecurityValidator {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private static readonly PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;
  private static readonly NAME_REGEX = /^[a-zA-Z\s\-.']{1,100}$/;
  private static readonly PASSWORD_MIN_LENGTH = 8;
  private static readonly MAX_TEXT_LENGTH = 5000;
  
  // Rate limiting storage
  private static rateLimitStore = new Map<string, { count: number; firstAttempt: number }>();
  
  // CSRF token generation and validation
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  static validateCSRFToken(token: string): boolean {
    return typeof token === 'string' && token.length === 64 && /^[a-f0-9]+$/.test(token);
  }
  
  // Enhanced validation with security monitoring
  static validateAndSanitize(input: string, type: 'email' | 'password' | 'text' | 'phone' | 'name'): ValidationResult {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        error: 'Input is required and must be a string',
        securityLevel: 'LOW'
      };
    }

    // Check for potential security threats
    const securityThreats = this.detectSecurityThreats(input);
    if (securityThreats.length > 0) {
      EnhancedSecurityLogger.logSuspiciousActivity('input_validation_threat', {
        inputType: type,
        threats: securityThreats,
        inputLength: input.length
      });
      
      return {
        isValid: false,
        error: 'Input contains potentially malicious content',
        securityLevel: 'HIGH'
      };
    }

    let sanitized = this.sanitizeInput(input);
    
    switch (type) {
      case 'email':
        return this.validateEmail(sanitized);
      case 'password':
        return this.validatePassword(input); // Don't sanitize passwords
      case 'phone':
        return this.validatePhone(sanitized);
      case 'name':
        return this.validateName(sanitized);
      case 'text':
        return this.validateText(sanitized);
      default:
        return {
          isValid: false,
          error: 'Invalid validation type',
          securityLevel: 'MEDIUM'
        };
    }
  }
  
  private static detectSecurityThreats(input: string): string[] {
    const threats: string[] = [];
    
    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\bOR\s+\d+\s*=\s*\d+)/i,
      /('|(\\x27)|(\\x2D\\x2D))/
    ];
    
    // XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b/i,
      /<object\b/i,
      /<embed\b/i
    ];
    
    // Path traversal patterns
    const pathTraversalPatterns = [
      /\.\.[\/\\]/,
      /\.\.\//,
      /\.\.\\/ 
    ];
    
    sqlPatterns.forEach(pattern => {
      if (pattern.test(input)) threats.push('sql_injection');
    });
    
    xssPatterns.forEach(pattern => {
      if (pattern.test(input)) threats.push('xss_attempt');
    });
    
    pathTraversalPatterns.forEach(pattern => {
      if (pattern.test(input)) threats.push('path_traversal');
    });
    
    // Check for excessive length (potential DoS)
    if (input.length > 10000) {
      threats.push('excessive_length');
    }
    
    return threats;
  }
  
  private static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, this.MAX_TEXT_LENGTH);
  }
  
  private static validateEmail(email: string): ValidationResult {
    if (email.length > 254) {
      return {
        isValid: false,
        error: 'Email address is too long',
        securityLevel: 'LOW'
      };
    }
    
    if (!this.EMAIL_REGEX.test(email)) {
      return {
        isValid: false,
        error: 'Invalid email format',
        securityLevel: 'LOW'
      };
    }
    
    return {
      isValid: true,
      sanitizedValue: email.toLowerCase(),
      securityLevel: 'LOW'
    };
  }
  
  private static validatePassword(password: string): ValidationResult {
    if (password.length < this.PASSWORD_MIN_LENGTH) {
      return {
        isValid: false,
        error: `Password must be at least ${this.PASSWORD_MIN_LENGTH} characters`,
        securityLevel: 'MEDIUM'
      };
    }
    
    if (password.length > 128) {
      return {
        isValid: false,
        error: 'Password is too long',
        securityLevel: 'MEDIUM'
      };
    }
    
    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      return {
        isValid: false,
        error: 'Password is too common. Please choose a stronger password',
        securityLevel: 'HIGH'
      };
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    if (strength < 3 && password.length < 12) {
      return {
        isValid: false,
        error: 'Password must contain at least 3 of: uppercase, lowercase, numbers, special characters',
        securityLevel: 'MEDIUM'
      };
    }
    
    return {
      isValid: true,
      sanitizedValue: password, // Don't modify passwords
      securityLevel: strength >= 4 ? 'LOW' : 'MEDIUM'
    };
  }
  
  private static validatePhone(phone: string): ValidationResult {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    if (!this.PHONE_REGEX.test(cleanPhone)) {
      return {
        isValid: false,
        error: 'Invalid phone number format',
        securityLevel: 'LOW'
      };
    }
    
    return {
      isValid: true,
      sanitizedValue: cleanPhone,
      securityLevel: 'LOW'
    };
  }
  
  private static validateName(name: string): ValidationResult {
    if (name.length < 1 || name.length > 100) {
      return {
        isValid: false,
        error: 'Name must be between 1 and 100 characters',
        securityLevel: 'LOW'
      };
    }
    
    if (!this.NAME_REGEX.test(name)) {
      return {
        isValid: false,
        error: 'Name contains invalid characters',
        securityLevel: 'MEDIUM'
      };
    }
    
    return {
      isValid: true,
      sanitizedValue: name.trim(),
      securityLevel: 'LOW'
    };
  }
  
  private static validateText(text: string): ValidationResult {
    if (text.length > this.MAX_TEXT_LENGTH) {
      return {
        isValid: false,
        error: `Text is too long (maximum ${this.MAX_TEXT_LENGTH} characters)`,
        securityLevel: 'MEDIUM'
      };
    }
    
    return {
      isValid: true,
      sanitizedValue: text.trim(),
      securityLevel: 'LOW'
    };
  }
  
  // Enhanced rate limiting with multiple time windows
  static isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 900000): boolean {
    const now = Date.now();
    const key = `${identifier}_${Math.floor(now / windowMs)}`;
    
    try {
      const stored = this.rateLimitStore.get(key);
      
      if (stored) {
        if (stored.count >= maxAttempts) {
          EnhancedSecurityLogger.logRateLimitExceeded(identifier, 'validation_attempt');
          return true;
        }
        stored.count++;
      } else {
        this.rateLimitStore.set(key, { count: 1, firstAttempt: now });
        
        // Cleanup old entries
        this.cleanupRateLimitStore();
      }
      
      return false;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return false; // Fail open for availability
    }
  }
  
  private static cleanupRateLimitStore(): void {
    if (this.rateLimitStore.size > 1000) {
      const now = Date.now();
      const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
      
      for (const [key, value] of this.rateLimitStore.entries()) {
        if (value.firstAttempt < cutoff) {
          this.rateLimitStore.delete(key);
        }
      }
    }
  }
  
  // Content Security Policy validation
  static validateCSP(nonce?: string): boolean {
    if (!nonce) return false;
    return /^[a-zA-Z0-9+/]{22}==$/.test(nonce);
  }
  
  // Session token validation
  static validateSessionToken(token: string): boolean {
    return typeof token === 'string' && token.length >= 32 && /^[A-Za-z0-9+/=]+$/.test(token);
  }
}
