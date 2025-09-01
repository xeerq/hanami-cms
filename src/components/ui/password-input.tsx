import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/security';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  showValidation?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, showValidation = false, onValidationChange, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [validation, setValidation] = useState(validatePassword(''));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      if (showValidation) {
        const newValidation = validatePassword(value);
        setValidation(newValidation);
        onValidationChange?.(newValidation.isValid);
      }
      
      onChange?.(e);
    };

    return (
      <div className="space-y-2">
        {label && <Label htmlFor={props.id}>{label}</Label>}
        
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={cn(className)}
            onChange={handleChange}
          />
          
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {showValidation && props.value && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Siła hasła:</span>
              <span className={cn(
                "text-sm font-medium",
                getPasswordStrengthColor(validation.strength)
              )}>
                {getPasswordStrengthText(validation.strength)}
              </span>
            </div>
            
            {validation.errors.length > 0 && (
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-destructive">
                    <X className="h-3 w-3" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}
            
            {validation.isValid && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-3 w-3" />
                <span>Hasło spełnia wszystkie wymagania</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';