
import { AuthModel, LoginCredentials, SignupCredentials } from '@/models/AuthModel';

export class AuthController {
  static async handleLogin(credentials: LoginCredentials, onSuccess: () => void, onError: (error: string) => void) {
    const result = await AuthModel.login(credentials);
    
    if (result.success) {
      onSuccess();
    } else {
      onError(result.error || 'Login failed');
    }
  }

  static async handleSignup(credentials: SignupCredentials, onSuccess: (message: string) => void, onError: (error: string) => void) {
    const result = await AuthModel.signup(credentials);
    
    if (result.success) {
      onSuccess('Please check your email to confirm your account');
    } else {
      onError(result.error || 'Signup failed');
    }
  }

  static async handleLogout(onSuccess: () => void, onError: (error: string) => void) {
    const result = await AuthModel.signOut();
    
    if (result.success) {
      onSuccess();
    } else {
      onError(result.error || 'Logout failed');
    }
  }
}
