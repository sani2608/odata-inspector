/**
 * CSRF Token Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    extractServiceRootUrl,
    requiresCsrfToken,
    getCachedToken,
    invalidateToken,
    getTokenStatus,
    clearAllTokens
} from '../../../src/services/odata/csrfTokenService';

describe('CSRF Token Service', () => {
    beforeEach(() => {
        // Clear token cache before each test
        clearAllTokens();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('extractServiceRootUrl', () => {
        it('should extract SAP OData service root from full URL', () => {
            expect(
                extractServiceRootUrl('/sap/opu/odata/sap/ZRW0_PLAN_SCHED_SRV/CreateFollowUpWorkOrder')
            ).toBe('/sap/opu/odata/sap/ZRW0_PLAN_SCHED_SRV');
        });

        it('should handle SAP OData service root with entity set', () => {
            expect(extractServiceRootUrl('/sap/opu/odata/sap/MY_SERVICE_SRV/EntitySet')).toBe(
                '/sap/opu/odata/sap/MY_SERVICE_SRV'
            );
        });

        it('should handle full URLs with host', () => {
            expect(
                extractServiceRootUrl('https://myhost.example.com/sap/opu/odata/sap/MY_SERVICE_SRV/EntitySet')
            ).toBe('https://myhost.example.com/sap/opu/odata/sap/MY_SERVICE_SRV');
        });

        it('should handle URLs with query parameters', () => {
            expect(
                extractServiceRootUrl('/sap/opu/odata/sap/MY_SERVICE_SRV/EntitySet?$top=10&$filter=Name eq \'test\'')
            ).toBe('/sap/opu/odata/sap/MY_SERVICE_SRV');
        });

        it('should handle IWBEP namespace', () => {
            expect(extractServiceRootUrl('/sap/opu/odata/IWBEP/COMMON_SRV/EntitySet')).toBe(
                '/sap/opu/odata/IWBEP/COMMON_SRV'
            );
        });

        it('should fallback to removing last path segment for non-SAP URLs', () => {
            expect(extractServiceRootUrl('/api/odata/v1/Products')).toBe('/api/odata/v1');
        });

        it('should handle service root URL (no entity/function path)', () => {
            expect(extractServiceRootUrl('/sap/opu/odata/sap/MY_SERVICE_SRV')).toBe(
                '/sap/opu/odata/sap/MY_SERVICE_SRV'
            );
        });
    });

    describe('requiresCsrfToken', () => {
        it('should return true for POST', () => {
            expect(requiresCsrfToken('POST')).toBe(true);
            expect(requiresCsrfToken('post')).toBe(true);
        });

        it('should return true for PUT', () => {
            expect(requiresCsrfToken('PUT')).toBe(true);
        });

        it('should return true for PATCH', () => {
            expect(requiresCsrfToken('PATCH')).toBe(true);
        });

        it('should return true for DELETE', () => {
            expect(requiresCsrfToken('DELETE')).toBe(true);
        });

        it('should return true for MERGE (SAP-specific)', () => {
            expect(requiresCsrfToken('MERGE')).toBe(true);
        });

        it('should return false for GET', () => {
            expect(requiresCsrfToken('GET')).toBe(false);
            expect(requiresCsrfToken('get')).toBe(false);
        });

        it('should return false for HEAD', () => {
            expect(requiresCsrfToken('HEAD')).toBe(false);
        });

        it('should return false for OPTIONS', () => {
            expect(requiresCsrfToken('OPTIONS')).toBe(false);
        });
    });

    describe('getCachedToken', () => {
        it('should return null when no token is cached', () => {
            expect(getCachedToken('/sap/opu/odata/sap/MY_SERVICE')).toBeNull();
        });
    });

    describe('invalidateToken', () => {
        it('should not throw when invalidating non-existent token', () => {
            expect(() => invalidateToken('/sap/opu/odata/sap/MY_SERVICE')).not.toThrow();
        });
    });

    describe('getTokenStatus', () => {
        it('should return "none" when no token exists', () => {
            expect(getTokenStatus('/sap/opu/odata/sap/MY_SERVICE_SRV/EntitySet')).toBe('none');
        });
    });

    describe('clearAllTokens', () => {
        it('should clear all tokens', () => {
            // After clear, status should be "none"
            expect(getTokenStatus('/sap/opu/odata/sap/SERVICE_A/Entity')).toBe('none');
            expect(getTokenStatus('/sap/opu/odata/sap/SERVICE_B/Entity')).toBe('none');
        });
    });

    describe('URL pattern matching edge cases', () => {
        it('should handle multiple slashes', () => {
            const result = extractServiceRootUrl('/sap/opu/odata/sap/MY_SERVICE_SRV/Deep/Nested/Path');
            expect(result).toBe('/sap/opu/odata/sap/MY_SERVICE_SRV');
        });

        it('should handle URL with port', () => {
            expect(
                extractServiceRootUrl('https://myhost.example.com:8080/sap/opu/odata/sap/MY_SERVICE_SRV/EntitySet')
            ).toBe('https://myhost.example.com:8080/sap/opu/odata/sap/MY_SERVICE_SRV');
        });

        it('should handle metadata URL', () => {
            expect(extractServiceRootUrl('/sap/opu/odata/sap/MY_SERVICE_SRV/$metadata')).toBe(
                '/sap/opu/odata/sap/MY_SERVICE_SRV'
            );
        });

        it('should handle batch URL', () => {
            expect(extractServiceRootUrl('/sap/opu/odata/sap/MY_SERVICE_SRV/$batch')).toBe(
                '/sap/opu/odata/sap/MY_SERVICE_SRV'
            );
        });
    });
});
