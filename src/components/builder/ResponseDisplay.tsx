/**
 * ResponseDisplay Component
 *
 * Displays the response from an executed request.
 * This is a display-only component - execution is handled by parent.
 */

import { AlertCircle, Copy, Loader2, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ExecuteResponse } from '../../services/odata/requestExecutor';
import { JsonTreeView } from '../detail/JsonTreeView';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ResponseDisplayProps {
    loading: boolean;
    response: ExecuteResponse | null;
    error: string | null;
}

export function ResponseDisplay({ loading, response, error }: ResponseDisplayProps) {
    const getStatusColor = (status: number): string => {
        if (status >= 200 && status < 300) return 'bg-accent-green/20 text-accent-green';
        if (status >= 400 && status < 500) return 'bg-accent-orange/20 text-accent-orange';
        if (status >= 500) return 'bg-accent-red/20 text-accent-red';
        return 'bg-foreground-muted/20 text-foreground-secondary';
    };

    const handleCopy = () => {
        if (response?.data) {
            navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response</span>
                <div className="flex items-center gap-3">
                    {response && (
                        <>
                            <Badge className={cn('text-sm px-2.5 py-0.5', getStatusColor(response.status))}>
                                {response.status} {response.statusText}
                            </Badge>
                            <span className="text-sm text-slate-500">{response.duration}ms</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                className="h-7 px-2.5 text-sm text-slate-400 hover:text-slate-200"
                            >
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                Copy
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Response Body - Takes remaining space */}
            <div
                className={cn(
                    'flex-1 border border-slate-700/50 rounded-lg bg-slate-900/50',
                    'overflow-auto'
                )}
            >
                {loading && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-500">
                        <Loader2 className="h-10 w-10 animate-spin mb-3 opacity-50" />
                        <span className="text-sm">Executing request...</span>
                    </div>
                )}

                {!loading && !response && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-500">
                        <Play className="h-14 w-14 mb-4 opacity-20" />
                        <span className="text-base">Click Execute to send the request</span>
                    </div>
                )}

                {!loading && response && !response.ok && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-red-400">
                        <AlertCircle className="h-10 w-10 mb-3 opacity-70" />
                        <span className="text-sm font-medium">{error || 'Request failed'}</span>
                        {response.data !== null && response.data !== undefined && typeof response.data === 'object' && (
                            <pre className="mt-4 text-xs text-slate-400 max-w-full overflow-auto p-4 bg-slate-900 rounded">
                                {JSON.stringify(response.data, null, 2)}
                            </pre>
                        )}
                    </div>
                )}

                {!loading && response?.ok && (
                    <div className="p-4">
                        <JsonTreeView data={response.displayData} className="text-sm" />
                    </div>
                )}
            </div>
        </div>
    );
}

export default ResponseDisplay;
