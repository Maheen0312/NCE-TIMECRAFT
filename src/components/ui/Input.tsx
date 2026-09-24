import React, { useRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, value, defaultValue, type, ...props }, ref) => {
    // For file inputs, value should not be controlled by string state
    if (type === 'file') {
      return (
        <div className="flex flex-col space-y-1.5 w-full">
          {label && (
            <label className="text-sm font-medium text-luna-dark-navy dark:text-slate-200">
              {label}
            </label>
          )}
          <input
            ref={ref}
            type="file"
            className={cn(
              "flex h-10 w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            {...props}
          />
          {error && (
            <span className="text-sm text-red-500 dark:text-red-400">{error}</span>
          )}
        </div>
      );
    }

    // Determine and lock controlled vs uncontrolled mode for component lifetime
    const isControlled = useRef(value !== undefined).current;

    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-luna-dark-navy dark:text-slate-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          {...(isControlled
            ? { value: value !== undefined && value !== null ? value : '' }
            : defaultValue !== undefined
            ? { defaultValue }
            : {})}
          className={cn(
            "flex h-10 w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-500 dark:text-red-400">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

