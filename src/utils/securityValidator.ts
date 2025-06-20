
export class SecurityValidator {
  static validateInput(input: string, type: 'email' | 'password' | 'text'): { isValid: boolean; error?: string } {
    if (!input || input.trim().length === 0) {
      return { isValid: false, error: 'Input is required' };
    }

    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
          return { isValid: false, error: 'Invalid email format' };
        }
        break;

      case 'password':
        if (input.length < 8) {
          return { isValid: false, error: 'Password must be at least 8 characters' };
        }
        break;

      case 'text':
        if (input.length > 1000) {
          return { isValid: false, error: 'Text too long' };
        }
        break;
    }

    return { isValid: true };
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '').substring(0, 1000);
  }

  // Backward compatibility - basic rate limiting
  static isRateLimited(identifier: string, maxAttempts: number = 5): boolean {
    const key = `rate_limit_${identifier}`;
    const now = Date.now();
    const windowMs = 900000; // 15 minutes
    
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
