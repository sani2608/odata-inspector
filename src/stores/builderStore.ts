/**
 * Builder Store
 *
 * Zustand store for the OData Request Builder state.
 *
 * ★ Insight ─────────────────────────────────────
 * - Manages two modes: 'entity' (EntitySet queries) and 'function' (FunctionImports)
 * - Entity mode tracks $select, $expand, $filter, $orderby, $top, $skip
 * - Function mode tracks function import selection and parameter values
 * - Replaces the vanilla JS BuilderState observable pattern
 * ─────────────────────────────────────────────────
 */

import { create } from 'zustand';
import type { EntityType, FunctionImport, ODataFilter, OrderBy } from '../types';

type BuilderMode = 'entity' | 'function';

interface BuilderState {
    // UI State
    isOpen: boolean;

    // Mode: entity or function
    mode: BuilderMode;

    // HTTP method
    method: string;

    // Entity mode state
    entitySet: string;
    entityType: EntityType | null;
    select: string[];
    expand: string[];
    filters: ODataFilter[];
    orderby: OrderBy;
    top: number | null;
    skip: number | null;

    // Function mode state
    functionImport: FunctionImport | null;
    functionParams: Record<string, string>;

    // Actions
    open: () => void;
    close: () => void;
    toggle: () => void;

    setMode: (mode: BuilderMode) => void;
    setMethod: (method: string) => void;

    // Entity mode actions
    setEntitySet: (entitySet: string) => void;
    setEntityType: (entityType: EntityType | null) => void;
    toggleSelectField: (field: string) => void;
    setSelectFields: (fields: string[]) => void;
    selectAllFields: (fields: string[]) => void;
    clearSelectFields: () => void;
    toggleExpandField: (field: string) => void;
    setExpandFields: (fields: string[]) => void;

    // Filter actions
    addFilter: (filter: ODataFilter) => void;
    updateFilter: (index: number, updates: Partial<ODataFilter>) => void;
    removeFilter: (index: number) => void;
    setFilters: (filters: ODataFilter[]) => void;
    clearFilters: () => void;

    // Pagination/sorting actions
    setOrderBy: (orderby: OrderBy) => void;
    setTop: (top: number | null) => void;
    setSkip: (skip: number | null) => void;

    // Function mode actions
    setFunctionImport: (functionImport: FunctionImport | null) => void;
    setFunctionParam: (name: string, value: string) => void;
    clearFunctionParams: () => void;

    // Reset
    reset: () => void;
    resetEntityMode: () => void;
    resetFunctionMode: () => void;
}

const DEFAULT_ORDERBY: OrderBy = { field: '', direction: 'asc' };

const getDefaultState = () => ({
    isOpen: false,
    mode: 'entity' as BuilderMode,
    method: 'GET',
    entitySet: '',
    entityType: null,
    select: [],
    expand: [],
    filters: [],
    orderby: { ...DEFAULT_ORDERBY },
    top: null,
    skip: null,
    functionImport: null,
    functionParams: {}
});

export const useBuilderStore = create<BuilderState>((set) => ({
    ...getDefaultState(),

    // UI Actions
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),

    setMode: (mode) => {
        if (mode === 'entity') {
            // Switching to entity mode - clear function state
            set({
                mode,
                functionImport: null,
                functionParams: {}
            });
        } else {
            // Switching to function mode - clear entity state
            set({
                mode,
                entitySet: '',
                entityType: null,
                select: [],
                expand: [],
                filters: []
            });
        }
    },

    setMethod: (method) => set({ method }),

    // Entity mode actions
    setEntitySet: (entitySet) =>
        set({
            entitySet,
            select: [],
            expand: [],
            filters: []
        }),

    setEntityType: (entityType) => set({ entityType }),

    toggleSelectField: (field) =>
        set((state) => {
            const select = [...state.select];
            const index = select.indexOf(field);
            if (index === -1) {
                select.push(field);
            } else {
                select.splice(index, 1);
            }
            return { select };
        }),

    setSelectFields: (fields) => set({ select: fields }),

    selectAllFields: (fields) => set({ select: [...fields] }),

    clearSelectFields: () => set({ select: [] }),

    toggleExpandField: (field) =>
        set((state) => {
            const expand = [...state.expand];
            const index = expand.indexOf(field);
            if (index === -1) {
                expand.push(field);
            } else {
                expand.splice(index, 1);
            }
            return { expand };
        }),

    setExpandFields: (fields) => set({ expand: fields }),

    // Filter actions
    addFilter: (filter) =>
        set((state) => ({
            filters: [...state.filters, filter]
        })),

    updateFilter: (index, updates) =>
        set((state) => {
            const filters = [...state.filters];
            filters[index] = { ...filters[index], ...updates };
            return { filters };
        }),

    removeFilter: (index) =>
        set((state) => ({
            filters: state.filters.filter((_, i) => i !== index)
        })),

    setFilters: (filters) => set({ filters }),

    clearFilters: () => set({ filters: [] }),

    // Pagination/sorting actions
    setOrderBy: (orderby) => set({ orderby }),

    setTop: (top) => set({ top }),

    setSkip: (skip) => set({ skip }),

    // Function mode actions
    setFunctionImport: (functionImport) =>
        set({
            functionImport,
            functionParams: {},
            method: functionImport?.httpMethod || 'GET'
        }),

    setFunctionParam: (name, value) =>
        set((state) => {
            const functionParams = { ...state.functionParams };
            if (value) {
                functionParams[name] = value;
            } else {
                delete functionParams[name];
            }
            return { functionParams };
        }),

    clearFunctionParams: () => set({ functionParams: {} }),

    // Reset actions
    reset: () => set(getDefaultState()),

    resetEntityMode: () =>
        set({
            entitySet: '',
            entityType: null,
            select: [],
            expand: [],
            filters: [],
            orderby: { ...DEFAULT_ORDERBY },
            top: null,
            skip: null
        }),

    resetFunctionMode: () =>
        set({
            functionImport: null,
            functionParams: {}
        })
}));

/**
 * Selector: Check if builder is open
 */
export const useBuilderIsOpen = () => useBuilderStore((state) => state.isOpen);

/**
 * Selector: Get current mode
 */
export const useBuilderMode = () => useBuilderStore((state) => state.mode);

/**
 * Selector: Check if a valid entity set is selected
 */
export const useHasEntitySet = () => useBuilderStore((state) => !!state.entitySet);

/**
 * Selector: Check if a valid function import is selected
 */
export const useHasFunctionImport = () => useBuilderStore((state) => !!state.functionImport);

export default useBuilderStore;
