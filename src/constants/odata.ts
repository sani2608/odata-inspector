/**
 * OData Constants
 *
 * OData-specific patterns, operators, and configuration values.
 */

import type { FilterOperator, LogicalOperator } from '../types';

/**
 * OData URL Patterns for request detection
 */
export const ODATA_PATTERNS = {
    BATCH: /\/\$batch\b/i,
    METADATA: /\/\$metadata\b/i,
    COUNT: /\/\$count\b/i,
    VALUE: /\/\$value\b/i,
    SAP_ODATA: /\/sap\/opu\/odata\//i,
    GENERIC_ODATA: /\/odata\//i
} as const;

/**
 * OData Query Parameters
 */
export const ODATA_PARAMS = {
    FILTER: '$filter',
    SELECT: '$select',
    EXPAND: '$expand',
    ORDERBY: '$orderby',
    TOP: '$top',
    SKIP: '$skip',
    COUNT: '$count',
    INLINECOUNT: '$inlinecount',
    FORMAT: '$format',
    SEARCH: '$search'
} as const;

/**
 * OData Filter Operators
 */
export const ODATA_OPERATORS: Record<string, FilterOperator> = {
    EQUAL: 'eq',
    NOT_EQUAL: 'ne',
    GREATER_THAN: 'gt',
    GREATER_EQUAL: 'ge',
    LESS_THAN: 'lt',
    LESS_EQUAL: 'le',
    CONTAINS: 'contains',
    STARTS_WITH: 'startswith',
    ENDS_WITH: 'endswith',
    SUBSTRING_OF: 'substringof'
} as const;

/**
 * OData Logical Operators
 */
export const ODATA_LOGICAL_OPERATORS: Record<string, LogicalOperator> = {
    AND: 'and',
    OR: 'or',
    NOT: 'not'
} as const;

/**
 * Operator display mappings for UI
 */
export const OPERATOR_DISPLAY: Record<FilterOperator, string> = {
    eq: '=',
    ne: '≠',
    gt: '>',
    ge: '≥',
    lt: '<',
    le: '≤',
    contains: 'contains',
    startswith: 'starts with',
    endswith: 'ends with',
    substringof: 'contains'
};

/**
 * Filter operators available in the query builder
 */
export const FILTER_OPERATORS: Array<{
    value: FilterOperator;
    label: string;
    description: string;
}> = [
    { value: 'eq', label: 'Equals', description: 'Exact match' },
    { value: 'ne', label: 'Not Equals', description: 'Not equal to' },
    { value: 'gt', label: 'Greater Than', description: 'Greater than value' },
    { value: 'ge', label: 'Greater or Equal', description: 'Greater than or equal to' },
    { value: 'lt', label: 'Less Than', description: 'Less than value' },
    { value: 'le', label: 'Less or Equal', description: 'Less than or equal to' },
    { value: 'contains', label: 'Contains', description: 'Contains substring (OData V4)' },
    { value: 'startswith', label: 'Starts With', description: 'Starts with string' },
    { value: 'endswith', label: 'Ends With', description: 'Ends with string' },
    { value: 'substringof', label: 'Substring Of', description: 'Substring match (OData V2)' }
];

/**
 * Batch Request Constants
 */
export const BATCH = {
    BOUNDARY_PREFIX: 'batch_',
    CHANGESET_PREFIX: 'changeset_',
    MEDIA_TYPE: 'multipart/mixed'
} as const;

/**
 * Common OData EDM Types
 */
export const EDM_TYPES = {
    STRING: 'Edm.String',
    INT32: 'Edm.Int32',
    INT64: 'Edm.Int64',
    DECIMAL: 'Edm.Decimal',
    DOUBLE: 'Edm.Double',
    SINGLE: 'Edm.Single',
    BOOLEAN: 'Edm.Boolean',
    DATETIME: 'Edm.DateTime',
    DATETIMEOFFSET: 'Edm.DateTimeOffset',
    TIME: 'Edm.Time',
    GUID: 'Edm.Guid',
    BINARY: 'Edm.Binary',
    BYTE: 'Edm.Byte',
    SBYTE: 'Edm.SByte',
    INT16: 'Edm.Int16'
} as const;

/**
 * Check if a type is a numeric EDM type
 */
export const isNumericType = (type: string): boolean => {
    const numericTypes = [
        EDM_TYPES.INT32,
        EDM_TYPES.INT64,
        EDM_TYPES.DECIMAL,
        EDM_TYPES.DOUBLE,
        EDM_TYPES.SINGLE,
        EDM_TYPES.BYTE,
        EDM_TYPES.SBYTE,
        EDM_TYPES.INT16
    ];
    return numericTypes.includes(type as (typeof numericTypes)[number]);
};

/**
 * Check if a type is a date/time EDM type
 */
export const isDateTimeType = (type: string): boolean => {
    const dateTypes = [EDM_TYPES.DATETIME, EDM_TYPES.DATETIMEOFFSET, EDM_TYPES.TIME];
    return dateTypes.includes(type as (typeof dateTypes)[number]);
};
