/**
 * Request Executor
 *
 * Executes OData requests from the Request Builder using Chrome DevTools API.
 *
 * ★ Insight ─────────────────────────────────────
 * - Uses chrome.devtools.inspectedWindow.eval() to execute fetch in page context
 * - This allows requests to inherit the page's cookies and authentication
 * - Polling pattern used because DevTools eval is async with callbacks
 * - Results are extracted from OData V2 wrapper (d.results or d)
 * ─────────────────────────────────────────────────
 */

import type { HttpMethod } from '../../types';

/**
 * Response from an executed request
 */
export interface ExecuteResponse {
    /** Whether the request succeeded (2xx status) */
    ok: boolean;
    /** HTTP status code */
    status: number;
    /** HTTP status text */
    statusText: string;
    /** Raw response data */
    data: unknown;
    /** Unwrapped OData data (without d/results wrapper) */
    displayData: unknown;
    /** Request duration in milliseconds */
    duration: number;
    /** Response headers (lowercase keys) */
    headers?: Record<string, string>;
}

/**
 * Options for request execution
 */
export interface ExecuteOptions {
    /** Callback when request starts */
    onStart?: () => void;
    /** Callback on successful response */
    onSuccess?: (response: ExecuteResponse) => void;
    /** Callback on error */
    onError?: (response: ExecuteResponse) => void;
    /** Request headers */
    headers?: Record<string, string>;
    /** Request body for POST/PUT/PATCH */
    body?: unknown;
    /** Timeout in milliseconds (default 30000) */
    timeout?: number;
}

/**
 * Execute a request using Chrome DevTools inspectedWindow.
 * Runs fetch() in the context of the inspected page.
 */
