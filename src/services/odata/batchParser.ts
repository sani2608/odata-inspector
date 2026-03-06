/**
 * OData Batch Parser
 *
 * Parses OData batch request/response bodies in multipart/mixed format.
 * Based on SAP UI5 datajs library batch parsing.
 *
 * ★ Insight ─────────────────────────────────────
 * - OData batch requests use multipart/mixed format with boundaries
 * - Each part can be a single request or a changeset (nested multipart)
 * - Changesets group multiple write operations into a transaction
 * - Request/response pairs are matched by order within the batch
 * ─────────────────────────────────────────────────
 */

import type { HttpHeaders, HttpMethod } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface BatchContext {
    position: number;
    boundaries: string[];
}

export interface ParsedBatchRequest {
    method: HttpMethod | null;
    url: string | null;
    headers: HttpHeaders;
    body: string | null;
}

export interface ParsedBatchResponse {
    statusCode: string | undefined;
    statusText: string | undefined;
    headers: HttpHeaders;
    body: string | null;
}

export interface ChangesetRequests {
    __changeRequests: ParsedBatchRequest[];
}

export interface ChangesetResponses {
    __changeResponses: ParsedBatchResponse[];
}

export type BatchRequestItem = ParsedBatchRequest | ChangesetRequests;
export type BatchResponseItem = ParsedBatchResponse | ChangesetResponses;

export interface ParsedContentType {
    mediaType: string;
    properties: Record<string, string>;
}

// ============================================================================
// Constants
// ============================================================================

