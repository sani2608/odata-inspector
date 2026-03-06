/**
 * Badge Component - Modern shadcn/ui style
 */

import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                // Primary accent badge
                default: 'badge-primary-theme text-white shadow-md',
                secondary: 'badge-secondary-theme border',
                destructive: 'badge-destructive-theme text-white shadow-md',
                outline: 'badge-outline-theme border',
                // Primary accent - brand blue
                primary: 'badge-primary-theme text-white shadow-md',
                // Status variants - theme-aware
                success: 'badge-success-theme border',
                warning: 'badge-warning-theme border',
                error: 'badge-error-theme border',
                // HTTP method badges - theme-aware
                get: 'badge-get-theme border',
                post: 'badge-post-theme border',
                put: 'badge-put-theme border',
                patch: 'badge-patch-theme border',
                delete: 'badge-delete-theme border',
                // Metadata badge - theme-aware
                meta: 'badge-meta-theme border'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
