/**
 * HTTP Constants
 *
 * HTTP methods, status codes, and content types used throughout
 * the OData Inspector extension.
 */

import type { HttpMethod, StatusCodeRange } from '../types';

/**
 * HTTP Methods
 */
export const HTTP_METHODS: Record<string, HttpMethod> = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS',
    MERGE: 'MERGE' // OData specific
} as const;

/**
 * HTTP Status Code Ranges
 */
export const STATUS_CODES = {
    SUCCESS: { min: 200, max: 299 },
    REDIRECT: { min: 300, max: 399 },
    CLIENT_ERROR: { min: 400, max: 499 },
    SERVER_ERROR: { min: 500, max: 599 }
} as const;

/**
 * Get status code range classification
 */
export const getStatusRange = (status: number): StatusCodeRange => {
    if (status >= 200 && status <= 299) return 'success';
    if (status >= 300 && status <= 399) return 'redirect';
    if (status >= 400 && status <= 499) return 'client-error';
    return 'server-error';
};

/**
 * Check if status code indicates success
 */
export const isSuccessStatus = (status: number): boolean => {
    return status >= STATUS_CODES.SUCCESS.min && status <= STATUS_CODES.SUCCESS.max;
};

/**
 * Content Types
 */
export const CONTENT_TYPES = {
    JSON: 'application/json',
    XML: 'application/xml',
    ATOM_XML: 'application/atom+xml',
    MULTIPART_MIXED: 'multipart/mixed',
    TEXT_PLAIN: 'text/plain',
    FORM_URLENCODED: 'application/x-www-form-urlencoded'
} as const;

/**
 * Get HTTP method badge color class name
 */
export const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
        GET: 'bg-method-get',
        POST: 'bg-method-post',
        PUT: 'bg-method-put',
        PATCH: 'bg-method-patch',
        DELETE: 'bg-method-delete',
        HEAD: 'bg-method-head',
        OPTIONS: 'bg-method-get',
        MERGE: 'bg-method-put'
    };
    return colors[method.toUpperCase()] || 'bg-foreground-muted';
};
