/**
 * URL Utilities
 *
 * Functions for URL manipulation and OData URL handling.
 */

import { ODATA_PATTERNS } from '../constants/odata';
import type { FilterOperator, ODataQueryParams, ParsedFilter } from '../types';

/**
 * Safely decode a URL
 */
export const decodeUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    try {
        return decodeURIComponent(url);
    } catch {
        return url;
    }
};

/**
 * Safely encode a URL component
 */
export const encodeUrlComponent = (str: string | null | undefined): string => {
    if (!str) return '';
    try {
        return encodeURIComponent(str);
    } catch {
        return str;
    }
};

/**
 * Result of parsing an OData URL
 */
export interface ParsedODataUrl {
    entitySet: string | null;
    path: string;
    filters: {
        raw?: string;
        parsed?: ParsedFilter[];
    };
    queryParams: ODataQueryParams;
}

/**
 * Parse OData URL into components
 */
export const parseODataUrl = (url: string | null | undefined): ParsedODataUrl => {
    if (!url) {
        return { entitySet: null, path: '', filters: {}, queryParams: {} };
    }

    const [path, queryString] = url.split('?');

    // Extract entity set from path (first segment)
    const entitySet = path.replace(/^\//, '').split('/')[0].split('(')[0] || null;

    // Parse query parameters
    const queryParams: ODataQueryParams = {};
    const filters: ParsedODataUrl['filters'] = {};

    if (queryString) {
        const params = new URLSearchParams(queryString);

        for (const [key, value] of params.entries()) {
            if (key === '$filter') {
                filters.raw = value;
                filters.parsed = parseODataFilter(value);
            } else if (key === '$select') {
                queryParams.$select = value.split(',').map((s) => s.trim());
            } else if (key === '$expand') {
                queryParams.$expand = value.split(',').map((s) => s.trim());
            } else if (key === '$orderby') {
                queryParams.$orderby = value;
            } else if (key === '$top') {
                queryParams.$top = Number.parseInt(value, 10);
            } else if (key === '$skip') {
                queryParams.$skip = Number.parseInt(value, 10);
            } else if (key === '$count' || key === '$inlinecount') {
                queryParams.$count = value;
            } else {
                queryParams[key] = value;
            }
        }
    }

    return { entitySet, path, filters, queryParams };
};

/**
 * Parse OData $filter expression
 */
export const parseODataFilter = (filterStr: string | null | undefined): ParsedFilter[] => {
    if (!filterStr) return [];

    const filters: ParsedFilter[] = [];

    // Simple regex-based parsing for common filter patterns
    const simplePattern =
        /(\w+)\s+(eq|ne|gt|ge|lt|le)\s+('[^']*'|\d+|true|false|null|datetimeoffset'[^']*'|datetime'[^']*'|guid'[^']*')/gi;

    let match: RegExpExecArray | null;
    while ((match = simplePattern.exec(filterStr)) !== null) {
        let value = match[3];

        // Clean up the value
        if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
        }

        // Handle datetime values
        let formattedDate: string | null = null;
        if (value.includes('datetime') || value.includes('datetimeoffset')) {
            const dateMatch = value.match(/datetime(?:offset)?'([^']+)'/i);
            if (dateMatch) {
                try {
                    const date = new Date(dateMatch[1]);
                    if (!Number.isNaN(date.getTime())) {
                        formattedDate = date.toLocaleString();
                    }
                } catch {
                    // Keep original value
                }
            }
        }

        filters.push({
            field: match[1],
            operator: match[2].toLowerCase() as FilterOperator,
            value,
            formattedDate
        });
    }

    // If no matches found, return raw filter
    if (filters.length === 0 && filterStr.trim()) {
        filters.push({ raw: filterStr });
    }

    return filters;
};

/**
 * Check if URL is an OData request
 */
export const isODataUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;

    const odataPatterns = [
        ODATA_PATTERNS.BATCH,
        ODATA_PATTERNS.METADATA,
        ODATA_PATTERNS.COUNT,
        /\$filter=/i,
        /\$select=/i,
        /\$expand=/i,
        /\$orderby=/i,
        /\$top=/i,
        /\$skip=/i,
        ODATA_PATTERNS.SAP_ODATA,
        ODATA_PATTERNS.GENERIC_ODATA
    ];

    return odataPatterns.some((pattern) => pattern.test(url));
};

/**
 * Check if URL is a batch request
 */
export const isBatchUrl = (url: string): boolean => {
    return ODATA_PATTERNS.BATCH.test(url);
};

/**
 * Check if URL is a metadata request
 */
export const isMetadataUrl = (url: string): boolean => {
    return ODATA_PATTERNS.METADATA.test(url);
};

/**
 * Build OData URL from components
 */
export const buildODataUrl = (baseUrl: string, entitySet: string, params: Partial<ODataQueryParams> = {}): string => {
    let url = `${baseUrl.replace(/\/$/, '')}/${entitySet}`;

    const queryParts: string[] = [];

    if (params.$select?.length) {
        queryParts.push(`$select=${params.$select.join(',')}`);
    }
    if (params.$expand?.length) {
        queryParts.push(`$expand=${params.$expand.join(',')}`);
    }
    if (params.$filter) {
        queryParts.push(`$filter=${encodeUrlComponent(params.$filter)}`);
    }
    if (params.$orderby) {
        queryParts.push(`$orderby=${encodeUrlComponent(params.$orderby)}`);
    }
    if (params.$top !== undefined) {
        queryParts.push(`$top=${params.$top}`);
    }
    if (params.$skip !== undefined) {
        queryParts.push(`$skip=${params.$skip}`);
    }
    if (params.$format) {
        queryParts.push(`$format=${params.$format}`);
    }
    if (params.$count) {
        queryParts.push(`$count=${params.$count}`);
    }

    if (queryParts.length > 0) {
        url += `?${queryParts.join('&')}`;
    }

    return url;
};

/**
 * Get full request URL for batch items
 */
export const getFullRequestUrl = (
    item: { batch?: boolean; url: string; request?: { url?: string } },
    options: { appendFormat?: boolean } = { appendFormat: true }
): string => {
    let url: string;

    if (item.batch && item.request?.url) {
        // For batch items, construct full URL from base + individual path
        const baseUrl = item.url.replace(/\/?\$batch\/?$/, '/');
        const individualPath = item.request.url.replace(/^\//, '');
        url = baseUrl + individualPath;
    } else {
        url = item.url || '';
    }

    // Append $format=json if requested and not already present
    // Skip for $count calls which return plain numbers
    if (options.appendFormat && url && !url.includes('$format=') && !url.includes('$count')) {
        url += url.includes('?') ? '&$format=json' : '?$format=json';
    }

    return url;
};

/**
 * Extract service URL from metadata URL
 */
export const getServiceUrl = (metadataUrl: string): string => {
    return metadataUrl.replace(/\/?\$metadata.*$/i, '');
};

/**
 * Extract entity set name from URL path
 */
export const extractEntitySet = (url: string): string | null => {
    const parsed = parseODataUrl(url);
    return parsed.entitySet;
};
