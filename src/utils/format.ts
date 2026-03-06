/**
 * Format Utilities
 *
 * Functions for formatting dates, durations, sizes, and OData operators.
 */

import { OPERATOR_DISPLAY } from '../constants/odata';
import { DURATION_THRESHOLDS } from '../constants/ui';
import type { FilterOperator } from '../types';

/**
 * Format OData operator for display
 */
export const formatOperator = (op: FilterOperator | string): string => {
    return OPERATOR_DISPLAY[op as FilterOperator] || op;
};

/**
 * Format duration in milliseconds to human-readable string
 */
export const formatDuration = (duration: number | null | undefined): string => {
    if (duration === null || duration === undefined) return '';
    if (duration >= 1000) {
        return `${(duration / 1000).toFixed(1)}s`;
    }
    return `${Math.round(duration)}ms`;
};

/**
 * Get duration class for styling
 */
export const getDurationClass = (duration: number): 'duration-fast' | 'duration-medium' | 'duration-slow' => {
    if (duration < DURATION_THRESHOLDS.FAST) return 'duration-fast';
    if (duration <= DURATION_THRESHOLDS.MEDIUM) return 'duration-medium';
    return 'duration-slow';
};

/**
 * Format timestamp for display (HH:MM:SS)
 */
export const formatTimestamp = (timestamp: string | number | Date | null | undefined): string => {
    if (!timestamp) return '';

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return String(timestamp);

    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * Format date for display
 */
export const formatDate = (date: string | number | Date | null | undefined): string => {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);

    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Format date and time together
 */
export const formatDateTime = (date: string | number | Date | null | undefined): string => {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);

    return `${formatDate(d)} ${formatTimestamp(d)}`;
};

/**
 * Format file size in bytes to human-readable string
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
    if (bytes === 0) return '0 B';
    if (!bytes) return '';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

/**
 * Truncate string with ellipsis
 */
export const truncate = (str: string | null | undefined, maxLength = 50): string => {
    if (!str || str.length <= maxLength) return str || '';
    return `${str.substring(0, maxLength - 3)}...`;
};

/**
 * Format HTTP status code with text
 */
export const formatStatus = (statusCode: number | string, statusText?: string): string => {
    if (statusText) {
        return `${statusCode} ${statusText}`;
    }
    return String(statusCode);
};

/**
 * Format JSON for display (pretty print)
 */
export const formatJson = (data: unknown, indent = 2): string => {
    try {
        return JSON.stringify(data, null, indent);
    } catch {
        return String(data);
    }
};

/**
 * Format a number with thousand separators
 */
export const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
};

/**
 * Pluralize a word based on count
 */
export const pluralize = (count: number, singular: string, plural?: string): string => {
    const pluralForm = plural || `${singular}s`;
    return count === 1 ? singular : pluralForm;
};
