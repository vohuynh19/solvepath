'use client';
import * as React from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftSlot, rightSlot, ...props }, ref) => {
    if (leftSlot || rightSlot) {
      return (
        <div className="relative flex items-center">
          {leftSlot && (
            <div className="absolute left-3 flex items-center text-muted pointer-events-none">
              {leftSlot}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-8 w-full rounded-md border border-border bg-bg px-3 py-1 text-sm text-text placeholder:text-placeholder transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40',
              leftSlot && 'pl-9',
              rightSlot && 'pr-9',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightSlot && (
            <div className="absolute right-3 flex items-center text-muted">
              {rightSlot}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full rounded-md border border-border bg-bg px-3 py-1 text-sm text-text placeholder:text-placeholder transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
