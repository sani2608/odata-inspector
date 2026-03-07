/**
 * OData TypeScript Type Definitions
 *
 * These types represent the core data structures used throughout
 * the OData Inspector extension.
 */

// ============================================================================
// HTTP & Network Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'MERGE';

export type StatusCodeRange = 'success' | 'redirect' | 'client-error' | 'server-error';

export interface HttpHeaders {
    [key: string]: string;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Query parameters parsed from an OData URL
 */
export interface ODataQueryParams {
    $select?: string[];
    $expand?: string[];
    $filter?: string;
    $orderby?: string;
    $top?: number;
    $skip?: number;
    $count?: string;
    $inlinecount?: string;
    $format?: string;
    $search?: string;
    [key: string]: string | string[] | number | undefined;
}

/**
 * Parsed filter condition from $filter parameter
 */
export interface ParsedFilterCondition {
    field: string;
    operator: FilterOperator;
    value: string;
    formattedDate?: string | null;
}

/**
 * Raw filter that couldn't be parsed
 */
export interface RawFilter {
    raw: string;
}

export type ParsedFilter = ParsedFilterCondition | RawFilter;

/**
 * Request details within a captured OData request
 */
export interface ODataRequestDetails {
    method: HttpMethod;
    url: string;
    /** Path portion of the URL (without query string) */
    path?: string;
    entitySet?: string;
    headers: HttpHeaders;
    filters: {
        raw?: string;
        parsed?: ParsedFilter[];
    };
    queryParams: ODataQueryParams;
    body: unknown | null;
}

/**
 * Response details within a captured OData request
 */
export interface ODataResponseDetails {
    statusCode: number | string;
    statusText: string;
    headers: HttpHeaders;
    data: unknown | null;
    size?: number;
    mimeType?: string;
}

/**
 * Call stack frame for request initiator
 */
export interface CallStackFrame {
    functionName?: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
}

/**
 * Request initiator information
 */
export interface RequestInitiator {
    type: 'script' | 'parser' | 'other';
    url?: string;
    lineNumber?: number;
    stack?: {
        callFrames: CallStackFrame[];
    };
}

/**
 * Batch request info when this request is part of a batch
 */
export interface BatchRequestInfo {
    /** Batch operation ID */
    id: number;
    /** Index within the batch (1-based) */
    index: number;
    /** Total items in the batch */
    total: number;
    /** Total duration of the batch request */
    totalDuration: number;
}

/**
 * Main captured OData request structure
 */
export interface ODataRequest {
    /** Unique identifier for the request */
    id: string;
    /** Internal request ID from Chrome */
    _requestId?: string;
    /** Full request URL */
    url: string;
    /** URL path portion */
    path: string;
    /** Display name (entity set or function) */
    name: string;
    /** Request type classification */
    type: ODataRequestType;
    /** Detailed request information */
    request: ODataRequestDetails;
    /** Response information */
    response: ODataResponseDetails;
    /** Request timestamp */
    timestamp: string | number;
    /** Duration in milliseconds */
    duration: number | null;
    /** Batch info if this is part of a batch request */
    batch?: BatchRequestInfo;
    /** Individual requests within a batch */
    batchItems?: BatchItem[];
    /** Request initiator information */
    initiator?: RequestInitiator;
    /** Whether request is still pending */
    _pending?: boolean;
    /** Whether request resulted in error */
    _error?: boolean;
    /** Whether this is a metadata request */
    isMetadata?: boolean;
    /** Metadata summary for metadata requests */
    metadataSummary?: {
        entityTypes: number;
        entitySets: number;
        complexTypes: number;
        functionImports: number;
        associations: number;
    };
    _isBatchRequest?: boolean;
}

export type ODataRequestType = 'batch' | 'metadata' | 'entity' | 'function' | 'count' | 'value' | 'unknown';

// ============================================================================
// Batch Request Types
// ============================================================================

/**
 * Individual item within a batch request
 */
export interface BatchItem {
    /** Content ID within the batch */
    contentId?: string;
    /** HTTP method for this item */
    method: HttpMethod;
    /** Relative URL for this item */
    url: string;
    /** Headers for this item */
    headers: HttpHeaders;
    /** Request body for this item */
    body?: unknown;
    /** Response for this item */
    response?: BatchItemResponse;
}

/**
 * Response for an individual batch item
 */
export interface BatchItemResponse {
    statusCode: number;
    statusText: string;
    headers: HttpHeaders;
    body: unknown;
}

/**
 * Parsed batch request structure
 */
export interface ParsedBatchRequest {
    boundary: string;
    items: BatchItem[];
}

/**
 * Parsed batch response structure
 */
export interface ParsedBatchResponse {
    boundary: string;
    items: BatchItemResponse[];
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * OData property definition
 */
export interface ODataProperty {
    name: string;
    type: string;
    nullable: boolean;
    maxLength?: string | null;
    precision?: string | null;
    scale?: string | null;
    isKey?: boolean;
    defaultValue?: string | null;

