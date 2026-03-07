// TypeScript enabled - Fixed in Phase 4
/**
 * DevTools Network Capture Service
 *
 * Captures and processes OData network requests via Chrome DevTools API.
 *
 * ★ Insight ─────────────────────────────────────
 * - chrome.devtools.network.onRequestFinished gives us HAR entries
 * - HAR (HTTP Archive) contains full request/response data
 * - We connect to background service worker for early request detection
 * - Page navigation clears captured requests automatically
 * ─────────────────────────────────────────────────
 */

import { ODATA_PATTERNS } from '../../constants/odata';
import type {
    HarEntry,
    HarInitiator,
    HttpHeaders,
    HttpMethod,
    ODataMetadata,
    ODataRequest,
    RequestInitiator
} from '../../types';
import { decodeUrl, parseODataUrl } from '../../utils/url';
import {
    createBatchContext,
    extractBoundary,
    flattenBatchRequests,
    flattenBatchResponses,
    readBatchRequests,
    readBatchResponses
} from '../odata/batchParser';
import { cacheTokenFromHeaders } from '../odata/csrfTokenService';
import { extractServiceUrl, parseMetadataXml } from '../odata/metadataParser';

// ============================================================================
// Types
// ============================================================================

export interface CapturedRequest extends ODataRequest {
    _uniqueId: number;
    _pending?: boolean;
    _error?: boolean;
}

export interface NetworkCaptureCallbacks {
    onRequest: (request: CapturedRequest) => void;
    onMetadata: (metadata: ODataMetadata) => void;
    onClear: () => void;
    onPendingUpdate?: (requestId: string, update: Partial<CapturedRequest>) => void;
}

interface BackgroundPort {
    postMessage: (message: unknown) => void;
    onMessage: {
        addListener: (callback: (message: unknown) => void) => void;
    };
    onDisconnect: {
        addListener: (callback: () => void) => void;
    };
}

// ============================================================================
// State
// ============================================================================

let backgroundPort: BackgroundPort | null = null;
let callbacks: NetworkCaptureCallbacks | null = null;
let requestIdCounter = 0;
let batchIdCounter = 0;
let capturedMetadata: ODataMetadata | null = null;
const pendingRequestsMap = new Map<string, Partial<CapturedRequest>>();
const sentRequestIds = new Set<number>();
// Track metadata request IDs by URL for updating when content arrives
const metadataRequestIds = new Map<string, string>();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Delete a key from an object recursively
 */
function deleteKeyDeep<T>(obj: T, keyToDelete: string): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => deleteKeyDeep(item, keyToDelete)) as T;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as object)) {
        if (key !== keyToDelete) {
            result[key] = deleteKeyDeep((obj as Record<string, unknown>)[key], keyToDelete);
        }
    }
    return result as T;
}

/**
 * Parse URL to extract pathname
 */
function parseUrlPath(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        // Fallback for malformed URLs
        const pathMatch = url.match(/^(?:https?:\/\/[^/]+)?(\/.*)$/);
        return pathMatch ? pathMatch[1].split('?')[0] : url;
    }
}

/**
 * Convert HAR headers array to object
 */
function headersArrayToObject(headers: Array<{ name: string; value: string }>): HttpHeaders {
    const result: HttpHeaders = {};
    for (const header of headers || []) {
        result[header.name] = header.value;
    }
    return result;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(dateStr: string): string {
    try {
        return new Date(dateStr).toTimeString().split(' ')[0];
    } catch {
        return '';
    }
}

/**
 * Get response content from HAR entry with timeout
 */
async function getResponseContent(harEntry: HarEntry): Promise<{ content: string; encoding?: string }> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout getting response content'));
        }, 10000);

        try {
            harEntry.getContent((content: string | null, encoding?: string) => {
                clearTimeout(timeout);
                if (content !== null && content !== undefined) {
                    resolve({ content, encoding });
                } else {
                    reject(new Error('Response content is null'));
                }
            });
        } catch (err) {
            clearTimeout(timeout);
            reject(err);
        }
    });
}