export async function executeRequest(
    url: string,
    method: HttpMethod | string = 'GET',
    options: ExecuteOptions = {}
): Promise<ExecuteResponse> {
    const { onStart, onSuccess, onError, headers = {}, body, timeout = 30000 } = options;
    const startTime = performance.now();

    if (onStart) onStart();

    // Check if Chrome DevTools API is available
    if (typeof chrome === 'undefined' || !chrome.devtools?.inspectedWindow) {
        const errorResult: ExecuteResponse = {
            ok: false,
            status: 0,
            statusText: 'DevTools API not available',
            data: { error: 'Chrome DevTools API is not available in this context' },
            displayData: null,
            duration: 0
        };
        if (onError) onError(errorResult);
        throw errorResult;
    }

    try {
        // Create a unique callback name
        const callbackName = `_odataBuilderCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // Escape URL for injection
        const escapedUrl = url.replace(/'/g, "\\'");

        // Build headers object
        const requestHeaders = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...headers
        };

        // Build fetch options
        const fetchOptions: RequestInit = {
            method,
            headers: requestHeaders,
            credentials: 'include'
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const fetchOptionsJson = JSON.stringify({
            method,
            headers: requestHeaders,
            credentials: 'include',
            body: fetchOptions.body
        });

        // Setup callback holder
        const setupCallback = `window['${callbackName}'] = null;`;

        // Fetch code to execute in page context
        const fetchCode = `
            (function() {
                fetch('${escapedUrl}', ${fetchOptionsJson})
                .then(function(response) {
                    return response.text().then(function(text) {
                        var data;
                        try {
                            data = JSON.parse(text);
                        } catch(e) {
                            data = text;
                        }
                        // Extract response headers (lowercase keys for consistency)
                        var headers = {};
                        response.headers.forEach(function(value, key) {
                            headers[key.toLowerCase()] = value;
                        });
                        window['${callbackName}'] = {
                            ok: response.ok,
                            status: response.status,
                            statusText: response.statusText,
                            data: data,
                            headers: headers
                        };
                    });
                })
                .catch(function(error) {
                    window['${callbackName}'] = {
                        ok: false,
                        status: 0,
                        statusText: 'Network Error',
                        data: { error: error.message },
                        headers: {}
                    };
                });
                return 'pending';
            })()
        `;

        return new Promise((resolve, reject) => {
            // Setup the callback holder
            chrome.devtools.inspectedWindow.eval(setupCallback);

            // Execute the fetch
            chrome.devtools.inspectedWindow.eval(fetchCode);

            const startPoll = Date.now();

            // Poll for result
            const pollForResult = () => {
                // Check timeout
                if (Date.now() - startPoll > timeout) {
                    const endTime = performance.now();
                    const duration = Math.round(endTime - startTime);
                    const timeoutResult: ExecuteResponse = {
                        ok: false,
                        status: 0,
                        statusText: 'Timeout',
                        data: { error: 'Request timed out' },
                        displayData: null,
                        duration
                    };

                    // Cleanup
                    chrome.devtools.inspectedWindow.eval(`delete window['${callbackName}']`);

                    if (onError) onError(timeoutResult);
                    reject(timeoutResult);
                    return;
                }

                chrome.devtools.inspectedWindow.eval(
                    `window['${callbackName}']`,
                    (
                        result: {
                            ok: boolean;
                            status: number;
                            statusText: string;
                            data: unknown;
                            headers?: Record<string, string>;
                        } | null,
                        error
                    ) => {
                        if (error) {
                            const endTime = performance.now();
                            const duration = Math.round(endTime - startTime);
                            // error is EvaluationExceptionInfo which has description, not message
                            const errorMessage =
                                typeof error === 'object' && error !== null && 'description' in error
                                    ? String((error as { description: string }).description)
                                    : 'Failed to execute request';
                            const errorResult: ExecuteResponse = {
                                ok: false,
                                status: 0,
                                statusText: 'Error',
                                data: { error: errorMessage },
                                displayData: null,
                                duration
                            };

                            // Cleanup
                            chrome.devtools.inspectedWindow.eval(`delete window['${callbackName}']`);

                            if (onError) onError(errorResult);
                            reject(errorResult);
                            return;
                        }

                        if (result === null) {
                            // Still waiting, poll again
                            setTimeout(pollForResult, 100);
                            return;
                        }

                        const endTime = performance.now();
                        const duration = Math.round(endTime - startTime);

                        // Extract OData data (unwrap d and results)
                        let displayData = result.data;
                        if (displayData && typeof displayData === 'object') {
                            const dataObj = displayData as Record<string, unknown>;
                            if ('d' in dataObj) {
                                displayData = dataObj.d;
                                if (displayData && typeof displayData === 'object') {
                                    const dObj = displayData as Record<string, unknown>;
                                    if ('results' in dObj) {
                                        displayData = dObj.results;
                                    }
                                }
                            }
                        }

                        const response: ExecuteResponse = {
                            ok: result.ok,
                            status: result.status,
                            statusText: result.statusText,
                            data: result.data,
                            displayData,
                            duration,
                            headers: result.headers
                        };

                        // Cleanup
                        chrome.devtools.inspectedWindow.eval(`delete window['${callbackName}']`);

                        if (response.ok) {
                            if (onSuccess) onSuccess(response);
                            resolve(response);
                        } else {
                            if (onError) onError(response);
                            reject(response);
                        }
                    }
                );
            };

            // Start polling after a short delay
            setTimeout(pollForResult, 200);
        });
    } catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        const errorResult: ExecuteResponse = {
            ok: false,
            status: 0,
            statusText: 'Error',
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
            displayData: null,
            duration
        };

        if (onError) onError(errorResult);
        throw errorResult;
    }
}

/**
 * Mock executor for testing and development outside DevTools context
 */
export async function executeMockRequest(
    _url: string,
    _method: HttpMethod | string = 'GET',
    options: ExecuteOptions = {}
): Promise<ExecuteResponse> {
    const { onStart, onSuccess } = options;
    const startTime = performance.now();

    if (onStart) onStart();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // Return mock response
    const mockResponse: ExecuteResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        data: {
            d: {
                results: [
                    { ID: '1', Name: 'Mock Item 1' },
                    { ID: '2', Name: 'Mock Item 2' }
                ]
            }
        },
        displayData: [
            { ID: '1', Name: 'Mock Item 1' },
            { ID: '2', Name: 'Mock Item 2' }
        ],
        duration
    };

    if (onSuccess) onSuccess(mockResponse);
    return mockResponse;
}

export default executeRequest;
