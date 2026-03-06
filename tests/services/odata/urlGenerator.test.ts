/**
 * URL Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
    formatODataValue,
    generateFilterExpression,
    generateFilterString,
    generateEntitySetUrl,
    generateFunctionImportUrl,
    generateODataUrl,
    createInitialBuilderState,
    addFilter,
    removeFilter,
    setOrderBy,
    toggleFieldSelect,
    toggleExpand
} from '../../../src/services/odata/urlGenerator';
import type { EntityType, FunctionImport, ODataMetadata } from '../../../src/types';

describe('URL Generator', () => {
    describe('formatODataValue', () => {
        it('should format string values with quotes', () => {
            expect(formatODataValue('test', 'Edm.String')).toBe("'test'");
        });

        it('should escape single quotes in strings', () => {
            expect(formatODataValue("test's", 'Edm.String')).toBe("'test''s'");
        });

        it('should format datetime values', () => {
            expect(formatODataValue('2024-01-15T10:30:00', 'Edm.DateTime')).toBe("datetime'2024-01-15T10:30:00'");
        });

        it('should format guid values', () => {
            expect(formatODataValue('12345678-1234-1234-1234-123456789012', 'Edm.Guid')).toBe(
                "guid'12345678-1234-1234-1234-123456789012'"
            );
        });

        it('should not quote numeric values', () => {
            expect(formatODataValue('42', 'Edm.Int32')).toBe('42');
            expect(formatODataValue('3.14', 'Edm.Decimal')).toBe('3.14');
            expect(formatODataValue('2.5', 'Edm.Double')).toBe('2.5');
        });

        it('should format boolean values', () => {
            expect(formatODataValue('true', 'Edm.Boolean')).toBe('true');
            expect(formatODataValue('TRUE', 'Edm.Boolean')).toBe('true');
            expect(formatODataValue('false', 'Edm.Boolean')).toBe('false');
        });

        it('should format binary values', () => {
            expect(formatODataValue('abc123', 'Edm.Binary')).toBe("binary'abc123'");
        });

        it('should format time values', () => {
            expect(formatODataValue('PT10H30M', 'Edm.Time')).toBe("time'PT10H30M'");
        });

        it('should format datetimeoffset values', () => {
            expect(formatODataValue('2024-01-15T10:30:00Z', 'Edm.DateTimeOffset')).toBe(
                "datetimeoffset'2024-01-15T10:30:00Z'"
            );
        });

        it('should return empty string for null/undefined', () => {
            expect(formatODataValue(null, 'Edm.String')).toBe('');
            expect(formatODataValue(undefined, 'Edm.String')).toBe('');
        });

        it('should default to string format for unknown types', () => {
            expect(formatODataValue('test', 'Unknown.Type')).toBe("'test'");
        });
    });

    describe('generateFilterExpression', () => {
        const entityType: EntityType = {
            name: 'Product',
            namespace: 'Test',
            fullName: 'Test.Product',
            keys: ['ID'],
            properties: [
                { name: 'ID', type: 'Edm.Int32', nullable: false, isKey: true },
                { name: 'Name', type: 'Edm.String', nullable: true, isKey: false },
                { name: 'Price', type: 'Edm.Decimal', nullable: true, isKey: false },
                { name: 'Active', type: 'Edm.Boolean', nullable: true, isKey: false }
            ],
            navigationProperties: []
        };

        it('should generate eq filter for string', () => {
            const result = generateFilterExpression({ field: 'Name', operator: 'eq', value: 'Test' }, entityType);
            expect(result).toBe("Name eq 'Test'");
        });

        it('should generate eq filter for number', () => {
            const result = generateFilterExpression({ field: 'ID', operator: 'eq', value: '42' }, entityType);
            expect(result).toBe('ID eq 42');
        });

        it('should generate comparison operators', () => {
            expect(generateFilterExpression({ field: 'Price', operator: 'gt', value: '10' }, entityType)).toBe(
                'Price gt 10'
            );
            expect(generateFilterExpression({ field: 'Price', operator: 'ge', value: '10' }, entityType)).toBe(
                'Price ge 10'
            );
            expect(generateFilterExpression({ field: 'Price', operator: 'lt', value: '100' }, entityType)).toBe(
                'Price lt 100'
            );
            expect(generateFilterExpression({ field: 'Price', operator: 'le', value: '100' }, entityType)).toBe(
                'Price le 100'
            );
            expect(generateFilterExpression({ field: 'Price', operator: 'ne', value: '0' }, entityType)).toBe(
                'Price ne 0'
            );
        });

        it('should generate contains filter (OData V2 substringof)', () => {
            const result = generateFilterExpression({ field: 'Name', operator: 'contains', value: 'test' }, entityType);
            expect(result).toBe("substringof('test',Name) eq true");
        });

        it('should generate startswith filter', () => {
            const result = generateFilterExpression(
                { field: 'Name', operator: 'startswith', value: 'Test' },
                entityType
            );
            expect(result).toBe("startswith(Name,'Test') eq true");
        });

        it('should generate endswith filter', () => {
            const result = generateFilterExpression({ field: 'Name', operator: 'endswith', value: 'ing' }, entityType);
            expect(result).toBe("endswith(Name,'ing') eq true");
        });

        it('should handle null entity type', () => {
            const result = generateFilterExpression({ field: 'Name', operator: 'eq', value: 'Test' }, null);
            expect(result).toBe("Name eq 'Test'");
        });
    });

    describe('generateFilterString', () => {
        const entityType: EntityType = {
            name: 'Product',
            namespace: 'Test',
            fullName: 'Test.Product',
            keys: ['ID'],
            properties: [
                { name: 'ID', type: 'Edm.Int32', nullable: false, isKey: true },
                { name: 'Name', type: 'Edm.String', nullable: true, isKey: false }
            ],
            navigationProperties: []
        };

        it('should combine multiple filters with and', () => {
            const filters = [
                { field: 'Name', operator: 'eq' as const, value: 'Test' },
                { field: 'ID', operator: 'gt' as const, value: '5' }
            ];
            const result = generateFilterString(filters, entityType);
            expect(result).toBe("Name eq 'Test' and ID gt 5");
        });

        it('should combine filters with or when specified', () => {
            const filters = [
                { field: 'Name', operator: 'eq' as const, value: 'A' },
                { field: 'Name', operator: 'eq' as const, value: 'B' }
            ];
            const result = generateFilterString(filters, entityType, 'or');
            expect(result).toBe("Name eq 'A' or Name eq 'B'");
        });

        it('should return empty string for empty filters', () => {
            expect(generateFilterString([], entityType)).toBe('');
        });

        it('should skip incomplete filters', () => {
            const filters = [
                { field: 'Name', operator: 'eq' as const, value: 'Test' },
                { field: '', operator: 'eq' as const, value: '' },
                { field: 'ID', operator: 'gt' as const, value: '5' }
            ];
            const result = generateFilterString(filters, entityType);
            expect(result).toBe("Name eq 'Test' and ID gt 5");
        });
    });

    describe('generateEntitySetUrl', () => {
        it('should generate basic URL', () => {
            const result = generateEntitySetUrl('https://server.com/sap/opu/odata/sap/SERVICE', {
                entitySet: 'Products'
            });
            expect(result).toBe('https://server.com/sap/opu/odata/sap/SERVICE/Products?$format=json');
        });

        it('should handle base URL with trailing slash', () => {
            const result = generateEntitySetUrl('https://server.com/service/', { entitySet: 'Products' });
            expect(result).toBe('https://server.com/service/Products?$format=json');
        });

        it('should add $select parameter', () => {
            const result = generateEntitySetUrl('https://server.com/service', {
                entitySet: 'Products',
                select: ['ID', 'Name', 'Price']
            });
            expect(result).toContain('$select=ID,Name,Price');
        });

        it('should add $expand parameter', () => {
            const result = generateEntitySetUrl('https://server.com/service', {
                entitySet: 'Products',
                expand: ['Category', 'Supplier']
            });
            expect(result).toContain('$expand=Category,Supplier');
        });

        it('should add $filter parameter', () => {
            const result = generateEntitySetUrl('https://server.com/service', {
                entitySet: 'Products',
                filters: [{ field: 'Price', operator: 'gt' as const, value: '10' }]
            });
            expect(result).toContain('$filter=');
        });

        it('should add $orderby parameter', () => {
            const result = generateEntitySetUrl('https://server.com/service', {
                entitySet: 'Products',
                orderby: { field: 'Name', direction: 'asc' }
            });
            expect(result).toContain('$orderby=Name asc');
        });

        it('should add $top and $skip parameters', () => {
            const result = generateEntitySetUrl('https://server.com/service', {
                entitySet: 'Products',
                top: 10,
                skip: 20
            });
            expect(result).toContain('$top=10');
            expect(result).toContain('$skip=20');
        });

        it('should skip $format when appendFormat is false', () => {
            const result = generateEntitySetUrl(
                'https://server.com/service',
                { entitySet: 'Products' },
                { appendFormat: false }
            );
            expect(result).not.toContain('$format');
        });

        it('should use custom format', () => {
            const result = generateEntitySetUrl(
                'https://server.com/service',
                { entitySet: 'Products' },
                { format: 'xml' }
            );
            expect(result).toContain('$format=xml');
        });
    });

    describe('generateFunctionImportUrl', () => {
        const functionImport: FunctionImport = {
            name: 'GetTopProducts',
            returnType: 'Collection(Test.Product)',
            httpMethod: 'GET',
            parameters: [
                { name: 'count', type: 'Edm.Int32', mode: 'In', nullable: false },
                { name: 'category', type: 'Edm.String', mode: 'In', nullable: true }
            ]
        };

        it('should generate URL with parameters', () => {
            const result = generateFunctionImportUrl('https://server.com/service', functionImport, {
                count: '10',
                category: 'Electronics'
            });
            expect(result).toBe(
                "https://server.com/service/GetTopProducts?count=10&category='Electronics'"
            );
        });

        it('should handle base URL with trailing slash', () => {
            const result = generateFunctionImportUrl('https://server.com/service/', functionImport, {
                count: '5'
            });
            expect(result).toBe('https://server.com/service/GetTopProducts?count=5');
        });

        it('should skip empty parameters', () => {
            const result = generateFunctionImportUrl('https://server.com/service', functionImport, {
                count: '10',
                category: ''
            });
            expect(result).toBe('https://server.com/service/GetTopProducts?count=10');
        });

        it('should generate URL without parameters', () => {
            const funcNoParams: FunctionImport = {
                name: 'RefreshData',
                httpMethod: 'POST',
                parameters: []
            };
            const result = generateFunctionImportUrl('https://server.com/service', funcNoParams, {});
            expect(result).toBe('https://server.com/service/RefreshData');
        });
    });

    describe('generateODataUrl', () => {
        const metadata: ODataMetadata = {
            schemas: [],
            entityTypes: [],
            entitySets: [],
            complexTypes: [],
            associations: [],
            functionImports: [],
            serviceUrl: 'https://server.com/service'
        };

        it('should generate entity set URL in entity mode', () => {
            const state = {
                ...createInitialBuilderState(),
                entitySet: 'Products'
            };
            const result = generateODataUrl(state, metadata);
            expect(result).toContain('/Products');
        });

        it('should generate function URL in function mode', () => {
            const functionImport: FunctionImport = {
                name: 'GetData',
                httpMethod: 'GET',
                parameters: []
            };
            const state = {
                ...createInitialBuilderState(),
                mode: 'function' as const,
                functionImport,
                functionParams: {}
            };
            const result = generateODataUrl(state, metadata);
            expect(result).toContain('/GetData');
        });

        it('should return "/" when no metadata', () => {
            const state = createInitialBuilderState();
            expect(generateODataUrl(state, null)).toBe('/');
        });

        it('should return "/" when no entity set in entity mode', () => {
            const state = createInitialBuilderState();
            expect(generateODataUrl(state, metadata)).toBe('/');
        });
    });

    describe('Builder State Helpers', () => {
        it('should create initial state', () => {
            const state = createInitialBuilderState();
            expect(state.mode).toBe('entity');
            expect(state.entitySet).toBeNull();
            expect(state.select).toEqual([]);
            expect(state.filters).toEqual([]);
        });

        it('should add filter', () => {
            const state = createInitialBuilderState();
            const newState = addFilter(state, 'Name', 'eq', 'Test');
            expect(newState.filters).toHaveLength(1);
            expect(newState.filters[0]).toEqual({ field: 'Name', operator: 'eq', value: 'Test' });
            // Original state unchanged
            expect(state.filters).toHaveLength(0);
        });

        it('should remove filter', () => {
            let state = createInitialBuilderState();
            state = addFilter(state, 'A', 'eq', '1');
            state = addFilter(state, 'B', 'eq', '2');
            state = addFilter(state, 'C', 'eq', '3');

            const newState = removeFilter(state, 1);
            expect(newState.filters).toHaveLength(2);
            expect(newState.filters[0].field).toBe('A');
            expect(newState.filters[1].field).toBe('C');
        });

        it('should set orderby', () => {
            const state = createInitialBuilderState();
            const newState = setOrderBy(state, 'Name', 'desc');
            expect(newState.orderby).toEqual({ field: 'Name', direction: 'desc' });
        });

        it('should default orderby to asc', () => {
            const state = createInitialBuilderState();
            const newState = setOrderBy(state, 'Name');
            expect(newState.orderby?.direction).toBe('asc');
        });

        it('should toggle field select on', () => {
            const state = createInitialBuilderState();
            const newState = toggleFieldSelect(state, 'Name');
            expect(newState.select).toContain('Name');
        });

        it('should toggle field select off', () => {
            let state = createInitialBuilderState();
            state = toggleFieldSelect(state, 'Name');
            state = toggleFieldSelect(state, 'Name');
            expect(state.select).not.toContain('Name');
        });

        it('should toggle expand on', () => {
            const state = createInitialBuilderState();
            const newState = toggleExpand(state, 'Category');
            expect(newState.expand).toContain('Category');
        });

        it('should toggle expand off', () => {
            let state = createInitialBuilderState();
            state = toggleExpand(state, 'Category');
            state = toggleExpand(state, 'Category');
            expect(state.expand).not.toContain('Category');
        });
    });
});
