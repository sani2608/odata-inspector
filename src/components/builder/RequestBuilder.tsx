/**
 * RequestBuilder Component
 *
 * Main overlay for the OData Request Builder.
 *
 * ★ Insight ─────────────────────────────────────
 * - Layout: narrow left sidebar (query options) + wide right area (response)
 * - Two modes: Entity (EntitySet queries) and Function (FunctionImports)
 * - Entity mode has $select, $expand, $filter, $orderby, $top, $skip
 * - Function mode has parameter inputs
 * - URL preview updates in real-time above the main content
 * - Execute button in header row for quick access
 * ─────────────────────────────────────────────────
 */

import { Loader2, Play, RotateCcw, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { csrfAwareExecute } from '../../services/odata/csrfTokenService';
import type { ExecuteResponse } from '../../services/odata/requestExecutor';
import { executeMockRequest } from '../../services/odata/requestExecutor';
import { generateODataUrl } from '../../services/odata/urlGenerator';
import { useBuilderStore } from '../../stores/builderStore';
import { useHasMetadata, useMetadataStore } from '../../stores/metadataStore';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CsrfTokenIndicator } from './CsrfTokenIndicator';
import { EntitySetSelector } from './EntitySetSelector';
import { ExpandSelector } from './ExpandSelector';
import { FieldSelector } from './FieldSelector';
import { FilterBuilder } from './FilterBuilder';
import { FunctionImportForm } from './FunctionImportForm';
import { FunctionImportSelector } from './FunctionImportSelector';
import { ModeToggle } from './ModeToggle';
import { OrderBySelector } from './OrderBySelector';
import { PaginationControls } from './PaginationControls';
import { ResponseDisplay } from './ResponseDisplay';
import { UrlPreview } from './UrlPreview';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface ResponseState {
    loading: boolean;
    response: ExecuteResponse | null;
    error: string | null;
}

export function RequestBuilder() {
    const { isOpen, close, mode, method, setMethod, reset } = useBuilderStore();
    const hasMetadata = useHasMetadata();
    const { metadata } = useMetadataStore();
    const builderState = useBuilderStore();

    // Response state lifted to parent for Execute button in header
    const [responseState, setResponseState] = useState<ResponseState>({
        loading: false,
        response: null,
        error: null
    });

    // Generate URL from current state
    const url = generateODataUrl(
        {
            mode: builderState.mode,
            entitySet: builderState.entitySet || null,
            entityType: builderState.entityType,
            select: builderState.select,
            expand: builderState.expand,
            filters: builderState.filters,
            orderby: builderState.orderby.field ? builderState.orderby : null,
            top: builderState.top,
            skip: builderState.skip,
            functionImport: builderState.functionImport,
            functionParams: builderState.functionParams
        },
        metadata
    );

    const canExecute = url && url !== '/';

    const handleExecute = async () => {
        if (!canExecute) return;

        setResponseState({ loading: true, response: null, error: null });

        try {
            let response: ExecuteResponse;
            try {
                // Use csrfAwareExecute for automatic CSRF token handling
                response = await csrfAwareExecute(url, builderState.method);
            } catch (execError) {
                const err = execError as ExecuteResponse;
                if (err.statusText === 'DevTools API not available') {
                    response = await executeMockRequest(url, builderState.method);
                } else {
                    throw execError;
                }
            }
            setResponseState({ loading: false, response, error: null });
        } catch (err) {
            const execErr = err as ExecuteResponse;
            setResponseState({
                loading: false,
                response: execErr,
                error: execErr.statusText || 'Request failed'
            });
        }
    };

    const handleReset = () => {
        reset();
        setResponseState({ loading: false, response: null, error: null });
    };

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, close]);

    if (!isOpen || !hasMetadata) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 animate-in fade-in duration-150"
            onKeyDown={(e) => e.key === 'Escape' && close()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-builder-title"
        >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Content container needs click stop propagation */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handled by parent dialog */}
            <div
                className={cn(
                    'w-full h-full',
                    'bg-slate-950',
                    'flex flex-col overflow-hidden',
                    'animate-in fade-in duration-150'
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center px-5 py-3 bg-gradient-to-r from-[#32373c] via-slate-900 to-slate-900 border-b border-slate-700/50 gap-4">
                    <div className="flex items-center gap-2.5">
                        <Wrench className="h-5 w-5 text-[#2ea3f2]" />
                        <h2
                            id="request-builder-title"
                            className="text-base font-semibold bg-gradient-to-r from-[#2ea3f2] to-[#82c0c7] bg-clip-text text-transparent"
                        >
                            Request Builder
                        </h2>
                    </div>

                    <div className="flex-1" />

                    <Button variant="ghost" size="icon" onClick={close} className="shrink-0">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Controls Row */}
                <div className="flex items-center px-5 py-3 border-b border-slate-700/30 gap-3 bg-slate-900/50">
                    <ModeToggle />

                    <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger className="w-[100px] h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {HTTP_METHODS.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex-1 max-w-[300px]">
                        {mode === 'entity' ? <EntitySetSelector /> : <FunctionImportSelector />}
                    </div>

                    <CsrfTokenIndicator url={url} method={method} />

                    <Button
                        type="button"
                        onClick={handleExecute}
                        disabled={!canExecute || responseState.loading}
                        size="sm"
                        className="bg-[#2ea3f2] hover:bg-[#2ea3f2]/90 text-white px-4"
                    >
                        {responseState.loading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                Execute
                            </>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-slate-400 hover:text-slate-200"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Clear
                    </Button>
                </div>

                {/* URL Preview - Full Width */}
                <div className="px-5 py-3 border-b border-slate-700/30 bg-slate-900/30">
                    <UrlPreview />
                </div>

                {/* Main Content: Sidebar + Response */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar - Query Options */}
                    <div className="w-[280px] shrink-0 border-r border-slate-700/30 overflow-y-auto p-4 space-y-4 bg-slate-900/20">
                        {mode === 'entity' ? (
                            <>
                                {/* $SELECT */}
                                <SidebarSection title="$SELECT">
                                    <FieldSelector />
                                </SidebarSection>

                                {/* $EXPAND */}
                                <SidebarSection title="$EXPAND">
                                    <ExpandSelector />
                                </SidebarSection>

                                {/* $FILTER */}
                                <SidebarSection title="$FILTER">
                                    <FilterBuilder />
                                </SidebarSection>

                                {/* $ORDERBY */}
                                <SidebarSection title="$ORDERBY">
                                    <OrderBySelector />
                                </SidebarSection>

                                {/* PAGINATION */}
                                <SidebarSection title="PAGINATION">
                                    <PaginationControls />
                                </SidebarSection>
                            </>
                        ) : (
                            <SidebarSection title="PARAMETERS">
                                <FunctionImportForm />
                            </SidebarSection>
                        )}
                    </div>

                    {/* Right Area - Response */}
                    <div className="flex-1 flex flex-col overflow-hidden p-4">
                        <ResponseDisplay
                            loading={responseState.loading}
                            response={responseState.response}
                            error={responseState.error}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Sidebar section wrapper component
 */
function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#82c0c7]">{title}</div>
            {children}
        </div>
    );
}

export default RequestBuilder;
