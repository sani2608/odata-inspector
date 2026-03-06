/**
 * CSRF Token Service
 *
 * Handles SAP OData CSRF token management for modifying requests (POST/PUT/PATCH/DELETE).
 *
 * ★ Insight ─────────────────────────────────────
 * - SAP OData services require x-csrf-token for state-changing operations
 * - Token is fetched via GET with 'x-csrf-token: Fetch' header
 * - Tokens are cached per-service (not per-domain) with 30-min validity
 * - Auto-retry on 403 handles token expiry transparently
 * ─────────────────────────────────────────────────
 */

import type { HttpMethod } from '../../types';
import { type ExecuteOptions, type ExecuteResponse, executeRequest } from './requestExecutor';

/** CSRF token cache entry */
interface CsrfToken {
    token: string;
    fetchedAt: number;
}

/** Token validity duration (30 minutes) */
const TOKEN_VALIDITY_MS = 30 * 60 * 1000;

/** CSRF token header name */
const CSRF_HEADER = 'x-csrf-token';

/** In-memory token cache keyed by service root URL */
const tokenCache = new Map<string, CsrfToken>();

/** Pending token fetch promises (prevents duplicate fetches) */
const pendingFetches = new Map<string, Promise<string>>();

/**
 * Extract the OData service root URL from a full request URL.
 * This is used as the cache key for CSRF tokens.
 *
 * Examples:
 * - /sap/opu/odata/sap/ZRW0_PLAN_SCHED_SRV/CreateFollowUpWorkOrder → /sap/opu/odata/sap/ZRW0_PLAN_SCHED_SRV
 * - https://host/sap/opu/odata/sap/MY_SERVICE/EntitySet → https://host/sap/opu/odata/sap/MY_SERVICE
 */
export function extractServiceRootUrl(url: string): string {
    // Try SAP standard path pattern: /sap/opu/odata/{namespace}/{service}
    const sapMatch = url.match(/(.*\/sap\/opu\/odata\/\w+\/\w+)/i);
    if (sapMatch) {
        return sapMatch[1];
    }

    // Try generic OData pattern: remove last path segment
    const lastSlash = url.lastIndexOf('/');
    if (lastSlash > 0) {
        // Check if there's a query string
        const queryStart = url.indexOf('?');
        const pathEnd = queryStart > 0 ? queryStart : url.length;
        const pathPart = url.substring(0, pathEnd);
        const pathLastSlash = pathPart.lastIndexOf('/');
        if (pathLastSlash > 0) {
            return pathPart.substring(0, pathLastSlash);
        }
    }

    return url;
}

/**
 * Check if an HTTP method requires a CSRF token.
 */
export function requiresCsrfToken(method: string): boolean {
    const upperMethod = method.toUpperCase();
    return ['POST', 'PUT', 'PATCH', 'DELETE', 'MERGE'].includes(upperMethod);
}

/**
 * Get a cached CSRF token for a service URL if it exists and is still valid.
 */
export function getCachedToken(serviceUrl: string): CsrfToken | null {
    const cached = tokenCache.get(serviceUrl);
    if (!cached) return null;

    const age = Date.now() - cached.fetchedAt;
    if (age > TOKEN_VALIDITY_MS) {
        tokenCache.delete(serviceUrl);
        return null;
    }

    return cached;
}

/**
 * Invalidate (remove) a cached token for a service URL.
 * Call this when a request fails with 403 CSRF error.
 */
export function invalidateToken(serviceUrl: string): void {
    tokenCache.delete(serviceUrl);
}

/**
 * Try to extract token from a response.
 */
function extractTokenFromResponse(response: ExecuteResponse): string | null {
    const token = response.headers?.[CSRF_HEADER];
    if (token && token.toLowerCase() !== 'required') {
        return token;
    }
    return null;
}

/**
 * Fetch a fresh CSRF token from the server.
 * Tries service root first, then $metadata if that fails.
 */