const BATCH_MEDIA_TYPE = 'multipart/mixed';
const RESPONSE_STATUS_REGEX = /^HTTP\/1\.\d (\d{3}) (.*)$/i;
const REQUEST_LINE_REGEX = /^(GET|POST|PUT|PATCH|DELETE|MERGE)\s+(.+?)\s+HTTP\/1\.\d$/i;
const HEADER_REGEX = /^([^()<>@,;:\\"/[\]?={} \t]+)\s?:\s?(.*)/;

const NORMAL_HEADERS: Record<string, string> = {
    accept: 'Accept',
    'content-type': 'Content-Type',
    dataserviceversion: 'DataServiceVersion',
    maxdataserviceversion: 'MaxDataServiceVersion',
    'last-modified': 'Last-Modified'
};

// ============================================================================
// Parsing Utilities
// ============================================================================

/**
 * Read text from position to the next occurrence of delimiter
 */
function readTo(text: string, context: BatchContext, delimiter?: string): string | null {
    const start = context.position;
    let end = text.length;

    if (delimiter) {
        end = text.indexOf(delimiter, start);
        if (end === -1) {
            return null;
        }
        context.position = end + delimiter.length;
    } else {
        context.position = end;
    }

    return text.substring(start, end);
}

/**
 * Read a line (up to CRLF)
 */
function readLine(text: string, context: BatchContext): string | null {
    return readTo(text, context, '\r\n');
}

/**
 * Normalize header names for consistent casing
 */
function normalizeHeaders(headers: HttpHeaders): void {
    for (const name of Object.keys(headers)) {
        const lowerName = name.toLowerCase();
        const normalName = NORMAL_HEADERS[lowerName];
        if (normalName && name !== normalName) {
            const val = headers[name];
            delete headers[name];
            headers[normalName] = val;
        }
    }
}

/**
 * Parse HTTP headers from text
 */
function readHeaders(text: string, context: BatchContext): HttpHeaders {
    const headers: HttpHeaders = {};
    let line: string | null;
    let pos: number;

    do {
        pos = context.position;
        line = readLine(text, context);
        const parts = line ? HEADER_REGEX.exec(line) : null;
        if (parts !== null) {
            headers[parts[1]] = parts[2];
        } else {
            context.position = pos;
        }
    } while (line && HEADER_REGEX.test(line));

    normalizeHeaders(headers);
    return headers;
}

/**
 * Get current boundary from context
 */
function currentBoundary(context: BatchContext): string {
    return context.boundaries[context.boundaries.length - 1];
}

/**
 * Parse Content-Type header value
 */
export function parseContentType(str: string | undefined): ParsedContentType | null {
    if (!str) return null;

    const contentTypeParts = str.split(';');
    const properties: Record<string, string> = {};

    for (let i = 1; i < contentTypeParts.length; i++) {
        const contentTypeParams = contentTypeParts[i].split('=');
        if (contentTypeParams.length === 2) {
            properties[contentTypeParams[0].trim()] = contentTypeParams[1].trim().replace(/"/g, '');
        }
    }

    return {
        mediaType: contentTypeParts[0].trim(),
        properties
    };
}

// ============================================================================
// Request Parsing
// ============================================================================

/**
 * Parse a single HTTP request from batch part
 */
function readRequest(text: string, context: BatchContext, delimiter: string): ParsedBatchRequest {
    const pos = context.position;
    const firstLine = readLine(text, context);
    const match = firstLine ? REQUEST_LINE_REGEX.exec(firstLine) : null;

    let method: HttpMethod | null = null;
    let url: string | null = null;
    let headers: HttpHeaders = {};
    let body: string | null = null;

    if (match) {
        method = match[1].toUpperCase() as HttpMethod;
        url = match[2];
        headers = readHeaders(text, context);
        readLine(text, context); // Skip empty line before body
        body = readTo(text, context, `\r\n${delimiter}`);
    } else {
        context.position = pos;
        body = readTo(text, context, `\r\n${delimiter}`);
    }

    return { method, url, headers, body };
}

/**
 * Parse batch requests recursively (handles changesets)
 */
export function readBatchRequests(text: string, context: BatchContext): BatchRequestItem[] {
    const delimiter = `--${currentBoundary(context)}`;

    readTo(text, context, delimiter);
    readLine(text, context);

    const requests: BatchRequestItem[] = [];
    let partEnd: string | undefined;

    while (partEnd !== '--' && context.position < text.length) {
        const partHeaders = readHeaders(text, context);
        const partContentType = parseContentType(partHeaders['Content-Type']);

        if (partContentType?.mediaType === BATCH_MEDIA_TYPE) {
            // Nested changeset
            const boundary = partContentType.properties.boundary;
            if (boundary) {
                context.boundaries.push(boundary);
                let changeRequests: ParsedBatchRequest[];
                try {
                    changeRequests = readBatchRequests(text, context) as ParsedBatchRequest[];
                } catch {
                    changeRequests = [];
                }
                requests.push({ __changeRequests: changeRequests });
                context.boundaries.pop();
                readTo(text, context, `--${currentBoundary(context)}`);
            }
        } else {
            if (!partContentType || partContentType.mediaType !== 'application/http') {
                throw new Error('Invalid MIME part type');
            }
            readLine(text, context);
            const request = readRequest(text, context, delimiter);
            requests.push(request);
        }

        partEnd = text.substring(context.position, context.position + 2);
        readLine(text, context);
    }

    return requests;
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse a single HTTP response from batch part
 */
function readResponse(text: string, context: BatchContext, delimiter: string): ParsedBatchResponse {
    const pos = context.position;
    const firstLine = readLine(text, context);
    const match = firstLine ? RESPONSE_STATUS_REGEX.exec(firstLine) : null;

    let statusCode: string | undefined;
    let statusText: string | undefined;
    let headers: HttpHeaders = {};

    if (match) {
        statusCode = match[1];
        statusText = match[2];
        headers = readHeaders(text, context);
        readLine(text, context);
    } else {
        context.position = pos;
    }

    return {
        statusCode,
        statusText,
        headers,
        body: readTo(text, context, `\r\n${delimiter}`)
    };
}

/**
 * Parse batch responses recursively (handles changesets)
 */
export function readBatchResponses(text: string, context: BatchContext): BatchResponseItem[] {
    const delimiter = `--${currentBoundary(context)}`;

    readTo(text, context, delimiter);
    readLine(text, context);

    const responses: BatchResponseItem[] = [];
    let partEnd: string | undefined;

    while (partEnd !== '--' && context.position < text.length) {
        const partHeaders = readHeaders(text, context);
        const partContentType = parseContentType(partHeaders['Content-Type']);

        if (partContentType?.mediaType === BATCH_MEDIA_TYPE) {
            // Nested changeset
            const boundary = partContentType.properties.boundary;
            if (boundary) {
                context.boundaries.push(boundary);
                let changeResponses: ParsedBatchResponse[];
                try {
                    changeResponses = readBatchResponses(text, context) as ParsedBatchResponse[];
                } catch {
                    const errorResponse = readResponse(text, context, delimiter);
                    changeResponses = [errorResponse];
                }
                responses.push({ __changeResponses: changeResponses });
                context.boundaries.pop();
                readTo(text, context, `--${currentBoundary(context)}`);
            }
        } else {
            if (!partContentType || partContentType.mediaType !== 'application/http') {
                throw new Error('Invalid MIME part type');
            }
            readLine(text, context);
            const response = readResponse(text, context, delimiter);
            responses.push(response);
        }

        partEnd = text.substring(context.position, context.position + 2);
        readLine(text, context);
    }

    return responses;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new batch parsing context
 */
export function createBatchContext(boundary: string): BatchContext {
    return {
        position: 0,
        boundaries: [boundary]
    };
}

/**
 * Extract boundary from batch content
 */
export function extractBoundary(content: string): string | null {
    const match = content.match(/--([^\r\n]+)/);
    return match && match.length === 2 ? match[1] : null;
}

/**
 * Flatten changeset arrays into a single array of requests
 */
export function flattenBatchRequests(items: BatchRequestItem[]): ParsedBatchRequest[] {
    const flat: ParsedBatchRequest[] = [];
    for (const item of items) {
        if ('__changeRequests' in item) {
            flat.push(...item.__changeRequests);
        } else {
            flat.push(item);
        }
    }
    return flat;
}

/**
 * Flatten changeset arrays into a single array of responses
 */
export function flattenBatchResponses(items: BatchResponseItem[]): ParsedBatchResponse[] {
    const flat: ParsedBatchResponse[] = [];
    for (const item of items) {
        if ('__changeResponses' in item) {
            flat.push(...item.__changeResponses);
        } else {
            flat.push(item);
        }
    }
    return flat;
}

/**
 * Parse a complete batch request body
 */
export function parseBatchRequestBody(text: string): ParsedBatchRequest[] {
    const boundary = extractBoundary(text);
    if (!boundary) {
        throw new Error('Could not extract boundary from batch request');
    }

    const context = createBatchContext(boundary);
    const requests = readBatchRequests(text, context);
    return flattenBatchRequests(requests);
}

/**
 * Parse a complete batch response body
 */
export function parseBatchResponseBody(text: string): ParsedBatchResponse[] {
    const boundary = extractBoundary(text);
    if (!boundary) {
        throw new Error('Could not extract boundary from batch response');
    }

    const context = createBatchContext(boundary);
    const responses = readBatchResponses(text, context);
    return flattenBatchResponses(responses);
}
