/**
 * ResponsePreview Component
 *
 * Displays the response from an executed request.
 */

import { AlertCircle, Loader2, Play } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { ExecuteResponse } from '../../services/odata/requestExecutor';
import { executeMockRequest, executeRequest } from '../../services/odata/requestExecutor';
import { generateODataUrl } from '../../services/odata/urlGenerator';
import { useBuilderStore } from '../../stores/builderStore';
import { useMetadataStore } from '../../stores/metadataStore';
import { JsonTreeView } from '../detail/JsonTreeView';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ResponseState {
    loading: boolean;
    response: ExecuteResponse | null;
    error: string | null;
}

export function ResponsePreview() {
    const [state, setState] = useState<ResponseState>({
        loading: false,
        response: null,
        error: null
    });

    const { metadata } = useMetadataStore();
    const builderState = useBuilderStore();

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

        setState({ loading: true, response: null, error: null });

        try {
            // Try real execution first, fall back to mock if DevTools API unavailable
            let response: ExecuteResponse;
            try {
                response = await executeRequest(url, builderState.method);
            } catch (execError) {
                const err = execError as ExecuteResponse;
                if (err.statusText === 'DevTools API not available') {
                    // Use mock for development
                    response = await executeMockRequest(url, builderState.method);
                } else {
                    throw execError;
                }
            }

            setState({ loading: false, response, error: null });
        } catch (err) {
            const execErr = err as ExecuteResponse;
            setState({
                loading: false,
                response: execErr,
                error: execErr.statusText || 'Request failed'
            });
        }
    };

    const getStatusColor = (status: number): string => {
        if (status >= 200 && status < 300) return 'bg-accent-green/20 text-accent-green';
        if (status >= 400 && status < 500) return 'bg-accent-orange/20 text-accent-orange';
        if (status >= 500) return 'bg-accent-red/20 text-accent-red';
        return 'bg-foreground-muted/20 text-foreground-secondary';
    };

    return (
        <div className="space-y-3">
            {/* Header with Execute button */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                    Response
                </span>
                <div className="flex items-center gap-2">
                    {state.response && (
                        <>
                            <Badge className={cn('text-xs', getStatusColor(state.response.status))}>
                                {state.response.status} {state.response.statusText}
                            </Badge>
                            <span className="text-xs text-foreground-muted">{state.response.duration}ms</span>
                        </>
                    )}
                    <Button
                        type="button"
                        onClick={handleExecute}
                        disabled={!canExecute || state.loading}
                        size="sm"
                        className="bg-accent-blue hover:bg-accent-blue/90 text-white"
                    >
                        {state.loading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                <Play className="h-3.5 w-3.5 mr-1" />
                                Execute
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Response Body */}
            <div
                className={cn(
                    'border border-border rounded bg-background-primary',
                    'min-h-[150px] max-h-[400px] overflow-auto'
                )}
            >
                {state.loading && (
                    <div className="flex flex-col items-center justify-center h-[150px] text-foreground-muted">
                        <Loader2 className="h-8 w-8 animate-spin mb-2 opacity-50" />
                        <span className="text-xs">Executing request...</span>
                    </div>
                )}

                {!state.loading && !state.response && (
                    <div className="flex flex-col items-center justify-center h-[150px] text-foreground-muted">
                        <Play className="h-10 w-10 mb-2 opacity-30" />
                        <span className="text-xs">Click Execute to send the request</span>
                    </div>
                )}

                {!state.loading && state.response && !state.response.ok && (
                    <div className="flex flex-col items-center justify-center h-[150px] text-accent-red">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-70" />
                        <span className="text-xs font-medium">{state.error || 'Request failed'}</span>
                        {state.response.data !== null &&
                            state.response.data !== undefined &&
                            typeof state.response.data === 'object' && (
                                <pre className="mt-2 text-[10px] text-foreground-muted max-w-full overflow-auto">
                                    {JSON.stringify(state.response.data, null, 2)}
                                </pre>
                            )}
                    </div>
                )}

                {!state.loading && state.response?.ok && (
                    <JsonTreeView data={state.response.displayData} className="text-xs" />
                )}
            </div>
        </div>
    );
}

export default ResponsePreview;
