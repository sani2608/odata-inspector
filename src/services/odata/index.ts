/**
 * OData Services
 *
 * Central export point for all OData parsing and generation utilities.
 */

export type {
    BatchContext,
    BatchRequestItem,
    BatchResponseItem,
    ChangesetRequests,
    ChangesetResponses,
    ParsedBatchRequest,
    ParsedBatchResponse,
    ParsedContentType
} from './batchParser';
// Batch parsing
export {
    createBatchContext,
    extractBoundary,
    flattenBatchRequests,
    flattenBatchResponses,
    parseBatchRequestBody,
    parseBatchResponseBody,
    parseContentType,
    readBatchRequests,
    readBatchResponses
} from './batchParser';

// Metadata parsing
export {
    extractServiceUrl,
    findComplexType,
    findEntitySet,
    findEntityType,
    findFunctionImport,
    getEntityTypeForSet,
    parseMetadataXml
} from './metadataParser';
// Request execution
export type { ExecuteOptions, ExecuteResponse } from './requestExecutor';
export { executeMockRequest, executeRequest } from './requestExecutor';
export type {
    BuilderState,
    FilterDefinition,
    FilterOperatorType,
    OrderByDefinition,
    UrlGeneratorOptions
} from './urlGenerator';
// URL generation
export {
    addFilter,
    createInitialBuilderState,
    formatODataValue,
    generateEntitySetUrl,
    generateFilterExpression,
    generateFilterString,
    generateFunctionImportUrl,
    generateODataUrl,
    removeFilter,
    setOrderBy,
    toggleExpand,
    toggleFieldSelect
} from './urlGenerator';
