/**
 * Utility Functions for UI Components
 *
 * These utilities are used throughout the UI component library
 * for class name management and styling.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS support
 *
 * Combines clsx for conditional classes with tailwind-merge
 * to handle conflicting Tailwind utility classes properly.
 *
 * @example
 * cn('px-4', 'px-6') // => 'px-6' (later class wins)
 * cn('text-red-500', isError && 'text-red-700')
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