/**
 * Decode base64 content if needed
 */
function decodeContent(content: string, encoding?: string): string {
    if (encoding === 'base64') {
        try {
            return atob(content);
        } catch {
            return content;
        }
    }
    return content;
}

/**
 * Convert HAR initiator to our RequestInitiator type
 */
function convertInitiator(harInitiator: HarInitiator | undefined): RequestInitiator | undefined {
    if (!harInitiator) return undefined;
    return {
        type: harInitiator.type,
        url: harInitiator.url,
        lineNumber: harInitiator.lineNumber,
        stack: harInitiator.stack
            ? {
                  callFrames: harInitiator.stack.callFrames.map((frame) => ({
                      functionName: frame.functionName,
                      url: frame.url,
                      lineNumber: frame.lineNumber,
                      columnNumber: frame.columnNumber
                  }))
              }
            : undefined
    };
}

/**
 * Safely extract .d property from OData response
 */
function extractODataPayload(data: unknown): unknown {
    if (data && typeof data === 'object' && 'd' in data) {
        return (data as Record<string, unknown>).d;
    }
    return data;
}

/**
 * Safely extract error from OData error response
 */
function extractODataError(data: unknown): unknown {
    if (data && typeof data === 'object' && 'error' in data) {
        return (data as Record<string, unknown>).error;
    }
    return data;
}

// ============================================================================
// OData Detection
// ============================================================================

export type DetectedRequestType = 'batch' | 'metadata' | 'single' | null;

/**
 * Check if URL is an OData request and determine type
 */
export function detectODataRequestType(url: string, contentType?: string): DetectedRequestType {
    // Check for batch requests
    if (ODATA_PATTERNS.BATCH.test(url)) return 'batch';

    // Check for metadata requests
    if (ODATA_PATTERNS.METADATA.test(url)) return 'metadata';

    // Check for common OData URL patterns
    const odataPatterns = [
        ODATA_PATTERNS.SAP_ODATA,
        ODATA_PATTERNS.GENERIC_ODATA,
        ODATA_PATTERNS.COUNT,
        /\$filter=/i,
        /\$select=/i,
        /\$expand=/i,
        /\$orderby=/i,
        /\$top=/i,
        /\$skip=/i
    ];

    for (const pattern of odataPatterns) {
        if (pattern.test(url)) return 'single';
    }

    // Check content type for OData responses
    if (
        contentType &&
        (contentType.includes('application/json') ||
            contentType.includes('application/xml') ||
            contentType.includes('application/atom+xml'))
    ) {
        // Heuristic: entity set naming convention
        if (url.includes('Set') || url.includes('Collection')) return 'single';
    }

    return null;
}

// ============================================================================
// Request Processing
// ============================================================================

/**
 * Process a batch OData request
 */
