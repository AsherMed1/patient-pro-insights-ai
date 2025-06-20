
import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

interface SecurityEnhancedAuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const SecurityEnhancedAuthForm = ({ mode, onToggleMode }: SecurityEnhancedAuthFormProps) => {
  return (
    <div className="space-y-4">
      <AuthForm 
        mode={mode} 
        onToggleMode={onToggleMode}
      />
    </div>
  );
};
