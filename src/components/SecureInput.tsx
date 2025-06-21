
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecureInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  isValid?: boolean;
  placeholder?: string;
  required?: boolean;
  showSecurityIndicator?: boolean;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  label,
  type,
  value,
  onChange,
  error,
  isValid = true,
  placeholder,
  required,
  showSecurityIndicator
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [inputType, setInputType] = useState(type);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    setInputType(showPassword ? 'password' : 'text');
  };

  const getSecurityLevel = () => {
    if (type === 'password' && value) {
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      const isLongEnough = value.length >= 8;
      
      const criteria = [hasUpper, hasLower, hasNumber, hasSpecial, isLongEnough];
      const score = criteria.filter(Boolean).length;
      
      if (score >= 4) return { level: 'HIGH', color: 'text-green-600' };
      if (score >= 3) return { level: 'MEDIUM', color: 'text-yellow-600' };
      return { level: 'LOW', color: 'text-red-600' };
    }
    return null;
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase()} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={label.toLowerCase()}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`pr-10 ${error ? 'border-red-500 focus:ring-red-500' : ''} ${
            isValid && !error ? 'border-green-500' : ''
          }`}
        />
        
        {type === 'password' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={togglePasswordVisibility}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {showSecurityIndicator && !error && isValid && (
          <Shield className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
        
        {error && (
          <AlertTriangle className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
        )}
      </div>
      
      {securityLevel && showSecurityIndicator && (
        <div className={`text-xs ${securityLevel.color} flex items-center gap-1`}>
          <Shield className="h-3 w-3" />
          Password Strength: {securityLevel.level}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};
