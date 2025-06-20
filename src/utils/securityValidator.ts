
// Security validation utilities
export class SecurityValidator {
  // Rate limiting storage (in-memory for client-side)
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
        if (input.length > 254) {
          return { isValid: false, error: 'Email too long' };
        }
        break;

      case 'password':
        if (input.length < 8) {
          return { isValid: false, error: 'Password must be at least 8 characters' };
        }
        if (input.length > 128) {
          return { isValid: false, error: 'Password too long' };
        }
        // Check for basic password strength
        const hasUpper = /[A-Z]/.test(input);
        const hasLower = /[a-z]/.test(input);
        const hasNumber = /\d/.test(input);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(input);
        
        if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
          return { 
            isValid: false, 
            error: 'Password must contain uppercase, lowercase, number, and special character' 
          };
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

  static checkRateLimit(identifier: string, windowMs: number, maxAttempts: number): boolean {
    const now = Date.now();
    const key = `${identifier}_${Math.floor(now / windowMs)}`;
    
    const current = this.rateLimitStore.get(key);
    if (!current) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= maxAttempts) {
      return false;
    }

    current.count++;
    return true;
  }

  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }
}
