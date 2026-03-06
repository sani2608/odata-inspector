/**
 * OData URL Generator
 *
 * Generates OData V2 URLs from builder state for the Request Builder feature.
 *
 * ★ Insight ─────────────────────────────────────
 * - OData V2 uses different value formatting than V4:
 *   - Strings: 'value' (single quotes, escaped with '')
 *   - DateTime: datetime'2024-01-01T00:00:00'
 *   - Guid: guid'12345678-1234-1234-1234-123456789012'
 * - Function imports have parameters inline (?param=value)
 * - Entity queries use system query options ($select, $filter, etc.)
 * ─────────────────────────────────────────────────
 */

import type {
    EntityType,
    FilterOperator,
    FunctionImport,
    ODataFilter,
    ODataMetadata,
    ODataProperty,
    OrderBy
} from '../../types';

// ============================================================================
// Types (re-exported for backwards compatibility)
// ============================================================================

/** @deprecated Use ODataFilter from types */
export type FilterDefinition = ODataFilter;

/** @deprecated Use FilterOperator from types */
export type FilterOperatorType = FilterOperator;

/** @deprecated Use OrderBy from types */
export type OrderByDefinition = OrderBy;

export interface BuilderState {
    mode: 'entity' | 'function';
    entitySet: string | null;
    entityType: EntityType | null;
    select: string[];
    expand: string[];
    filters: ODataFilter[];
    orderby: OrderBy | null;
    top: number | null;
    skip: number | null;
    functionImport: FunctionImport | null;
    functionParams: Record<string, string>;
}

export interface UrlGeneratorOptions {
    appendFormat?: boolean;
    format?: 'json' | 'xml';
    encodeValues?: boolean;
}

// ============================================================================
// Value Formatting
// ============================================================================

/**
 * Format a parameter value for OData V2 URL based on its type
 */
