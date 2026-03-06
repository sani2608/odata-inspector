/**
 * Input Component - Modern shadcn/ui style
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'flex h-9 w-full rounded-lg border input-theme px-3 py-2 text-sm shadow-sm transition-all duration-200',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'text-foreground-primary placeholder:text-foreground-muted',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = 'Input';

export { Input };