async function processBatchRequest(harEntry: HarEntry): Promise<void> {
    const requestText = harEntry.request.postData?.text;
    if (!requestText) {
        console.debug('[NetworkCapture] No request body for batch');
        return;
    }

    const batchUrlPath = parseUrlPath(harEntry.request.url);
    const timestamp = formatTimestamp(harEntry.startedDateTime);

    try {
        const responseContent = await getResponseContent(harEntry);
        const rawResponseBody = decodeContent(responseContent.content, responseContent.encoding);

        const requestBoundary = extractBoundary(requestText);
        if (!requestBoundary) {
            console.error('[NetworkCapture] Could not extract request boundary');
            return;
        }

        const responseBoundary = extractBoundary(rawResponseBody);

        // If no response boundary, batch might have failed entirely
        if (!responseBoundary) {
            await processFailedBatch(harEntry, requestText, requestBoundary, rawResponseBody, batchUrlPath, timestamp);
            return;
        }

        // Parse both requests and responses
        const requestContext = createBatchContext(requestBoundary);
        const responseContext = createBatchContext(responseBoundary);

        const requests = readBatchRequests(requestText, requestContext);
        const responses = readBatchResponses(rawResponseBody, responseContext);

        const flatRequests = flattenBatchRequests(requests);
        const flatResponses = flattenBatchResponses(responses);

        if (flatRequests.length !== flatResponses.length) {
            console.error(
                `[NetworkCapture] Request/response mismatch: ${flatRequests.length} vs ${flatResponses.length}`
            );
            return;
        }

        const batchId = ++batchIdCounter;
        const batchSize = flatRequests.length;
        const batchDuration = Math.round(harEntry.time || 0);

        for (let i = 0; i < flatRequests.length; i++) {
            const req = flatRequests[i];
            const res = flatResponses[i];

            const parsedUrl = parseODataUrl(req.url);

            // Parse request body
            let requestBody = null;
            try {
                requestBody = req.body ? JSON.parse(req.body) : null;
            } catch {
                requestBody = req.body || null;
            }

            // Parse response body
            let responseData: unknown;
            try {
                const parsed = JSON.parse(res.body || '');
                responseData = extractODataPayload(parsed);
                responseData = deleteKeyDeep(responseData, '__metadata');
                responseData = deleteKeyDeep(responseData, '__deferred');
            } catch {
                responseData = res.body;
            }

            const method = (req.method || 'GET') as HttpMethod;
            const uniqueId = ++requestIdCounter;
            const eventData: CapturedRequest = {
                id: String(uniqueId),
                _uniqueId: uniqueId,
                url: harEntry.request.url,
                path: batchUrlPath,
                name: parsedUrl.entitySet || '',
                type: 'entity',
                request: {
                    method,
                    url: req.url || '',
                    entitySet: parsedUrl.entitySet || undefined,
                    path: parsedUrl.path,
                    headers: req.headers,
                    filters: parsedUrl.filters,
                    queryParams: parsedUrl.queryParams,
                    body: requestBody
                },
                response: {
                    statusCode: res.statusCode || '',
                    statusText: res.statusText || '',
                    headers: res.headers,
                    data: responseData
                },
                timestamp,
                initiator: convertInitiator(harEntry._initiator),
                duration: Math.round(batchDuration / batchSize),
                batch: {
                    id: batchId,
                    index: i + 1,
                    total: batchSize,
                    totalDuration: batchDuration
                }
            };

            notifyRequest(eventData);
        }
    } catch (error) {
        console.debug('[NetworkCapture] Could not process batch:', (error as Error).message);
    }
}

/**
 * Process a failed batch request (no response boundary)
 */
async function processFailedBatch(
    harEntry: HarEntry,
    requestText: string,
    requestBoundary: string,
    rawResponseBody: string,
    batchUrlPath: string,
    timestamp: string
): Promise<void> {
    // Parse response as error
    let responseData: unknown;
    try {
        const parsed = JSON.parse(rawResponseBody);
        responseData = extractODataError(parsed);
    } catch {
        responseData = rawResponseBody;
    }

    // Parse requests for context
    const requestContext = createBatchContext(requestBoundary);
    const requests = readBatchRequests(requestText, requestContext);
    const flatRequests = flattenBatchRequests(requests);

    const operations = flatRequests.map((r) => {
        const parsedUrl = parseODataUrl(r.url);
        let body = null;
        try {
            body = r.body ? JSON.parse(r.body) : null;
        } catch {
            body = r.body || null;
        }
        return {
            method: r.method,
            entitySet: parsedUrl.entitySet,
            url: decodeUrl(r.url || ''),
            filters: parsedUrl.filters,
            body
        };
    });

    const uniqueId = ++requestIdCounter;
    const eventData: CapturedRequest = {
        id: String(uniqueId),
        _uniqueId: uniqueId,
        url: harEntry.request.url,
        path: batchUrlPath,
        name: '$batch (Error)',
        type: 'batch',
        request: {
            method: 'POST' as HttpMethod,
            url: batchUrlPath,
            entitySet: '$batch',
            path: batchUrlPath,
            headers: headersArrayToObject(harEntry.request.headers),
            filters: {},
            queryParams: {},
            body: { operations }
        },
        response: {
            statusCode: String(harEntry.response.status),
            statusText: harEntry.response.statusText,
            headers: headersArrayToObject(harEntry.response.headers),
            data: responseData
        },
        timestamp,
        duration: Math.round(harEntry.time || 0),
        initiator: convertInitiator(harEntry._initiator)
    };

    notifyRequest(eventData);
}

