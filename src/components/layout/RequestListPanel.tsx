/**
 * RequestListPanel Component
 *
 * Left sidebar containing the search box and request list.
 *
 * ★ Insight ─────────────────────────────────────
 * - Uses requestStore for request data and filtering
 * - Search filters by name, URL, and method
 * - Empty state shown when no requests captured
 * - RequestItem shows method, status, duration, batch info, and metadata indicator
 * - Pending requests show a loading spinner
 * ─────────────────────────────────────────────────
 */

import { FileText, Layers, Loader2, Search, Trash2 } from 'lucide-react';
import { memo, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { useFilteredRequests, useRequestStore } from '../../stores/requestStore';
import type { ODataRequest } from '../../types';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

/**
 * Get badge variant for HTTP method
 */
function getMethodVariant(method: string): 'get' | 'post' | 'put' | 'patch' | 'delete' | 'default' {
    switch (method.toUpperCase()) {
        case 'GET':
            return 'get';
        case 'POST':
            return 'post';
        case 'PUT':
            return 'put';
        case 'PATCH':
        case 'MERGE':
            return 'patch';
        case 'DELETE':
            return 'delete';
        default:
            return 'default';
    }
}

/**
 * Get status indicator color - theme-aware
 */
function getStatusColor(statusCode: number | string): string {
    if (statusCode === 'pending') return 'text-muted';
    if (statusCode === 'ERR') return 'status-error';

    const code = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
    if (Number.isNaN(code)) return 'text-muted';
    if (code >= 200 && code < 300) return 'status-success font-semibold';
    if (code >= 300 && code < 400) return 'status-warning';
    if (code >= 400 && code < 500) return 'status-warning';
    if (code >= 500) return 'status-error';
    return 'text-muted';
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
    return <Loader2 className="h-3 w-3 animate-spin text-foreground-muted" />;
}

/**
 * Request item for the list
 *
 * Shows method badge, status code, duration, batch info, and metadata indicator
 *
 * Memoized to prevent unnecessary re-renders when sibling items change.
 */
const RequestItem = memo(function RequestItem({
    request,
    isSelected,
    onClick
}: {
    request: ODataRequest;
    isSelected: boolean;
    onClick: () => void;
}) {
    const statusCode = request.response?.statusCode;
    const statusColor = statusCode ? getStatusColor(statusCode) : '';
    const isPending = request._pending;
    const isError = request._error;
    const isBatch = request.batch;
    const isMetadata = request.isMetadata;
    return (
        <button
            type="button"
            onClick={onClick}
            data-selected={isSelected}
            title={`${request.request.method} request to ${request.name || request.path}${statusCode ? `, status ${statusCode}` : ''}`}
            className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 border',
                'request-item-bg border-theme',
                'request-item-hover',
                'focus:outline-none focus:ring-2 focus:ring-accent',
                isSelected && 'request-item-selected',
                isPending && 'opacity-70',
                isError && 'request-item-error'
            )}
        >
            {/* Top row: method, status, indicators, duration */}
            <div className="flex items-center gap-1.5 mb-1">
                <Badge variant={getMethodVariant(request.request.method)} className="text-[10px] px-1.5 py-0 shrink-0">
                    {request.request.method}
                </Badge>

                {/* Status code or loading spinner */}
                {isPending ? (
                    <LoadingSpinner />
                ) : (
                    statusCode && <span className={cn('text-xs font-mono', statusColor)}>{statusCode}</span>
                )}

                {/* Batch indicator - parsed batch from DevTools */}
                {isBatch && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5" title={`Batch request ${isBatch.index} of ${isBatch.total}`}>
                        <Layers className="h-2.5 w-2.5" aria-hidden="true" />
                        {isBatch.index}/{isBatch.total}
                    </Badge>
                )}


                {/* Metadata indicator */}
                {isMetadata && (
                    <Badge variant="meta" className="text-[9px] px-1 py-0 gap-0.5">
                        <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                        META
                    </Badge>
                )}

                {/* Duration (right-aligned) */}
                {request.duration !== null && request.duration !== undefined && (
                    <span
                        className="text-xs text-accent ml-auto shrink-0 font-mono"
                        title={`Duration: ${request.duration} milliseconds`}
                    >
                        {request.duration}ms
                    </span>
                )}
            </div>

            {/* Name */}
            <div className="text-sm text-primary font-medium truncate">{request.name || 'Unknown'}</div>

            {/* Path */}
            <div className="text-xs text-muted truncate mt-0.5 font-mono">{request.path}</div>
        </button>
    );
});

export function RequestListPanel() {
    const { searchQuery, setSearchQuery, selectedRequestId, selectRequest, requests, clearRequests } = useRequestStore();
    const filteredRequests = useFilteredRequests();

    // Memoize the search change handler
    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value);
        },
        [setSearchQuery]
    );

    // Memoize select handler factory to prevent creating new functions on each render
    const handleSelectRequest = useCallback(
        (id: string) => {
            selectRequest(id);
        },
        [selectRequest]
    );

    return (
        <section className="flex flex-col h-full sidebar-bg" aria-label="Request list">
            {/* Search box with Clear button - 80/20 split */}
            <div className="p-3 border-b border-theme header-bg">
                <div className="flex gap-2">
                    <div className="relative flex-[4]">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            placeholder="Filter requests..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="pl-9"
                            aria-label="Filter requests by name, URL, or method"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearRequests}
                        disabled={requests.length === 0}
                        aria-label="Clear all captured requests"
                        className="flex-[1] h-9 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] disabled:opacity-30"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>

            {/* Request list */}
            <div
                className="flex-1 overflow-y-auto p-2 space-y-1"
                role="listbox"
                aria-label="Captured OData requests"
                aria-multiselectable="false"
            >
                {filteredRequests.length === 0 ? (
                    // Empty state
                    <output className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="text-5xl mb-4 opacity-80" aria-hidden="true">
                            📡
                        </div>
                        <p className="text-sm text-primary mb-2 font-medium">No OData requests captured</p>
                        <p className="text-xs text-muted max-w-xs">
                            Navigate to a page with OData/SAP requests to see them here
                        </p>
                    </output>
                ) : (
                    <div className="space-y-1">
                        {filteredRequests.map((request) => (
                            <RequestItem
                                key={request.id}
                                request={request}
                                isSelected={request.id === selectedRequestId}
                                onClick={() => handleSelectRequest(request.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer with count */}
            <div className="px-3 py-2 border-t border-theme header-bg text-xs text-secondary" aria-live="polite">
                <span className="text-accent font-semibold">{filteredRequests.length}</span>
                {' '}request{filteredRequests.length !== 1 ? 's' : ''}
                {searchQuery && <span className="text-accent"> (filtered)</span>}
            </div>
        </section>
    );
}

export default RequestListPanel;
