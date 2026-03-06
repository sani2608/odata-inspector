/**
 * Escape Utilities
 *
 * Functions for escaping HTML and regex special characters.
 * Note: In React, most escaping is handled automatically by JSX.
 * These utilities are for cases where raw HTML handling is needed.
 */

/**
 * Escape HTML to prevent XSS attacks
 * Note: Prefer React's JSX which auto-escapes. Use this only
 * when you need to manually handle HTML strings.
 */
export const escapeHtml = (str: unknown): string => {
    if (str === null || str === undefined) return '';

    const strValue = String(str);
    const htmlEscapes: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    return strValue.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
};

/**
 * Escape special regex characters
 */
export const escapeRegex = (string: string | null | undefined): string => {
    if (!string) return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Unescape HTML entities
 */
export const unescapeHtml = (str: string | null | undefined): string => {
    if (!str) return '';

    const htmlUnescapes: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x27;': "'",
        '&#x2F;': '/'
    };

    return str.replace(/&(?:amp|lt|gt|quot|#39|#x27|#x2F);/g, (entity) => htmlUnescapes[entity] || entity);
};

/**
 * Sanitize a string for use as a CSS class name
 */
export const sanitizeClassName = (str: string): string => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

/**
 * Create a safe ID from a string
 */
export const createSafeId = (str: string, prefix = 'id'): string => {
    const sanitized = sanitizeClassName(str);
    return sanitized ? `${prefix}-${sanitized}` : `${prefix}-${Date.now()}`;
};