export function formatODataValue(value: string | null | undefined, type: string): string {
    if (!value) return '';

    const typeStr = type || 'Edm.String';

    // Check DateTimeOffset before DateTime (both contain "DateTime")
    if (typeStr.includes('DateTimeOffset')) {
        return `datetimeoffset'${value}'`;
    }

    if (typeStr.includes('DateTime')) {
        return `datetime'${value}'`;
    }

    if (typeStr.includes('Guid')) {
        return `guid'${value}'`;
    }

    if (typeStr.includes('String')) {
        // Escape single quotes by doubling them
        return `'${value.replace(/'/g, "''")}'`;
    }

    if (
        typeStr.includes('Int') ||
        typeStr.includes('Decimal') ||
        typeStr.includes('Double') ||
        typeStr.includes('Single') ||
        typeStr.includes('Byte')
    ) {
        // Numeric types don't need quotes
        return value;
    }

    if (typeStr.includes('Boolean')) {
        return value.toLowerCase() === 'true' ? 'true' : 'false';
    }

    if (typeStr.includes('Binary')) {
        return `binary'${value}'`;
    }

    if (typeStr.includes('Time')) {
        return `time'${value}'`;
    }

    // Default to string formatting
    return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Get property type from entity type definition
 */
function getPropertyType(entityType: EntityType | null, fieldName: string): string {
    if (!entityType?.properties) return 'Edm.String';

    const prop = entityType.properties.find((p: ODataProperty) => p.name === fieldName);
    return prop?.type || 'Edm.String';
}

// ============================================================================
// Filter Expression Generation
// ============================================================================

/**
 * Generate a single filter expression for OData V2
 */
export function generateFilterExpression(filter: FilterDefinition, entityType: EntityType | null): string {
    const { field, operator, value } = filter;

    const type = getPropertyType(entityType, field);
    const isString = type.includes('String');

    // Format value based on type
    const formattedValue = formatODataValue(value, type);
    const stringValue = isString ? `'${value.replace(/'/g, "''")}'` : value;

    // Handle function-style operators (OData V2 syntax)
    switch (operator) {
        case 'contains':
            // OData V2: substringof('value', Field) eq true
            return `substringof(${stringValue},${field}) eq true`;

        case 'startswith':
            return `startswith(${field},${stringValue}) eq true`;

        case 'endswith':
            return `endswith(${field},${stringValue}) eq true`;

        default:
            // Standard comparison operators
            return `${field} ${operator} ${formattedValue}`;
    }
}

/**
 * Generate combined filter string from multiple filters
 */
export function generateFilterString(
    filters: FilterDefinition[],
    entityType: EntityType | null,
    combinator: 'and' | 'or' = 'and'
): string {
    const validFilters = filters.filter((f) => f.field && f.operator && f.value);

    if (validFilters.length === 0) return '';

    const expressions = validFilters.map((f) => generateFilterExpression(f, entityType));

    return expressions.join(` ${combinator} `);
}

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Generate OData URL for a function import call
 */
export function generateFunctionImportUrl(
    baseUrl: string,
    functionImport: FunctionImport,
    params: Record<string, string>
): string {
    let url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    url += functionImport.name;

    const paramParts: string[] = [];

    for (const param of functionImport.parameters || []) {
        const value = params[param.name];
        if (value !== undefined && value !== '') {
            const formattedValue = formatODataValue(value, param.type);
            paramParts.push(`${param.name}=${formattedValue}`);
        }
    }

    if (paramParts.length > 0) {
        url += `?${paramParts.join('&')}`;
    }

    return url;
}

/**
 * Generate OData URL for an entity set query
 */
export function generateEntitySetUrl(
    baseUrl: string,
    state: {
        entitySet: string;
        entityType?: EntityType | null;
        select?: string[];
        expand?: string[];
        filters?: FilterDefinition[];
        orderby?: OrderByDefinition | null;
        top?: number | null;
        skip?: number | null;
    },
    options: UrlGeneratorOptions = {}
): string {
    const { appendFormat = true, format = 'json', encodeValues = true } = options;

    let url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    url += state.entitySet;

    const params: string[] = [];

    // $select
    if (state.select && state.select.length > 0) {
        params.push(`$select=${state.select.join(',')}`);
    }

    // $expand
    if (state.expand && state.expand.length > 0) {
        params.push(`$expand=${state.expand.join(',')}`);
    }

    // $filter
    if (state.filters && state.filters.length > 0) {
        const filterStr = generateFilterString(state.filters, state.entityType || null);
        if (filterStr) {
            const encodedFilter = encodeValues ? encodeURIComponent(filterStr) : filterStr;
            params.push(`$filter=${encodedFilter}`);
        }
    }

    // $orderby
    if (state.orderby?.field) {
        params.push(`$orderby=${state.orderby.field} ${state.orderby.direction}`);
    }

    // $top
    if (state.top !== null && state.top !== undefined && state.top > 0) {
        params.push(`$top=${state.top}`);
    }

    // $skip
    if (state.skip !== null && state.skip !== undefined && state.skip > 0) {
        params.push(`$skip=${state.skip}`);
    }

    // $format
    if (appendFormat) {
        params.push(`$format=${format}`);
    }

    if (params.length > 0) {
        url += `?${params.join('&')}`;
    }

    return url;
}

/**
 * Generate OData URL from complete builder state
 */
export function generateODataUrl(state: BuilderState, metadata: ODataMetadata | null): string {
    if (!metadata) {
        return '/';
    }

    const baseUrl = metadata.serviceUrl || '';

    // Handle Function Import mode
    if (state.mode === 'function' && state.functionImport) {
        return generateFunctionImportUrl(baseUrl, state.functionImport, state.functionParams);
    }

    // Handle EntitySet mode
    if (!state.entitySet) {
        return '/';
    }

    return generateEntitySetUrl(baseUrl, {
        entitySet: state.entitySet,
        entityType: state.entityType,
        select: state.select,
        expand: state.expand,
        filters: state.filters,
        orderby: state.orderby,
        top: state.top,
        skip: state.skip
    });
}

// ============================================================================
// URL Building Helpers
// ============================================================================

/**
 * Create an initial empty builder state
 */
export function createInitialBuilderState(): BuilderState {
    return {
        mode: 'entity',
        entitySet: null,
        entityType: null,
        select: [],
        expand: [],
        filters: [],
        orderby: null,
        top: null,
        skip: null,
        functionImport: null,
        functionParams: {}
    };
}

/**
 * Add a filter to builder state
 */
export function addFilter(
    state: BuilderState,
    field: string,
    operator: FilterOperatorType,
    value: string
): BuilderState {
    return {
        ...state,
        filters: [...state.filters, { field, operator, value }]
    };
}

/**
 * Remove a filter from builder state by index
 */
export function removeFilter(state: BuilderState, index: number): BuilderState {
    return {
        ...state,
        filters: state.filters.filter((_, i) => i !== index)
    };
}

/**
 * Set orderby in builder state
 */
export function setOrderBy(state: BuilderState, field: string, direction: 'asc' | 'desc' = 'asc'): BuilderState {
    return {
        ...state,
        orderby: { field, direction }
    };
}

/**
 * Toggle field selection in builder state
 */
export function toggleFieldSelect(state: BuilderState, field: string): BuilderState {
    const isSelected = state.select.includes(field);
    return {
        ...state,
        select: isSelected ? state.select.filter((f) => f !== field) : [...state.select, field]
    };
}

/**
 * Toggle navigation property expansion
 */
export function toggleExpand(state: BuilderState, navProp: string): BuilderState {
    const isExpanded = state.expand.includes(navProp);
    return {
        ...state,
        expand: isExpanded ? state.expand.filter((e) => e !== navProp) : [...state.expand, navProp]
    };
}

export default generateODataUrl;
