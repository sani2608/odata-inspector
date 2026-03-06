/**
 * Batch Parser Tests
 */

import { describe, it, expect } from 'vitest';
import type { HttpMethod } from '../../../src/types';
import {
    parseBatchRequestBody,
    parseBatchResponseBody,
    extractBoundary,
    parseContentType,
    createBatchContext,
    flattenBatchRequests,
    flattenBatchResponses,
    type BatchRequestItem
} from '../../../src/services/odata/batchParser';

describe('Batch Parser', () => {
    describe('extractBoundary', () => {
        it('should extract boundary from batch content', () => {
            const content = '--batch_1234-5678\r\nContent-Type: application/http\r\n';
            expect(extractBoundary(content)).toBe('batch_1234-5678');
        });

        it('should return null for content without boundary', () => {
            const content = 'Some random content without boundary';
            expect(extractBoundary(content)).toBeNull();
        });

        it('should extract boundary with special characters', () => {
            const content = '--batch_a1b2-c3d4-e5f6\r\n';
            expect(extractBoundary(content)).toBe('batch_a1b2-c3d4-e5f6');
        });
    });

    describe('parseContentType', () => {
        it('should parse simple content type', () => {
            const result = parseContentType('application/json');
            expect(result).toEqual({
                mediaType: 'application/json',
                properties: {}
            });
        });

        it('should parse content type with boundary', () => {
            const result = parseContentType('multipart/mixed; boundary=batch_123');
            expect(result).toEqual({
                mediaType: 'multipart/mixed',
                properties: { boundary: 'batch_123' }
            });
        });

        it('should parse content type with multiple properties', () => {
            const result = parseContentType('text/html; charset=utf-8; boundary=test');
            expect(result).toEqual({
                mediaType: 'text/html',
                properties: {
                    charset: 'utf-8',
                    boundary: 'test'
                }
            });
        });

        it('should return null for undefined', () => {
            expect(parseContentType(undefined)).toBeNull();
        });

        it('should handle quoted boundary values', () => {
            const result = parseContentType('multipart/mixed; boundary="batch_123"');
            expect(result?.properties.boundary).toBe('batch_123');
        });
    });

    describe('createBatchContext', () => {
        it('should create context with initial boundary', () => {
            const context = createBatchContext('batch_123');
            expect(context).toEqual({
                position: 0,
                boundaries: ['batch_123']
            });
        });
    });

    describe('parseBatchRequestBody', () => {
        it('should parse a simple batch request with single GET', () => {
            const batchRequest = `--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
GET /Products HTTP/1.1\r
Accept: application/json\r
\r
\r
--batch_123--`;

            const requests = parseBatchRequestBody(batchRequest);
            expect(requests).toHaveLength(1);
            expect(requests[0].method).toBe('GET');
            expect(requests[0].url).toBe('/Products');
            expect(requests[0].headers.Accept).toBe('application/json');
        });

        it('should parse batch request with multiple operations', () => {
            const batchRequest = `--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
GET /Products HTTP/1.1\r
Accept: application/json\r
\r
\r
--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
GET /Categories HTTP/1.1\r
Accept: application/json\r
\r
\r
--batch_123--`;

            const requests = parseBatchRequestBody(batchRequest);
            expect(requests).toHaveLength(2);
            expect(requests[0].url).toBe('/Products');
            expect(requests[1].url).toBe('/Categories');
        });

        it('should parse POST request with body', () => {
            const batchRequest = `--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
POST /Products HTTP/1.1\r
Content-Type: application/json\r
\r
{"Name":"Test Product"}\r
--batch_123--`;

            const requests = parseBatchRequestBody(batchRequest);
            expect(requests).toHaveLength(1);
            expect(requests[0].method).toBe('POST');
            expect(requests[0].body).toBe('{"Name":"Test Product"}');
        });

        it('should throw error for batch without boundary', () => {
            const invalidBatch = 'Just some text without boundary markers';
            expect(() => parseBatchRequestBody(invalidBatch)).toThrow('Could not extract boundary');
        });
    });

    describe('parseBatchResponseBody', () => {
        it('should parse a simple batch response', () => {
            const batchResponse = `--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
HTTP/1.1 200 OK\r
Content-Type: application/json\r
\r
{"d":{"results":[]}}\r
--batch_123--`;

            const responses = parseBatchResponseBody(batchResponse);
            expect(responses).toHaveLength(1);
            expect(responses[0].statusCode).toBe('200');
            expect(responses[0].statusText).toBe('OK');
            expect(responses[0].body).toBe('{"d":{"results":[]}}');
        });

        it('should parse batch response with error status', () => {
            const batchResponse = `--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
HTTP/1.1 404 Not Found\r
Content-Type: application/json\r
\r
{"error":{"message":"Entity not found"}}\r
--batch_123--`;

            const responses = parseBatchResponseBody(batchResponse);
            expect(responses).toHaveLength(1);
            expect(responses[0].statusCode).toBe('404');
            expect(responses[0].statusText).toBe('Not Found');
        });

        it('should parse multiple responses', () => {
            const batchResponse = `--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
HTTP/1.1 200 OK\r
\r
{"d":{"ID":1}}\r
--batch_123\r
Content-Type: application/http\r
Content-Transfer-Encoding: binary\r
\r
HTTP/1.1 201 Created\r
\r
{"d":{"ID":2}}\r
--batch_123--`;

            const responses = parseBatchResponseBody(batchResponse);
            expect(responses).toHaveLength(2);
            expect(responses[0].statusCode).toBe('200');
            expect(responses[1].statusCode).toBe('201');
        });
    });

    describe('flattenBatchRequests', () => {
        it('should flatten simple requests', () => {
            const items: BatchRequestItem[] = [
                { method: 'GET' as HttpMethod, url: '/A', headers: {}, body: null },
                { method: 'POST' as HttpMethod, url: '/B', headers: {}, body: null }
            ];
            const flat = flattenBatchRequests(items);
            expect(flat).toHaveLength(2);
        });

        it('should flatten changeset requests', () => {
            const items: BatchRequestItem[] = [
                { method: 'GET' as HttpMethod, url: '/A', headers: {}, body: null },
                {
                    __changeRequests: [
                        { method: 'POST' as HttpMethod, url: '/B', headers: {}, body: null },
                        { method: 'PUT' as HttpMethod, url: '/C', headers: {}, body: null }
                    ]
                }
            ];
            const flat = flattenBatchRequests(items);
            expect(flat).toHaveLength(3);
            expect(flat[0].url).toBe('/A');
            expect(flat[1].url).toBe('/B');
            expect(flat[2].url).toBe('/C');
        });
    });

    describe('flattenBatchResponses', () => {
        it('should flatten simple responses', () => {
            const items = [
                { statusCode: '200', statusText: 'OK', headers: {}, body: null },
                { statusCode: '201', statusText: 'Created', headers: {}, body: null }
            ];
            const flat = flattenBatchResponses(items);
            expect(flat).toHaveLength(2);
        });

        it('should flatten changeset responses', () => {
            const items = [
                { statusCode: '200', statusText: 'OK', headers: {}, body: null },
                {
                    __changeResponses: [
                        { statusCode: '201', statusText: 'Created', headers: {}, body: null },
                        { statusCode: '204', statusText: 'No Content', headers: {}, body: null }
                    ]
                }
            ];
            const flat = flattenBatchResponses(items);
            expect(flat).toHaveLength(3);
            expect(flat[0].statusCode).toBe('200');
            expect(flat[1].statusCode).toBe('201');
            expect(flat[2].statusCode).toBe('204');
        });
    });
});