export async function fetchCsrfToken(serviceUrl: string): Promise<string> {
    // Check if there's already a pending fetch for this service
    const pending = pendingFetches.get(serviceUrl);
    if (pending) {
        console.log('[CSRF] Reusing pending fetch for:', serviceUrl);
        return pending;
    }

    console.log('[CSRF] ===== Starting token fetch =====');
    console.log('[CSRF] Service URL:', serviceUrl);

    const fetchPromise = (async () => {
        try {
            // Try fetching from service root first
            let response: ExecuteResponse | null = null;

            console.log('[CSRF] Attempting GET to service root...');
            try {
                response = await executeRequest(serviceUrl, 'GET', {
                    headers: { [CSRF_HEADER]: 'Fetch' }
                });
                console.log('[CSRF] Service root GET succeeded');
            } catch (err) {
                console.log('[CSRF] Service root GET threw:', err);
                // Check if err is an ExecuteResponse (rejected due to non-2xx)
                if (err && typeof err === 'object' && 'status' in err) {
                    response = err as ExecuteResponse;
                    console.log('[CSRF] Using error response, status:', response.status);
                } else {
                    console.error('[CSRF] Unexpected error type:', typeof err, err);
                    throw err;
                }
            }

            if (response) {
                console.log('[CSRF] Service root response details:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    headersExist: !!response.headers,
                    headerKeys: response.headers ? Object.keys(response.headers) : [],
                    csrfHeader: response.headers?.[CSRF_HEADER]
                });

                const token = extractTokenFromResponse(response);
                if (token) {
                    tokenCache.set(serviceUrl, { token, fetchedAt: Date.now() });
                    console.log('[CSRF] ✓ Token obtained from service root');
                    return token;
                }
                console.log('[CSRF] No token in service root response');
            }

            // Try $metadata endpoint as fallback
            const metadataUrl = `${serviceUrl}/$metadata`;
            console.log('[CSRF] Trying $metadata endpoint:', metadataUrl);

            try {
                response = await executeRequest(metadataUrl, 'GET', {
                    headers: { [CSRF_HEADER]: 'Fetch' }
                });
                console.log('[CSRF] $metadata GET succeeded');
            } catch (err) {
                console.log('[CSRF] $metadata GET threw:', err);
                if (err && typeof err === 'object' && 'status' in err) {
                    response = err as ExecuteResponse;
                } else {
                    throw err;
                }
            }

            if (response) {
                console.log('[CSRF] $metadata response details:', {
                    status: response.status,
                    headersExist: !!response.headers,
                    headerKeys: response.headers ? Object.keys(response.headers) : [],
                    csrfHeader: response.headers?.[CSRF_HEADER]
                });

                const token = extractTokenFromResponse(response);
                if (token) {
                    tokenCache.set(serviceUrl, { token, fetchedAt: Date.now() });
                    console.log('[CSRF] ✓ Token obtained from $metadata');
                    return token;
                }
            }

            const errorMsg = `No CSRF token found. Headers: ${JSON.stringify(response?.headers || {})}`;
            console.error('[CSRF] ✗', errorMsg);
            throw new Error(errorMsg);
        } finally {
            pendingFetches.delete(serviceUrl);
            console.log('[CSRF] ===== Token fetch complete =====');
        }
    })();

    pendingFetches.set(serviceUrl, fetchPromise);
    return fetchPromise;
}

/**
 * Check if a response indicates a CSRF token validation failure.
 */
function isCsrfError(response: ExecuteResponse): boolean {
    if (response.status !== 403) return false;

    // Check for SAP CSRF error indicators
    const data = response.data;
    if (typeof data === 'object' && data !== null) {
        const dataObj = data as Record<string, unknown>;
        // SAP often returns error details in various formats
        const errorMessage = JSON.stringify(dataObj).toLowerCase();
        return (
            errorMessage.includes('csrf') ||
            errorMessage.includes('cross-site request forgery') ||
            errorMessage.includes('token validation')
        );
    }

    return false;
}

/**
 * Execute a request with automatic CSRF token handling.
 *
 * For modifying requests (POST/PUT/PATCH/DELETE):
 * 1. Check for cached token
 * 2. If no cached token, fetch one first
 * 3. Execute the request with the token
 * 4. If 403 CSRF error, fetch fresh token and retry once
 */
