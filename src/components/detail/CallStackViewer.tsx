/**
 * CallStackViewer Component
 *
 * Displays the call stack for a request initiator.
 *
 * ★ Insight ─────────────────────────────────────
 * - Shows function name, file, line, and column
 * - Clickable frames open source in DevTools (when available)
 * - Anonymous functions shown as "(anonymous)"
 * - Line numbers are 1-based for display
 * ─────────────────────────────────────────────────
 */

import { Code2, ExternalLink } from 'lucide-react';
import { useCallback } from 'react';
import type { CallStackFrame, RequestInitiator } from '../../types';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface CallStackViewerProps {
    initiator: RequestInitiator | undefined;
}

/**
 * Extract filename from URL
 */
function getFileName(url: string | undefined): string {
    if (!url) return 'unknown';
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const parts = pathname.split('/');
        const filename = parts[parts.length - 1] || 'unknown';
        // Remove query params from filename
        return filename.split('?')[0] || 'unknown';
    } catch {
        // If URL parsing fails, try simple split
        const parts = url.split('/');
        return parts[parts.length - 1]?.split('?')[0] || 'unknown';
    }
}

/**
 * Single call stack frame row
 */
function StackFrame({ frame, index }: { frame: CallStackFrame; index: number }) {
    const functionName = frame.functionName || '(anonymous)';
    const fileName = getFileName(frame.url);
    // Convert to 1-based line numbers for display
    const lineNumber = frame.lineNumber !== undefined ? frame.lineNumber + 1 : '?';
    const columnNumber = frame.columnNumber !== undefined ? frame.columnNumber + 1 : '?';

    const handleClick = useCallback(() => {
        // Try to open in DevTools Sources panel
        if (frame.url && typeof chrome !== 'undefined' && chrome.devtools?.panels) {
            try {
                chrome.devtools.panels.openResource(frame.url, frame.lineNumber || 0, () => {
                    // Callback after opening
                });
            } catch {
                // Silently fail if not in DevTools context
            }
        }
    }, [frame.url, frame.lineNumber]);

    const isClickable = Boolean(frame.url);

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: Element is conditionally interactive with proper role and keyboard handlers
        <div
            className={`flex items-start gap-2 px-3 py-2 rounded ${
                isClickable ? 'hover:bg-background-hover cursor-pointer' : ''
            } ${index % 2 === 0 ? 'bg-background-tertiary/50' : ''}`}
            onClick={isClickable ? handleClick : undefined}
            title={isClickable ? `Click to open ${frame.url || fileName}` : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={
                isClickable
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleClick();
                          }
                      }
                    : undefined
            }
        >
            {/* Frame number */}
            <span className="text-[10px] text-foreground-muted w-4 shrink-0 text-right">{index}</span>

            {/* Function name */}
            <span className="font-mono text-xs text-accent-blue flex-1 truncate">{functionName}</span>

            {/* File and location */}
            <div className="flex items-center gap-1 text-xs text-foreground-secondary shrink-0">
                <span className="font-mono truncate max-w-[150px]" title={frame.url}>
                    {fileName}
                </span>
                <span className="text-foreground-muted">:</span>
                <span className="font-mono text-foreground-muted">
                    {lineNumber}:{columnNumber}
                </span>
                {isClickable && <ExternalLink className="h-3 w-3 text-foreground-muted ml-1" />}
            </div>
        </div>
    );
}

export function CallStackViewer({ initiator }: CallStackViewerProps) {
    if (!initiator) {
        return (
            <Card>
                <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-medium text-foreground-secondary flex items-center gap-2">
                        <Code2 className="h-3.5 w-3.5" />
                        Initiator
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                    <p className="text-xs text-foreground-muted italic">No initiator information available</p>
                </CardContent>
            </Card>
        );
    }

    const hasStack = initiator.stack?.callFrames && initiator.stack.callFrames.length > 0;

    return (
        <div className="space-y-4">
            {/* Initiator type */}
            <Card>
                <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-medium text-foreground-secondary flex items-center gap-2">
                        <Code2 className="h-3.5 w-3.5" />
                        Initiator Type
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                            {initiator.type}
                        </Badge>
                        {initiator.url && (
                            <span className="text-xs text-foreground-muted font-mono truncate">
                                {getFileName(initiator.url)}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Call stack */}
            {hasStack && (
                <Card>
                    <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs font-medium text-foreground-secondary flex items-center gap-2">
                            <Code2 className="h-3.5 w-3.5" />
                            Call Stack
                            <span className="text-foreground-muted">({initiator.stack!.callFrames.length} frames)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                        <div className="rounded border border-border-subtle overflow-hidden">
                            {initiator.stack!.callFrames.map((frame, index) => (
                                <StackFrame
                                    key={`${frame.url}-${frame.lineNumber}-${index}`}
                                    frame={frame}
                                    index={index}
                                />
                            ))}
                        </div>
                        <p className="text-[10px] text-foreground-muted mt-2">Click a frame to open in Sources panel</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default CallStackViewer;
