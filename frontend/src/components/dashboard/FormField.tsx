'use client';

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string | ReactNode;
  showLockIcon?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className = '', showLockIcon = false, ...props }, ref) => {
    const isLocked = showLockIcon && props.disabled;
    
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 
              bg-black rounded-lg
              text-white text-sm
              placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
              transition-all
              ${className.includes('border-') ? '' : 'border border-gray-700'}
              ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
              ${className}
              ${isLocked ? 'pr-10' : ''}
            `}
            {...props}
          />
          {isLocked && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <div className="text-xs text-gray-400">{helperText}</div>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