/**
 * Process a metadata request
 */
async function processMetadataRequest(harEntry: HarEntry): Promise<void> {
    try {
        const responseContent = await getResponseContent(harEntry);
        const rawResponseBody = decodeContent(responseContent.content, responseContent.encoding);

        const metadataUrl = harEntry.request.url;
        const serviceUrl = extractServiceUrl(metadataUrl);

        // Extract and cache CSRF token from response headers
        // UI5 apps typically fetch metadata with X-CSRF-Token: Fetch, so the token should be in response
        const responseHeaders = headersArrayToObject(harEntry.response.headers);
        const tokenCached = cacheTokenFromHeaders(serviceUrl, responseHeaders);
        if (tokenCached) {
            console.debug('[NetworkCapture] CSRF token extracted from metadata response');
        }

        // Parse metadata XML
        const parsedMetadata = parseMetadataXml(rawResponseBody);

        if (parsedMetadata) {
            parsedMetadata.serviceUrl = serviceUrl;
            parsedMetadata.rawXml = rawResponseBody;

            capturedMetadata = parsedMetadata;

            console.debug('[NetworkCapture] Captured metadata:', {
                serviceUrl,
                entityTypes: parsedMetadata.entityTypes.length,
                entitySets: parsedMetadata.entitySets.length
            });

            // Notify about metadata
            if (callbacks?.onMetadata) {
                callbacks.onMetadata(parsedMetadata);
            }
        }

        // Also add to request list
        const urlPath = parseUrlPath(metadataUrl);
        const timestamp = formatTimestamp(harEntry.startedDateTime);
        const serviceNameMatch = metadataUrl.match(/\/([^/]+)\/\$metadata/i);
        const serviceName = serviceNameMatch ? serviceNameMatch[1] : '$metadata';

        const uniqueId = ++requestIdCounter;
        const eventData: CapturedRequest = {
            id: String(uniqueId),
            _uniqueId: uniqueId,
            url: metadataUrl,
            path: urlPath,
            name: serviceName,
            type: 'metadata',
            isMetadata: true,
            request: {
                method: (harEntry.request.method || 'GET') as HttpMethod,
                url: urlPath,
                headers: headersArrayToObject(harEntry.request.headers),
                filters: {},
                queryParams: {},
                body: null
            },
            response: {
                statusCode: String(harEntry.response.status),
                statusText: harEntry.response.statusText,
                headers: headersArrayToObject(harEntry.response.headers),
                data: rawResponseBody
            },
            timestamp,
            initiator: convertInitiator(harEntry._initiator),
            duration: Math.round(harEntry.time || 0),
            metadataSummary: parsedMetadata
                ? {
                      entityTypes: parsedMetadata.entityTypes.length,
                      entitySets: parsedMetadata.entitySets.length,
                      complexTypes: parsedMetadata.complexTypes.length,
                      functionImports: parsedMetadata.functionImports.length,
                      associations: parsedMetadata.associations.length
                  }
                : undefined
        };

        notifyRequest(eventData);
    } catch (error) {
        console.debug('[NetworkCapture] Could not process metadata:', (error as Error).message);
    }
}

/**
 * Process a single (non-batch) OData request
 */
