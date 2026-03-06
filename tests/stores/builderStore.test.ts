/**
 * Builder Store Tests
 *
 * Tests for the Request Builder Zustand store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useBuilderStore } from '../../src/stores/builderStore';
import type { EntityType, FunctionImport } from '../../src/types';

// Reset store before each test
beforeEach(() => {
    useBuilderStore.getState().reset();
});

describe('Builder Store', () => {
    describe('Initial State', () => {
        it('should have correct initial state', () => {
            const state = useBuilderStore.getState();
            expect(state.isOpen).toBe(false);
            expect(state.mode).toBe('entity');
            expect(state.method).toBe('GET');
            expect(state.entitySet).toBe('');
            expect(state.entityType).toBeNull();
            expect(state.select).toEqual([]);
            expect(state.expand).toEqual([]);
            expect(state.filters).toEqual([]);
            expect(state.orderby).toEqual({ field: '', direction: 'asc' });
            expect(state.top).toBeNull();
            expect(state.skip).toBeNull();
            expect(state.functionImport).toBeNull();
            expect(state.functionParams).toEqual({});
        });
    });

    describe('UI Actions', () => {
        it('should open the builder', () => {
            useBuilderStore.getState().open();
            expect(useBuilderStore.getState().isOpen).toBe(true);
        });

        it('should close the builder', () => {
            useBuilderStore.getState().open();
            useBuilderStore.getState().close();
            expect(useBuilderStore.getState().isOpen).toBe(false);
        });

        it('should toggle the builder', () => {
            useBuilderStore.getState().toggle();
            expect(useBuilderStore.getState().isOpen).toBe(true);
            useBuilderStore.getState().toggle();
            expect(useBuilderStore.getState().isOpen).toBe(false);
        });
    });

    describe('Mode Switching', () => {
        const mockEntityType: EntityType = {
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

        const mockFunctionImport: FunctionImport = {
            name: 'GetTopProducts',
            httpMethod: 'GET',
            parameters: [{ name: 'count', type: 'Edm.Int32', mode: 'In', nullable: false }]
        };

        it('should switch to function mode and clear entity state', () => {
            // Set up entity state
            useBuilderStore.getState().setEntitySet('Products');
            useBuilderStore.getState().setEntityType(mockEntityType);
            useBuilderStore.getState().setSelectFields(['ID', 'Name']);
            useBuilderStore.getState().setExpandFields(['Category']);
            useBuilderStore.getState().addFilter({ field: 'ID', operator: 'eq', value: '1' });

            // Switch to function mode
            useBuilderStore.getState().setMode('function');

            const state = useBuilderStore.getState();
            expect(state.mode).toBe('function');
            expect(state.entitySet).toBe('');
            expect(state.entityType).toBeNull();
            expect(state.select).toEqual([]);
            expect(state.expand).toEqual([]);
            expect(state.filters).toEqual([]);
        });

        it('should switch to entity mode and clear function state', () => {
            // Set up function state
            useBuilderStore.getState().setMode('function');
            useBuilderStore.getState().setFunctionImport(mockFunctionImport);
            useBuilderStore.getState().setFunctionParam('count', '10');

            // Switch to entity mode
            useBuilderStore.getState().setMode('entity');

            const state = useBuilderStore.getState();
            expect(state.mode).toBe('entity');
            expect(state.functionImport).toBeNull();
            expect(state.functionParams).toEqual({});
        });
    });

    describe('Entity Mode Actions', () => {
        it('should set entity set and clear related fields', () => {
            useBuilderStore.getState().setSelectFields(['ID']);
            useBuilderStore.getState().setExpandFields(['Category']);
            useBuilderStore.getState().addFilter({ field: 'ID', operator: 'eq', value: '1' });

            useBuilderStore.getState().setEntitySet('Products');

            const state = useBuilderStore.getState();
            expect(state.entitySet).toBe('Products');
            expect(state.select).toEqual([]);
            expect(state.expand).toEqual([]);
            expect(state.filters).toEqual([]);
        });

        it('should toggle select field on', () => {
            useBuilderStore.getState().toggleSelectField('Name');
            expect(useBuilderStore.getState().select).toContain('Name');
        });

        it('should toggle select field off', () => {
            useBuilderStore.getState().toggleSelectField('Name');
            useBuilderStore.getState().toggleSelectField('Name');
            expect(useBuilderStore.getState().select).not.toContain('Name');
        });

        it('should set select fields', () => {
            useBuilderStore.getState().setSelectFields(['ID', 'Name', 'Price']);
            expect(useBuilderStore.getState().select).toEqual(['ID', 'Name', 'Price']);
        });

        it('should select all fields', () => {
            useBuilderStore.getState().selectAllFields(['ID', 'Name', 'Price', 'Category']);
            expect(useBuilderStore.getState().select).toEqual(['ID', 'Name', 'Price', 'Category']);
        });

        it('should clear select fields', () => {
            useBuilderStore.getState().setSelectFields(['ID', 'Name']);
            useBuilderStore.getState().clearSelectFields();
            expect(useBuilderStore.getState().select).toEqual([]);
        });

        it('should toggle expand field on', () => {
            useBuilderStore.getState().toggleExpandField('Category');
            expect(useBuilderStore.getState().expand).toContain('Category');
        });

        it('should toggle expand field off', () => {
            useBuilderStore.getState().toggleExpandField('Category');
            useBuilderStore.getState().toggleExpandField('Category');
            expect(useBuilderStore.getState().expand).not.toContain('Category');
        });

        it('should set expand fields', () => {
            useBuilderStore.getState().setExpandFields(['Category', 'Supplier']);
            expect(useBuilderStore.getState().expand).toEqual(['Category', 'Supplier']);
        });
    });

    describe('Filter Actions', () => {
        it('should add a filter', () => {
            useBuilderStore.getState().addFilter({ field: 'Name', operator: 'eq', value: 'Test' });
            expect(useBuilderStore.getState().filters).toHaveLength(1);
            expect(useBuilderStore.getState().filters[0]).toEqual({
                field: 'Name',
                operator: 'eq',
                value: 'Test'
            });
        });

        it('should add multiple filters', () => {
            useBuilderStore.getState().addFilter({ field: 'Name', operator: 'eq', value: 'Test' });
            useBuilderStore.getState().addFilter({ field: 'ID', operator: 'gt', value: '5' });
            expect(useBuilderStore.getState().filters).toHaveLength(2);
        });

        it('should update a filter', () => {
            useBuilderStore.getState().addFilter({ field: 'Name', operator: 'eq', value: 'Test' });
            useBuilderStore.getState().updateFilter(0, { value: 'Updated' });
            expect(useBuilderStore.getState().filters[0].value).toBe('Updated');
        });

        it('should update filter operator', () => {
            useBuilderStore.getState().addFilter({ field: 'ID', operator: 'eq', value: '5' });
            useBuilderStore.getState().updateFilter(0, { operator: 'gt' });
            expect(useBuilderStore.getState().filters[0].operator).toBe('gt');
        });

        it('should remove a filter', () => {
            useBuilderStore.getState().addFilter({ field: 'A', operator: 'eq', value: '1' });
            useBuilderStore.getState().addFilter({ field: 'B', operator: 'eq', value: '2' });
            useBuilderStore.getState().addFilter({ field: 'C', operator: 'eq', value: '3' });

            useBuilderStore.getState().removeFilter(1);

            const filters = useBuilderStore.getState().filters;
            expect(filters).toHaveLength(2);
            expect(filters[0].field).toBe('A');
            expect(filters[1].field).toBe('C');
        });

        it('should set filters', () => {
            useBuilderStore.getState().setFilters([
                { field: 'X', operator: 'eq', value: '1' },
                { field: 'Y', operator: 'ne', value: '2' }
            ]);
            expect(useBuilderStore.getState().filters).toHaveLength(2);
        });

        it('should clear filters', () => {
            useBuilderStore.getState().addFilter({ field: 'Name', operator: 'eq', value: 'Test' });
            useBuilderStore.getState().clearFilters();
            expect(useBuilderStore.getState().filters).toEqual([]);
        });
    });

    describe('Pagination/Sorting Actions', () => {
        it('should set orderby', () => {
            useBuilderStore.getState().setOrderBy({ field: 'Name', direction: 'asc' });
            expect(useBuilderStore.getState().orderby).toEqual({ field: 'Name', direction: 'asc' });
        });

        it('should set orderby descending', () => {
            useBuilderStore.getState().setOrderBy({ field: 'Price', direction: 'desc' });
            expect(useBuilderStore.getState().orderby).toEqual({ field: 'Price', direction: 'desc' });
        });

        it('should set top', () => {
            useBuilderStore.getState().setTop(10);
            expect(useBuilderStore.getState().top).toBe(10);
        });

        it('should set top to null', () => {
            useBuilderStore.getState().setTop(10);
            useBuilderStore.getState().setTop(null);
            expect(useBuilderStore.getState().top).toBeNull();
        });

        it('should set skip', () => {
            useBuilderStore.getState().setSkip(20);
            expect(useBuilderStore.getState().skip).toBe(20);
        });

        it('should set skip to null', () => {
            useBuilderStore.getState().setSkip(20);
            useBuilderStore.getState().setSkip(null);
            expect(useBuilderStore.getState().skip).toBeNull();
        });
    });

    describe('Function Mode Actions', () => {
        const mockFunctionImport: FunctionImport = {
            name: 'GetTopProducts',
            httpMethod: 'POST',
            returnType: 'Collection(Test.Product)',
            parameters: [
                { name: 'count', type: 'Edm.Int32', mode: 'In', nullable: false },
                { name: 'category', type: 'Edm.String', mode: 'In', nullable: true }
            ]
        };

        it('should set function import and update method', () => {
            useBuilderStore.getState().setFunctionImport(mockFunctionImport);
            const state = useBuilderStore.getState();
            expect(state.functionImport).toEqual(mockFunctionImport);
            expect(state.method).toBe('POST');
            expect(state.functionParams).toEqual({});
        });

        it('should clear function import', () => {
            useBuilderStore.getState().setFunctionImport(mockFunctionImport);
            useBuilderStore.getState().setFunctionImport(null);
            const state = useBuilderStore.getState();
            expect(state.functionImport).toBeNull();
            expect(state.method).toBe('GET'); // Default to GET when null
        });

        it('should set function parameter', () => {
            useBuilderStore.getState().setFunctionParam('count', '10');
            expect(useBuilderStore.getState().functionParams).toEqual({ count: '10' });
        });

        it('should set multiple function parameters', () => {
            useBuilderStore.getState().setFunctionParam('count', '10');
            useBuilderStore.getState().setFunctionParam('category', 'Electronics');
            expect(useBuilderStore.getState().functionParams).toEqual({
                count: '10',
                category: 'Electronics'
            });
        });

        it('should remove function parameter when value is empty', () => {
            useBuilderStore.getState().setFunctionParam('count', '10');
            useBuilderStore.getState().setFunctionParam('count', '');
            expect(useBuilderStore.getState().functionParams).toEqual({});
        });

        it('should clear function parameters', () => {
            useBuilderStore.getState().setFunctionParam('count', '10');
            useBuilderStore.getState().setFunctionParam('category', 'Electronics');
            useBuilderStore.getState().clearFunctionParams();
            expect(useBuilderStore.getState().functionParams).toEqual({});
        });
    });

    describe('Reset Actions', () => {
        const mockEntityType: EntityType = {
            name: 'Product',
            namespace: 'Test',
            fullName: 'Test.Product',
            keys: ['ID'],
            properties: [],
            navigationProperties: []
        };

        it('should reset all state', () => {
            // Set up various state
            useBuilderStore.getState().open();
            useBuilderStore.getState().setMethod('POST');
            useBuilderStore.getState().setEntitySet('Products');
            useBuilderStore.getState().setEntityType(mockEntityType);
            useBuilderStore.getState().setSelectFields(['ID']);
            useBuilderStore.getState().addFilter({ field: 'ID', operator: 'eq', value: '1' });
            useBuilderStore.getState().setTop(10);

            useBuilderStore.getState().reset();

            const state = useBuilderStore.getState();
            expect(state.isOpen).toBe(false);
            expect(state.mode).toBe('entity');
            expect(state.method).toBe('GET');
            expect(state.entitySet).toBe('');
            expect(state.entityType).toBeNull();
            expect(state.select).toEqual([]);
            expect(state.filters).toEqual([]);
            expect(state.top).toBeNull();
        });

        it('should reset entity mode state only', () => {
            // Set up entity state
            useBuilderStore.getState().setEntitySet('Products');
            useBuilderStore.getState().setEntityType(mockEntityType);
            useBuilderStore.getState().setSelectFields(['ID']);
            useBuilderStore.getState().setExpandFields(['Category']);
            useBuilderStore.getState().addFilter({ field: 'ID', operator: 'eq', value: '1' });
            useBuilderStore.getState().setOrderBy({ field: 'Name', direction: 'asc' });
            useBuilderStore.getState().setTop(10);
            useBuilderStore.getState().setSkip(5);

            // Set some function state
            useBuilderStore.getState().setFunctionParam('test', 'value');

            useBuilderStore.getState().resetEntityMode();

            const state = useBuilderStore.getState();
            expect(state.entitySet).toBe('');
            expect(state.entityType).toBeNull();
            expect(state.select).toEqual([]);
            expect(state.expand).toEqual([]);
            expect(state.filters).toEqual([]);
            expect(state.orderby).toEqual({ field: '', direction: 'asc' });
            expect(state.top).toBeNull();
            expect(state.skip).toBeNull();
            // Function params should be preserved
            expect(state.functionParams).toEqual({ test: 'value' });
        });

        it('should reset function mode state only', () => {
            const mockFunctionImport: FunctionImport = {
                name: 'Test',
                httpMethod: 'GET',
                parameters: []
            };

            // Set up function state
            useBuilderStore.getState().setFunctionImport(mockFunctionImport);
            useBuilderStore.getState().setFunctionParam('count', '10');

            // Set some entity state
            useBuilderStore.getState().setSelectFields(['ID']);

            useBuilderStore.getState().resetFunctionMode();

            const state = useBuilderStore.getState();
            expect(state.functionImport).toBeNull();
            expect(state.functionParams).toEqual({});
            // Entity state should be preserved
            expect(state.select).toEqual(['ID']);
        });
    });

    describe('Method Actions', () => {
        it('should set method', () => {
            useBuilderStore.getState().setMethod('POST');
            expect(useBuilderStore.getState().method).toBe('POST');
        });

        it('should set method to any HTTP method', () => {
            useBuilderStore.getState().setMethod('DELETE');
            expect(useBuilderStore.getState().method).toBe('DELETE');

            useBuilderStore.getState().setMethod('PUT');
            expect(useBuilderStore.getState().method).toBe('PUT');

            useBuilderStore.getState().setMethod('PATCH');
            expect(useBuilderStore.getState().method).toBe('PATCH');
        });
    });
});