    // SAP-specific annotations
    sapLabel?: string; // sap:label - human-readable display name
    sapFilterable?: boolean; // sap:filterable - can be used in $filter
    sapSortable?: boolean; // sap:sortable - can be used in $orderby
    sapCreatable?: boolean; // sap:creatable - can be set on POST
    sapUpdatable?: boolean; // sap:updatable - can be changed on PUT/PATCH
}

/**
 * Navigation property definition (OData V2/V4)
 */
export interface NavigationProperty {
    name: string;
    /** OData V2: Relationship name */
    relationship?: string;
    fromRole?: string;
    toRole?: string;
    /** OData V4: Target type */
    type?: string;
    partner?: string;
}

/**
 * Entity type definition
 */
export interface EntityType {
    name: string;
    namespace: string;
    fullName: string;
    keys: string[];
    properties: ODataProperty[];
    navigationProperties: NavigationProperty[];
    baseType?: string;
}

/**
 * Entity set definition
 */
export interface EntitySet {
    name: string;
    entityType: string;
    navigationBindings: NavigationBinding[];
}

/**
 * Navigation property binding (OData V4)
 */
export interface NavigationBinding {
    path: string;
    target: string;
}

/**
 * Complex type definition
 */
export interface ComplexType {
    name: string;
    namespace: string;
    fullName: string;
    properties: ODataProperty[];
}

/**
 * Association end definition (OData V2)
 */
export interface AssociationEnd {
    type: string;
    multiplicity: string;
    role: string;
}

/**
 * Association definition (OData V2)
 */
export interface Association {
    name: string;
    namespace: string;
    ends: AssociationEnd[];
}

/**
 * Function import parameter
 */
export interface FunctionParameter {
    name: string;
    type: string;
    mode: 'In' | 'Out' | 'InOut';
    nullable: boolean;
}

/**
 * Function import definition
 */
export interface FunctionImport {
    name: string;
    returnType?: string;
    entitySet?: string;
    httpMethod: HttpMethod;
    parameters: FunctionParameter[];
}

/**
 * Schema definition
 */
export interface ODataSchema {
    namespace: string;
    alias?: string;
}

/**
 * Complete OData service metadata
 */
export interface ODataMetadata {
    schemas: ODataSchema[];
    entityTypes: EntityType[];
    entitySets: EntitySet[];
    complexTypes: ComplexType[];
    associations: Association[];
    functionImports: FunctionImport[];
    serviceUrl: string;
    /** Raw XML string */
    rawXml?: string;
}

// ============================================================================
// Filter & Query Builder Types
// ============================================================================

export type FilterOperator =
    | 'eq'
    | 'ne'
    | 'gt'
    | 'ge'
    | 'lt'
    | 'le'
    | 'contains'
    | 'startswith'
    | 'endswith'
    | 'substringof';

export type LogicalOperator = 'and' | 'or' | 'not';

/**
 * Filter condition for the query builder
 */
export interface FilterCondition {
    id: string;
    field: string;
    operator: FilterOperator;
    value: string;
    logicalOperator?: LogicalOperator;
}

/**
 * Simple filter for Request Builder (no id required)
 */
export interface ODataFilter {
    field: string;
    operator: FilterOperator;
    value: string;
}

/**
 * Sort order for $orderby
 */
export interface SortOrder {
    field: string;
    direction: 'asc' | 'desc';
}

/**
 * OrderBy state for Request Builder
 */
export interface OrderBy {
    field: string;
    direction: 'asc' | 'desc';
}

/**
 * Query builder state
 */
export interface QueryBuilderState {
    entitySet: string | null;
    selectedFields: string[];
    expandFields: string[];
    filters: FilterCondition[];
    orderBy: SortOrder[];
    top: number | null;
    skip: number | null;
    count: boolean;
    format: 'json' | 'xml' | null;
}

// ============================================================================
// UI State Types
// ============================================================================

export type Theme = 'dark' | 'light';

export type DetailTab = 'request' | 'response' | 'initiator';

export type MetadataSection = 'entityTypes' | 'complexTypes' | 'associations' | 'functionImports';

/**
 * UI panel state
 */
export interface PanelState {
    /** Currently selected request ID */
    selectedRequestId: string | null;
    /** Current detail tab */
    activeTab: DetailTab;
    /** Search/filter query */
    searchQuery: string;
    /** Response search query */
    responseSearchQuery: string;
    /** Current theme */
    theme: Theme;
    /** Detail panel width */
    detailPanelWidth: number;
    /** Whether metadata panel is open */
    metadataPanelOpen: boolean;
    /** Whether request builder is open */
    requestBuilderOpen: boolean;
}
