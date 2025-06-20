
import DOMPurify from 'dompurify';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export class EnhancedSecurityValidator {
  private static readonly MAX_STRING_LENGTH = 1000;
  private static readonly MAX_EMAIL_LENGTH = 254;
  private static readonly MAX_PASSWORD_LENGTH = 128;
  private static readonly MIN_PASSWORD_LENGTH = 8;

  // Enhanced input validation with sanitization
  static validateAndSanitize(input: string, type: 'email' | 'password' | 'text' | 'phone' | 'name'): ValidationResult {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: 'Input is required and must be a string' };
    }

    // Basic length checks
    if (input.length > this.MAX_STRING_LENGTH) {
      return { isValid: false, error: 'Input exceeds maximum length' };
    }

    // Sanitize input to prevent XSS
    const sanitized = DOMPurify.sanitize(input.trim(), { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });

    if (sanitized !== input.trim()) {
      return { isValid: false, error: 'Input contains invalid characters' };
    }

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
        return { isValid: false, error: 'Invalid validation type' };
    }
  }

  private static validateEmail(email: string): ValidationResult {
    if (email.length > this.MAX_EMAIL_LENGTH) {
      return { isValid: false, error: 'Email too long' };
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Check for suspicious patterns
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true, sanitizedValue: email.toLowerCase() };
  }

  private static validatePassword(password: string): ValidationResult {
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      return { isValid: false, error: `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters` };
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      return { isValid: false, error: 'Password too long' };
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^(012|123|234|345|456|567|678|789|890|abc|qwe|asd|zxc)/i, // Sequential
      /^(password|123456|qwerty|admin|login)/i // Common passwords
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        return { isValid: false, error: 'Password is too weak' };
      }
    }

    return { isValid: true, sanitizedValue: password };
  }

  private static validatePhone(phone: string): ValidationResult {
    // Remove common formatting
    const cleaned = phone.replace(/[\s\-\(\)\+\.]/g, '');
    
    if (cleaned.length < 10 || cleaned.length > 15) {
      return { isValid: false, error: 'Invalid phone number length' };
    }

    if (!/^\d+$/.test(cleaned)) {
      return { isValid: false, error: 'Phone number must contain only digits' };
    }

    return { isValid: true, sanitizedValue: cleaned };
  }

  private static validateName(name: string): ValidationResult {
    if (name.length < 1 || name.length > 100) {
      return { isValid: false, error: 'Name must be 1-100 characters' };
    }

    // Only allow letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(name)) {
      return { isValid: false, error: 'Name contains invalid characters' };
    }

    return { isValid: true, sanitizedValue: name };
  }

  private static validateText(text: string): ValidationResult {
    if (text.length > 5000) {
      return { isValid: false, error: 'Text too long' };
    }

    // Check for suspicious patterns that might indicate injection attempts
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /data:text\/html/i,
      /vbscript:/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return { isValid: false, error: 'Text contains invalid content' };
      }
    }

    return { isValid: true, sanitizedValue: text };
  }

  // CSRF token generation and validation
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static validateCSRFToken(token: string, sessionToken?: string): boolean {
    if (!token || typeof token !== 'string' || token.length !== 64) {
      return false;
    }

    // In a real implementation, you'd validate against stored session token
    // For now, just check format
    return /^[a-f0-9]{64}$/.test(token);
  }

  // Rate limiting helper
  static isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 900000): boolean {
    const key = `rate_limit_${identifier}`;
    const now = Date.now();
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const { count, firstAttempt } = JSON.parse(stored);
        
        if (now - firstAttempt < windowMs) {
          if (count >= maxAttempts) {
            return true;
          }
          localStorage.setItem(key, JSON.stringify({ count: count + 1, firstAttempt }));
        } else {
          // Reset window
          localStorage.setItem(key, JSON.stringify({ count: 1, firstAttempt: now }));
        }
      } else {
        localStorage.setItem(key, JSON.stringify({ count: 1, firstAttempt: now }));
      }
    } catch (error) {
      console.error('Rate limiting storage error:', error);
    }
    
    return false;
  }
}