export async function csrfAwareExecute(
    url: string,
    method: HttpMethod | string = 'GET',
    options: ExecuteOptions = {}
): Promise<ExecuteResponse> {
    // For GET/HEAD requests, no CSRF token needed
    if (!requiresCsrfToken(method)) {
        return executeRequest(url, method, options);
    }

    const serviceUrl = extractServiceRootUrl(url);
    console.log('[CSRF] csrfAwareExecute called:', { url, method, serviceUrl });

    // Track if we've already retried (to prevent infinite loops)
    let hasRetried = false;

    // Try to get cached token or fetch a new one
    let currentToken: string | null = null;
    const cachedToken = getCachedToken(serviceUrl);

    if (cachedToken) {
        console.log('[CSRF] Using cached token');
        currentToken = cachedToken.token;
    } else {
        try {
            currentToken = await fetchCsrfToken(serviceUrl);
            console.log('[CSRF] Fetched new token successfully');
        } catch (fetchErr) {
            // If token fetch fails, proceed without token
            console.warn('[CSRF] Failed to fetch token, proceeding without it:', fetchErr);
        }
    }

    // Merge CSRF token into headers
    const headers = { ...options.headers };
    if (currentToken) {
        headers[CSRF_HEADER] = currentToken;
        console.log('[CSRF] Added token to request headers');
    }

    // Execute the request
    let response: ExecuteResponse;
    try {
        response = await executeRequest(url, method, { ...options, headers });
    } catch (err) {
        response = err as ExecuteResponse;
    }

    // Check if this is a CSRF error and we should retry
    if (!response.ok && isCsrfError(response) && !hasRetried) {
        console.log('[CSRF] Token validation failed (403), fetching fresh token and retrying...');
        hasRetried = true;
        invalidateToken(serviceUrl);

        try {
            const freshToken = await fetchCsrfToken(serviceUrl);
            headers[CSRF_HEADER] = freshToken;
            console.log('[CSRF] Retrying request with fresh token');

            try {
                response = await executeRequest(url, method, { ...options, headers });
            } catch (retryErr) {
                response = retryErr as ExecuteResponse;
            }
        } catch (tokenErr) {
            console.error('[CSRF] Failed to fetch fresh token for retry:', tokenErr);
            // Return the original CSRF error
        }
    }

    return response;
}

/**
 * Get the current token status for a service URL.
 * Useful for UI indicators.
 */
export function getTokenStatus(url: string): 'none' | 'valid' | 'expired' {
    const serviceUrl = extractServiceRootUrl(url);
    const cached = tokenCache.get(serviceUrl);

    if (!cached) return 'none';

    const age = Date.now() - cached.fetchedAt;
    return age > TOKEN_VALIDITY_MS ? 'expired' : 'valid';
}

/**
 * Clear all cached tokens.
 * Useful for testing or when session changes.
 */
export function clearAllTokens(): void {
    tokenCache.clear();
}

/**
 * Cache a CSRF token extracted from response headers.
 * This is used to piggyback on the page's own metadata fetch.
 *
 * @param serviceUrl - The OData service URL
 * @param headers - Response headers (object with header names as keys)
 * @returns true if a token was found and cached
 */
export function cacheTokenFromHeaders(serviceUrl: string, headers: Record<string, string>): boolean {
    // Look for x-csrf-token in headers (case-insensitive)
    const headerKeys = Object.keys(headers);
    const csrfKey = headerKeys.find((k) => k.toLowerCase() === 'x-csrf-token');

    if (!csrfKey) {
        return false;
    }

    const token = headers[csrfKey];
    if (!token || token.toLowerCase() === 'required') {
        return false;
    }

    console.log('[CSRF] ✓ Cached token from captured metadata response for:', serviceUrl);
    tokenCache.set(serviceUrl, {
        token,
        fetchedAt: Date.now()
    });

    return true;
}

export default csrfAwareExecute;