async function processSingleRequest(harEntry: HarEntry): Promise<void> {
    try {
        const responseContent = await getResponseContent(harEntry);
        const rawResponseBody = decodeContent(responseContent.content, responseContent.encoding);

        const url = harEntry.request.url;
        const urlPath = parseUrlPath(url);
        const fullPath = urlPath + (url.includes('?') ? `?${url.split('?')[1]}` : '');
        const parsedUrl = parseODataUrl(fullPath);

        // Parse request body
        let requestBody = null;
        if (harEntry.request.postData?.text) {
            try {
                requestBody = JSON.parse(harEntry.request.postData.text);
            } catch {
                requestBody = harEntry.request.postData.text;
            }
        }

        // Parse response body
        let responseData: unknown;
        try {
            const parsed = JSON.parse(rawResponseBody);
            responseData = extractODataPayload(parsed);
            responseData = deleteKeyDeep(responseData, '__metadata');
            responseData = deleteKeyDeep(responseData, '__deferred');
        } catch {
            responseData = rawResponseBody;
        }

        const timestamp = formatTimestamp(harEntry.startedDateTime);
        const method = (harEntry.request.method || 'GET') as HttpMethod;
        const uniqueId = ++requestIdCounter;

        const eventData: CapturedRequest = {
            id: String(uniqueId),
            _uniqueId: uniqueId,
            url: harEntry.request.url,
            path: urlPath,
            name: parsedUrl.entitySet || '',
            type: 'entity',
            request: {
                method,
                url: fullPath,
                entitySet: parsedUrl.entitySet || undefined,
                path: parsedUrl.path,
                headers: headersArrayToObject(harEntry.request.headers),
                filters: parsedUrl.filters,
                queryParams: parsedUrl.queryParams,
                body: requestBody
            },
            response: {
                statusCode: String(harEntry.response.status),
                statusText: harEntry.response.statusText,
                headers: headersArrayToObject(harEntry.response.headers),
                data: responseData
            },
            timestamp,
            initiator: convertInitiator(harEntry._initiator),
            duration: Math.round(harEntry.time || 0)
        };

        notifyRequest(eventData);
    } catch (error) {
        console.debug('[NetworkCapture] Could not process single request:', (error as Error).message);
    }
}

// ============================================================================
// Notification
// ============================================================================

/**
 * Notify about a new captured request
 */
function notifyRequest(data: CapturedRequest): void {
    if (!sentRequestIds.has(data._uniqueId)) {
        sentRequestIds.add(data._uniqueId);
        callbacks?.onRequest(data);
    }
}

// ============================================================================
// Background Connection
// ============================================================================

/**
 * Connect to background service worker for early request detection
 */
function connectToBackground(): void {
    try {
        backgroundPort = chrome.runtime.connect({ name: 'odata-inspector' }) as BackgroundPort;

        // Send tab ID to background
        backgroundPort.postMessage({
            type: 'init',
            tabId: chrome.devtools.inspectedWindow.tabId
        });

        // Listen for messages
        backgroundPort.onMessage.addListener((msg: unknown) => {
            const message = msg as { type: string; data: unknown };
            if (message.type === 'request-started') {
                handleRequestStarted(
                    message.data as {
                        requestId: string;
                        url: string;
                        method: string;
                        entitySet: string;
                        type: string;
                        timestamp: string;
                    }
                );
            } else if (message.type === 'request-completed') {
                handleRequestCompleted(message.data as { requestId: string; statusCode: number; duration: number });
            } else if (message.type === 'request-error') {
                handleRequestError(message.data as { requestId: string; error: string; duration: number });
            }
        });

        backgroundPort.onDisconnect.addListener(() => {
            console.debug('[NetworkCapture] Background disconnected, reconnecting...');
            setTimeout(connectToBackground, 1000);
        });

        console.debug('[NetworkCapture] Connected to background');
    } catch (e) {
        console.debug('[NetworkCapture] Could not connect to background:', (e as Error).message);
    }
}

