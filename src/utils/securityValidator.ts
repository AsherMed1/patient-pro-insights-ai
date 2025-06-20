
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
}
