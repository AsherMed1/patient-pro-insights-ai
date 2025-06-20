
import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

interface SecurityEnhancedAuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const SecurityEnhancedAuthForm = ({ mode, onToggleMode }: SecurityEnhancedAuthFormProps) => {
  return (
    <AuthForm 
      mode={mode} 
      onToggleMode={onToggleMode}
    />
  );
};
