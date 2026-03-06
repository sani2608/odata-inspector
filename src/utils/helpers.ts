/**
 * General Helper Utilities
 *
 * Common utility functions used throughout the application.
 */

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function executedFunction(...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
};

/**
 * Generate a unique ID
 */
export const generateId = (prefix = 'id'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => deepClone(item)) as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
};

/**
 * Check if two values are deeply equal
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return a === b;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
};

/**
 * Group array items by a key
 */
export const groupBy = <T, K extends string | number>(items: T[], keyFn: (item: T) => K): Record<K, T[]> => {
    return items.reduce(
        (groups, item) => {
            const key = keyFn(item);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        },
        {} as Record<K, T[]>
    );
};

/**
 * Sort array by multiple keys
 */
export const sortBy = <T>(items: T[], ...keys: ((item: T) => string | number)[]): T[] => {
    return [...items].sort((a, b) => {
        for (const key of keys) {
            const aVal = key(a);
            const bVal = key(b);
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
        }
        return 0;
    });
};

/**
 * Filter array and return unique items
 */
export const unique = <T>(items: T[], keyFn?: (item: T) => unknown): T[] => {
    if (!keyFn) {
        return [...new Set(items)];
    }

    const seen = new Set();
    return items.filter((item) => {
        const key = keyFn(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

/**
 * Safely access nested object properties
 */
export const get = <T>(obj: unknown, path: string, defaultValue?: T): T | undefined => {
    const keys = path.split('.');
    let result: unknown = obj;

    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = (result as Record<string, unknown>)[key];
    }

    return (result as T) ?? defaultValue;
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

/**
 * Clamp a number between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Create a range of numbers
 */
export const range = (start: number, end: number, step = 1): number[] => {
    const result: number[] = [];
    for (let i = start; i < end; i += step) {
        result.push(i);
    }
    return result;
};

/**
 * Sleep for a specified duration
 */
export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 */
export const retry = async <T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; initialDelay?: number; maxDelay?: number } = {}
): Promise<T> => {
    const { maxRetries = 3, initialDelay = 100, maxDelay = 5000 } = options;

    let lastError: Error | undefined;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries) {
                await sleep(delay);
                delay = Math.min(delay * 2, maxDelay);
            }
        }
    }

    throw lastError;
};
