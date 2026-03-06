/**
 * DetailPanel Component
 *
 * Center panel showing details of the selected request.
 * Uses tabs for Request, Response, and Initiator sections.
 *
 * ★ Insight ─────────────────────────────────────
 * - Comprehensive detail view with three tabs
 * - Request tab: URL, filters, parameters, headers, body
 * - Response tab: Status, headers, JSON/XML viewer with search
 * - Initiator tab: Call stack visualization
 * - Response search supports both JSON (via json-viewer) and XML
 * ─────────────────────────────────────────────────
 */

import { ArrowDownToLine, FileJson, Globe, Layers, Send } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRequestStore, useSelectedRequest } from '../../stores/requestStore';
import type { DetailTab, ODataRequest } from '../../types';
import { formatFileSize } from '../../utils/format';
import type { JsonTreeViewHandle, XmlViewerHandle } from '../detail';
import {
    CallStackViewer,
    FiltersCard,
    HeadersTable,
    JsonTreeView,
    ParamsCard,
    ResponseSearch,
    XmlViewer
} from '../detail';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

/**
 * Empty state shown when no request is selected
 */
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 panel-bg">
            <div className="text-6xl mb-6 opacity-80">🔍</div>
            <h2 className="text-lg font-semibold text-primary mb-2">Select a request</h2>
            <p className="text-sm text-muted max-w-md">
                Select a request from the list to view its details, including headers, filters, and response data
            </p>
        </div>
    );
}

/**
 * Detail header showing method, path, status
 */
function DetailHeader() {
    const selectedRequest = useSelectedRequest();

    if (!selectedRequest) return null;

    const { request, response, name, path, type, batch, duration } = selectedRequest;
    const statusCode = response?.statusCode;
    const isError =
        statusCode &&
        ((typeof statusCode === 'number' && statusCode >= 400) ||
            (typeof statusCode === 'string' && Number.parseInt(statusCode, 10) >= 400));

    // Get method badge variant
    const getMethodVariant = (method: string) => {
        switch (method.toUpperCase()) {
            case 'GET': return 'get';
            case 'POST': return 'post';
            case 'PUT': return 'put';
            case 'PATCH': case 'MERGE': return 'patch';
            case 'DELETE': return 'delete';
            default: return 'default';
        }
    };

    return (
        <div className="px-4 py-3 border-b border-theme header-bg">
            <div className="flex items-center gap-2 mb-2">
                <Badge variant={getMethodVariant(request.method) as 'get' | 'post' | 'put' | 'patch' | 'delete' | 'default'}>
                    {request.method}
                </Badge>
                {batch && (
                    <Badge variant="outline" className="text-xs">
                        <Layers className="h-3 w-3 mr-1" />
                        Batch {batch.index}/{batch.total}
                    </Badge>
                )}
                {type && type !== 'unknown' && (
                    <Badge variant="secondary" className="text-xs capitalize">
                        {type}
                    </Badge>
                )}
                {statusCode && (
                    <Badge variant={isError ? 'destructive' : 'success'} className="text-xs font-mono">
                        {statusCode}
                    </Badge>
                )}
                {duration !== null && duration !== undefined && (
                    <span className="text-xs text-accent ml-auto font-mono">{duration}ms</span>
                )}
            </div>
            <h2 className="text-sm font-semibold text-primary mb-1">{name || 'Request'}</h2>
            <p className="text-xs text-muted font-mono truncate">{path}</p>
        </div>
    );
}

/**
 * Request tab content showing URL, filters, params, headers, body
 */