function handleRequestStarted(data: {
    requestId: string;
    url: string;
    method: string;
    entitySet: string;
    type: string;
    timestamp: string;
}): void {
    const uniqueId = ++requestIdCounter;

    // Use the type from background worker (batch, metadata, entity, etc.)
    const requestType = data.type as 'batch' | 'metadata' | 'entity' | 'count' | 'value';
    const isBatch = requestType === 'batch';
    const isMetadata = requestType === 'metadata';

    // Set appropriate name for special request types
    let name = data.entitySet;
    if (isBatch) name = '$batch';
    if (isMetadata) name = data.entitySet || '$metadata';

    const pendingData: Partial<CapturedRequest> = {
        id: String(uniqueId), // Add the id field for store matching
        _uniqueId: uniqueId,
        url: data.url,
        path: new URL(data.url).pathname,
        name,
        type: requestType,
        isMetadata,
        request: {
            method: data.method as HttpMethod,
            url: data.url,
            entitySet: data.entitySet,
            headers: {},
            filters: {},
            queryParams: {},
            body: null
        },
        response: {
            statusCode: 'pending',
            statusText: 'Loading...',
            headers: {},
            data: null
        },
        timestamp: data.timestamp,
        duration: undefined,
        _pending: true,
        _isBatchRequest: isBatch
    };

    pendingRequestsMap.set(data.requestId, pendingData);

    // Track metadata requests by URL for later content update
    if (isMetadata) {
        metadataRequestIds.set(data.url, String(uniqueId));
    }

    callbacks?.onRequest(pendingData as CapturedRequest);
}

function handleRequestCompleted(data: { requestId: string; statusCode: number; duration: number }): void {
    const pending = pendingRequestsMap.get(data.requestId);
    if (!pending) return;

    // Use our internal id for the update, not Chrome's requestId
    const internalId = pending.id || String(pending._uniqueId);

    callbacks?.onPendingUpdate?.(internalId, {
        response: {
            statusCode: String(data.statusCode),
            statusText: data.statusCode >= 200 && data.statusCode < 300 ? 'OK' : 'Error',
            headers: {},
            data: null
        },
        duration: data.duration,
        _pending: false
    });

    pendingRequestsMap.delete(data.requestId);
}

function handleRequestError(data: { requestId: string; error: string; duration: number }): void {
    const pending = pendingRequestsMap.get(data.requestId);
    if (!pending) return;

    // Use our internal id for the update, not Chrome's requestId
    const internalId = pending.id || String(pending._uniqueId);

    callbacks?.onPendingUpdate?.(internalId, {
        response: {
            statusCode: 'ERR',
            statusText: data.error || 'Network Error',
            headers: {},
            data: null
        },
        duration: data.duration,
        _pending: false,
        _error: true
    });

    pendingRequestsMap.delete(data.requestId);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize network capture
 */
export function initNetworkCapture(cbs: NetworkCaptureCallbacks): void {
    callbacks = cbs;

    // Connect to background for early detection
    connectToBackground();

    // Listen for completed requests
    // Cast to our HarEntry type which includes additional Chrome-specific fields
    chrome.devtools.network.onRequestFinished.addListener((request) => {
        const harEntry = request as unknown as HarEntry;
        const url = harEntry.request.url;
        const contentType = harEntry.response?.content?.mimeType || '';

        const odataType = detectODataRequestType(url, contentType);

        if (odataType === 'batch') {
            processBatchRequest(harEntry);
        } else if (odataType === 'metadata') {
            processMetadataRequest(harEntry);
        } else if (odataType === 'single') {
            processSingleRequest(harEntry);
        }
    });

    // Clear on navigation
    chrome.devtools.network.onNavigated.addListener(() => {
        requestIdCounter = 0;
        batchIdCounter = 0;
        capturedMetadata = null;
        sentRequestIds.clear();
        pendingRequestsMap.clear();
        callbacks?.onClear();
    });

    console.debug('[NetworkCapture] Initialized');
}

/**
 * Get currently captured metadata
 */
export function getCapturedMetadata(): ODataMetadata | null {
    return capturedMetadata;
}

/**
 * Cleanup network capture
 */
export function cleanupNetworkCapture(): void {
    callbacks = null;
    backgroundPort = null;
    capturedMetadata = null;
    sentRequestIds.clear();
    pendingRequestsMap.clear();
    metadataRequestIds.clear();
}
