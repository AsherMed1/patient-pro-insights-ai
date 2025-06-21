
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthController } from '@/controllers/AuthController';
import { useSecureForm } from './useSecureForm';

export const useAuthMVC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loginForm = useSecureForm({
    formType: 'login',
    requireCSRF: true,
    rateLimitKey: 'auth_login',
    submissionDelay: 1000
  });

  const signupForm = useSecureForm({
    formType: 'signup',
    requireCSRF: true,
    rateLimitKey: 'auth_signup',
    submissionDelay: 1500
  });

  const handleLogin = async () => {
    try {
      setError('');
      setMessage('');

      const email = loginForm.fields.email?.value || '';
      const password = loginForm.fields.password?.value || '';

      const emailValidation = loginForm.validateField('email', email, 'email');
      const passwordValidation = loginForm.validateField('password', password, 'password');

      if (!emailValidation.isValid || !passwordValidation.isValid) {
        setError('Please fix the validation errors above');
        return;
      }

      await loginForm.submitForm(async () => {
        await AuthController.handleLogin(
          { email: emailValidation.sanitizedValue!, password },
          () => navigate('/'),
          (error) => { throw new Error(error); }
        );
      });

    } catch (error: any) {
      setError(error.message || 'Login failed');
    }
  };

  const handleSignup = async () => {
    try {
      setError('');
      setMessage('');

      const email = signupForm.fields.email?.value || '';
      const password = signupForm.fields.password?.value || '';

      const emailValidation = signupForm.validateField('email', email, 'email');
      const passwordValidation = signupForm.validateField('password', password, 'password');

      if (!emailValidation.isValid || !passwordValidation.isValid) {
        setError('Please fix the validation errors above');
        return;
      }

      await signupForm.submitForm(async () => {
        await AuthController.handleSignup(
          { email: emailValidation.sanitizedValue!, password },
          (message) => setMessage(message),
          (error) => { throw new Error(error); }
        );
      });

    } catch (error: any) {
      setError(error.message || 'Signup failed');
    }
  };

  return {
    loginForm,
    signupForm,
    error,
    message,
    handleLogin,
    handleSignup
  };
};