function RequestTabContent({ request }: { request: ODataRequest }) {
    const { request: req } = request;

    return (
        <div className="p-4 space-y-4 overflow-y-auto h-full panel-bg">
            {/* URL */}
            <div>
                <h3 className="text-xs font-medium text-secondary mb-2 flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-accent" />
                    Request URL
                </h3>
                <code className="text-xs text-primary code-block p-3 rounded-lg block overflow-x-auto break-all">
                    {req.url}
                </code>
            </div>

            {/* Filters */}
            <FiltersCard filters={req.filters} />

            {/* Query Parameters */}
            <ParamsCard queryParams={req.queryParams} />

            {/* Request Headers */}
            <HeadersTable headers={req.headers} title="Request Headers" icon={<Send className="h-3.5 w-3.5" />} />

            {/* Request Body */}
            {req.body !== null && req.body !== undefined && (
                <div>
                    <h3 className="text-xs font-medium text-secondary mb-2 flex items-center gap-2">
                        <FileJson className="h-3.5 w-3.5 text-accent" />
                        Request Body
                    </h3>
                    <div className="card-bg rounded-lg border border-theme overflow-hidden">
                        <JsonTreeView data={req.body} />
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Check if data is XML string
 */
function isXmlString(data: unknown): data is string {
    if (typeof data !== 'string') return false;
    const trimmed = data.trim();
    return trimmed.startsWith('<?xml') || trimmed.startsWith('<');
}

/**
 * Find XML content in data object
 */
function findXmlInData(data: unknown): string | null {
    if (data === null || data === undefined) return null;

    // Direct string check
    if (typeof data === 'string' && isXmlString(data)) {
        return data;
    }

    // Check object properties
    if (typeof data === 'object' && !Array.isArray(data)) {
        for (const value of Object.values(data as Record<string, unknown>)) {
            if (typeof value === 'string' && isXmlString(value)) {
                return value;
            }
        }
    }

    return null;
}

/**
 * Response tab content with JSON/XML viewer and search
 */
function ResponseTabContent({ request }: { request: ODataRequest }) {
    const { response } = request;
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatch, setCurrentMatch] = useState(1);
    const [matchCount, setMatchCount] = useState(0);

    const jsonViewerRef = useRef<JsonTreeViewHandle>(null);
    const xmlViewerRef = useRef<XmlViewerHandle>(null);

    // Determine if response is XML
    const xmlContent = useMemo(() => {
        return findXmlInData(response.data);
    }, [response.data]);

    const isXml = xmlContent !== null;

    // Handle search
    const handleSearch = useCallback(
        (query: string) => {
            setSearchQuery(query);
            setCurrentMatch(1);

            if (!query.trim()) {
                setMatchCount(0);
                return;
            }

            // Use a timeout to allow the viewer to render with the new search query
            setTimeout(() => {
                if (isXml && xmlViewerRef.current) {
                    const count = xmlViewerRef.current.getMatchCount();
                    setMatchCount(count);
                } else if (!isXml && jsonViewerRef.current) {
                    const count = jsonViewerRef.current.getMatchCount();
                    setMatchCount(count);
                }
            }, 50);
        },
        [isXml]
    );

    const handleNextMatch = useCallback(() => {
        if (matchCount === 0) return;
        const nextIndex = currentMatch >= matchCount ? 1 : currentMatch + 1;
        setCurrentMatch(nextIndex);

        if (isXml && xmlViewerRef.current) {
            xmlViewerRef.current.scrollToMatch(nextIndex - 1);
        } else if (!isXml && jsonViewerRef.current) {
            jsonViewerRef.current.scrollToMatch(nextIndex - 1);
        }
    }, [matchCount, currentMatch, isXml]);

    const handlePrevMatch = useCallback(() => {
        if (matchCount === 0) return;
        const prevIndex = currentMatch <= 1 ? matchCount : currentMatch - 1;
        setCurrentMatch(prevIndex);

        if (isXml && xmlViewerRef.current) {
            xmlViewerRef.current.scrollToMatch(prevIndex - 1);
        } else if (!isXml && jsonViewerRef.current) {
            jsonViewerRef.current.scrollToMatch(prevIndex - 1);
        }
    }, [matchCount, currentMatch, isXml]);

    return (
        <div className="flex flex-col h-full panel-bg">
            {/* Status bar */}
            <div className="px-4 py-3 border-b border-theme header-bg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Badge variant={Number(response.statusCode) >= 400 ? 'destructive' : 'success'}>
                        {String(response.statusCode)} {response.statusText}
                    </Badge>
                    {response.size && (
                        <span className="text-xs text-muted">{formatFileSize(response.size)}</span>
                    )}
                    {response.mimeType && (
                        <span className="text-xs text-accent font-mono">{response.mimeType}</span>
                    )}
                </div>

                {/* Search */}
                {response.data !== null && response.data !== undefined && (
                    <ResponseSearch
                        onSearch={handleSearch}
                        matchCount={matchCount}
                        currentMatch={currentMatch}
                        onPrevMatch={handlePrevMatch}
                        onNextMatch={handleNextMatch}
                    />
                )}
            </div>

            {/* Response content */}
            <div className="flex-1 overflow-hidden">
                {/* Response Headers */}
                <div className="p-4 border-b border-theme">
                    <HeadersTable
                        headers={response.headers}
                        title="Response Headers"
                        icon={<ArrowDownToLine className="h-3.5 w-3.5 text-accent" />}
                        defaultCollapsed
                    />
                </div>

                {/* Response Body */}
                <div className="h-full overflow-auto panel-bg">
                    {response.data ? (
                        isXml ? (
                            <XmlViewer ref={xmlViewerRef} xml={xmlContent} searchTerm={searchQuery} />
                        ) : (
                            <JsonTreeView ref={jsonViewerRef} data={response.data} searchQuery={searchQuery} />
                        )
                    ) : (
                        <div className="p-4 text-xs text-muted italic">No response body</div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Initiator tab content with call stack
 */
function InitiatorTabContent({ request }: { request: ODataRequest }) {
    return (
        <div className="p-4 overflow-y-auto h-full panel-bg">
            <CallStackViewer initiator={request.initiator} />
        </div>
    );
}

export function DetailPanel() {
    const selectedRequest = useSelectedRequest();
    const { activeTab, setActiveTab } = useRequestStore();

    if (!selectedRequest) {
        return <EmptyState />;
    }

    return (
        <div className="flex flex-col h-full panel-bg">
            <DetailHeader />

            <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as DetailTab)}
                className="flex-1 flex flex-col overflow-hidden"
            >
                <div className="px-4 py-2 border-b border-theme header-bg">
                    <TabsList className="justify-start shrink-0">
                        <TabsTrigger value="request">Request</TabsTrigger>
                        <TabsTrigger value="response">Response</TabsTrigger>
                        <TabsTrigger value="initiator">Initiator</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                    <TabsContent value="request" className="m-0 h-full">
                        <RequestTabContent request={selectedRequest} />
                    </TabsContent>
                    <TabsContent value="response" className="m-0 h-full">
                        <ResponseTabContent request={selectedRequest} />
                    </TabsContent>
                    <TabsContent value="initiator" className="m-0 h-full">
                        <InitiatorTabContent request={selectedRequest} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

export default DetailPanel;
