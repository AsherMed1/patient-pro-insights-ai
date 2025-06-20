
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield } from 'lucide-react';

interface SecureInputProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  touched?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
  showSecurityIndicator?: boolean;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  touched,
  placeholder,
  required,
  className,
  showSecurityIndicator = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    onChange(e);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const shouldShowError = error && (touched || hasInteracted);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {showSecurityIndicator && (
          <Shield className="h-4 w-4 text-green-600" title="Secure input" />
        )}
      </div>
      
      <div className="relative">
        <Input
          id={label.toLowerCase().replace(/\s+/g, '-')}
          type={inputType}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`${shouldShowError ? 'border-red-500 focus:border-red-500' : ''}`}
          autoComplete={type === 'password' ? 'current-password' : 'off'}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      
      {shouldShowError && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
