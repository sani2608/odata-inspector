/**
 * JsonTreeView Component
 *
 * Displays JSON data with syntax highlighting and search functionality.
 *
 * ★ Insight ─────────────────────────────────────
 * - Uses custom HTML generation for syntax highlighting (similar to XmlViewer)
 * - Supports search highlighting with navigation
 * - Adds human-readable transformations for OData date/datetime fields
 * - Adds human-readable transformations for ISO 8601 durations (Edm.Time)
 * - Collapsible nodes for better navigation of large JSON
 * ─────────────────────────────────────────────────
 */

import { Check, Copy } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import { escapeHtml, escapeRegex } from '../../utils/escape';

interface JsonTreeViewProps {
    data: unknown;
    className?: string;
    searchQuery?: string;
}

export interface JsonTreeViewHandle {
    expandAll: () => void;
    collapseAll: () => void;
    getMatchCount: () => number;
    scrollToMatch: (index: number) => void;
}

/**
 * Check if a string is an OData datetime value
 */
function isODataDateTime(value: string): boolean {
    return (
        /^\/Date\(\d+\)\/$/.test(value) ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) ||
        /^datetime'.+'$/.test(value)
    );
}

/**
 * Check if a string is an ISO 8601 duration (OData Edm.Time/Edm.Duration)
 * Examples: PT12H00M00S, P00DT12H00M00S, PT1H30M, P1D
 */
function isODataDuration(value: string): boolean {
    return /^P(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(value);
}

/**
 * Parse ISO 8601 duration to human-readable format
 */
function parseODataDuration(value: string): string | null {
    const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
    if (!match) return null;

    const days = match[1] ? Number.parseInt(match[1], 10) : 0;
    const hours = match[2] ? Number.parseInt(match[2], 10) : 0;
    const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
    const seconds = match[4] ? Number.parseFloat(match[4]) : 0;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Parse OData datetime to JS Date
 */
function parseODataDateTime(value: string): Date | null {
    try {
        const v2Match = value.match(/^\/Date\((\d+)\)\/$/);
        if (v2Match) {
            return new Date(Number.parseInt(v2Match[1], 10));
        }

        const v4Match = value.match(/^datetime'(.+)'$/);
        if (v4Match) {
            return new Date(v4Match[1]);
        }

        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
            return new Date(value);
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Add human-readable datetime and duration values to JSON data
 */
function addReadableDateTimes(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
        if (isODataDateTime(data)) {
            const date = parseODataDateTime(data);
            if (date && !Number.isNaN(date.getTime())) {
                return {
                    _original: data,
                    _readable: date.toLocaleString()
                };
            }
        } else if (isODataDuration(data)) {
            const readable = parseODataDuration(data);
            if (readable) {
                return {
                    _original: data,
                    _readable: readable
                };
            }
        }
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => addReadableDateTimes(item));
    }

    if (typeof data === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            if (typeof value === 'string') {
                if (isODataDateTime(value)) {
                    const date = parseODataDateTime(value);
                    if (date && !Number.isNaN(date.getTime())) {
                        result[key] = value;
                        result[`${key}_readable`] = date.toLocaleString();
                    } else {
                        result[key] = value;
                    }
                } else if (isODataDuration(value)) {
                    const readable = parseODataDuration(value);
                    if (readable) {
                        result[key] = value;
                        result[`${key}_readable`] = readable;
                    } else {
                        result[key] = value;
                    }
                } else {
                    result[key] = addReadableDateTimes(value);
                }
            } else {
                result[key] = addReadableDateTimes(value);
            }
        }
        return result;
    }

    return data;
}

/**
 * Apply search highlighting to text content
 */
function applySearchHighlight(text: string, searchTerm: string): string {
    if (!searchTerm?.trim()) return escapeHtml(text);

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    const escaped = escapeHtml(text);
    return escaped.replace(regex, '<mark class="json-search-highlight">$1</mark>');
}

/**
 * Generate HTML for a JSON value with syntax highlighting
 */
function jsonValueToHtml(value: unknown, searchTerm: string, indent: number, collapsedPaths: Set<string>, path: string): string {
    const indentStr = '  '.repeat(indent);
    const nextIndentStr = '  '.repeat(indent + 1);

    if (value === null) {
        return `<span class="json-null">null</span>`;
    }

    if (value === undefined) {
        return `<span class="json-undefined">undefined</span>`;
    }

    if (typeof value === 'boolean') {
        return `<span class="json-boolean">${value}</span>`;
    }

    if (typeof value === 'number') {
        return `<span class="json-number">${value}</span>`;
    }

    if (typeof value === 'string') {
        const highlighted = applySearchHighlight(value, searchTerm);
        return `<span class="json-string">"${highlighted}"</span>`;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return '<span class="json-bracket">[]</span>';
        }

        const isCollapsed = collapsedPaths.has(path);
        const toggleId = `json-toggle-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;

        if (isCollapsed) {
            return `<span class="json-toggle" data-path="${escapeHtml(path)}" id="${toggleId}"><span class="json-toggle-icon">▶</span></span><span class="json-bracket">[</span><span class="json-collapsed" data-path="${escapeHtml(path)}">...</span><span class="json-bracket">]</span> <span class="json-info">${value.length} items</span>`;
        }

        const items = value.map((item, i) => {
            const itemPath = `${path}[${i}]`;
            const itemHtml = jsonValueToHtml(item, searchTerm, indent + 1, collapsedPaths, itemPath);
            const comma = i < value.length - 1 ? ',' : '';
            return `${nextIndentStr}${itemHtml}${comma}`;
        });

        return `<span class="json-toggle" data-path="${escapeHtml(path)}" id="${toggleId}"><span class="json-toggle-icon">▼</span></span><span class="json-bracket">[</span> <span class="json-info">${value.length} items</span>\n${items.join('\n')}\n${indentStr}<span class="json-bracket">]</span>`;
    }

    if (typeof value === 'object') {
        const keys = Object.keys(value as object);
        if (keys.length === 0) {
            return '<span class="json-bracket">{}</span>';
        }

        const isCollapsed = collapsedPaths.has(path);
        const toggleId = `json-toggle-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;

        if (isCollapsed) {
            return `<span class="json-toggle" data-path="${escapeHtml(path)}" id="${toggleId}"><span class="json-toggle-icon">▶</span></span><span class="json-bracket">{</span><span class="json-collapsed" data-path="${escapeHtml(path)}">...</span><span class="json-bracket">}</span> <span class="json-info">${keys.length} keys</span>`;
        }

        const entries = keys.map((key, i) => {
            const keyPath = `${path}.${key}`;
            const keyHtml = applySearchHighlight(key, searchTerm);
            const valHtml = jsonValueToHtml((value as Record<string, unknown>)[key], searchTerm, indent + 1, collapsedPaths, keyPath);
            const comma = i < keys.length - 1 ? ',' : '';
            return `${nextIndentStr}<span class="json-key">"${keyHtml}"</span><span class="json-colon">:</span> ${valHtml}${comma}`;
        });

        return `<span class="json-toggle" data-path="${escapeHtml(path)}" id="${toggleId}"><span class="json-toggle-icon">▼</span></span><span class="json-bracket">{</span> <span class="json-info">${keys.length} keys</span>\n${entries.join('\n')}\n${indentStr}<span class="json-bracket">}</span>`;
    }

    return escapeHtml(String(value));
}

/**
 * Count search matches in JSON data
 */
function countMatches(data: unknown, searchTerm: string): number {
    if (!searchTerm?.trim()) return 0;

    const jsonString = JSON.stringify(data);
    const regex = new RegExp(escapeRegex(searchTerm), 'gi');
    const matches = jsonString.match(regex);
    return matches ? matches.length : 0;
}

export const JsonTreeView = forwardRef<JsonTreeViewHandle, JsonTreeViewProps>(
    ({ data, className = '', searchQuery }, ref) => {
        const [copied, setCopied] = useState(false);
        const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
        const containerRef = useRef<HTMLPreElement>(null);

        // Transform data with readable datetimes
        const displayData = useMemo(() => addReadableDateTimes(data), [data]);

        // Generate highlighted HTML
        const { highlightedHtml, matchCount } = useMemo(() => {
            if (data === null || data === undefined) {
                return { highlightedHtml: '', matchCount: 0 };
            }

            const html = jsonValueToHtml(displayData, searchQuery || '', 0, collapsedPaths, 'root');
            const count = countMatches(displayData, searchQuery || '');

            return { highlightedHtml: html, matchCount: count };
        }, [displayData, searchQuery, collapsedPaths, data]);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            expandAll: () => {
                setCollapsedPaths(new Set());
            },
            collapseAll: () => {
                // Collect all paths that can be collapsed
                const paths = new Set<string>();
                const collectPaths = (val: unknown, path: string) => {
                    if (Array.isArray(val) && val.length > 0) {
                        paths.add(path);
                        val.forEach((item, i) => collectPaths(item, `${path}[${i}]`));
                    } else if (val && typeof val === 'object' && Object.keys(val).length > 0) {
                        paths.add(path);
                        for (const key of Object.keys(val)) {
                            collectPaths((val as Record<string, unknown>)[key], `${path}.${key}`);
                        }
                    }
                };
                collectPaths(displayData, 'root');
                setCollapsedPaths(paths);
            },
            getMatchCount: () => matchCount,
            scrollToMatch: (index: number) => {
                if (!containerRef.current) return;
                const highlights = containerRef.current.querySelectorAll('.json-search-highlight');
                if (highlights[index]) {
                    highlights.forEach((el) => el.classList.remove('json-search-current'));
                    highlights[index].classList.add('json-search-current');
                    highlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }));

        // Handle toggle clicks
        useEffect(() => {
            const container = containerRef.current;
            if (!container) return;

            const handleClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                const toggle = target.closest('.json-toggle');
                if (toggle) {
                    const path = toggle.getAttribute('data-path');
                    if (path) {
                        setCollapsedPaths((prev) => {
                            const next = new Set(prev);
                            if (next.has(path)) {
                                next.delete(path);
                            } else {
                                next.add(path);
                            }
                            return next;
                        });
                    }
                }
            };

            container.addEventListener('click', handleClick);
            return () => container.removeEventListener('click', handleClick);
        }, []);

        // Scroll to first match when search changes
        useEffect(() => {
            if (matchCount > 0 && containerRef.current) {
                const firstMatch = containerRef.current.querySelector('.json-search-highlight');
                if (firstMatch) {
                    firstMatch.classList.add('json-search-current');
                    firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, [matchCount, searchQuery]);

        const handleCopy = useCallback(async () => {
            try {
                await copyToClipboard(JSON.stringify(data, null, 2));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // Copy failed silently
            }
        }, [data]);

        if (data === null || data === undefined) {
            return <div className="p-4 text-xs text-foreground-muted italic">No data</div>;
        }

        if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
            return <div className="p-4 text-xs text-foreground-muted italic">Empty object</div>;
        }

        // If it's a plain string, show it as preformatted text
        if (typeof data === 'string') {
            return (
                <div className={`relative ${className}`}>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1.5 bg-background-tertiary hover:bg-background-hover border border-border rounded text-foreground-secondary hover:text-foreground-primary transition-colors"
                        title="Copy"
                    >
                        {copied ? (
                            <Check className="h-3.5 w-3.5 text-accent-green" />
                        ) : (
                            <Copy className="h-3.5 w-3.5" />
                        )}
                    </button>
                    <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all text-foreground-primary">
                        {data}
                    </pre>
                </div>
            );
        }

        return (
            <div className={`relative ${className}`}>
                {/* Copy button */}
                <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-background-tertiary hover:bg-background-hover border border-border rounded text-foreground-secondary hover:text-foreground-primary transition-colors"
                    title="Copy JSON"
                >
                    {copied ? (
                        <Check className="h-3.5 w-3.5 text-accent-green" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                </button>

                {/* JSON Content */}
                <pre
                    ref={containerRef}
                    className="p-4 text-xs font-mono overflow-auto json-content json-highlighted"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON is escaped before insertion
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
            </div>
        );
    }
);

JsonTreeView.displayName = 'JsonTreeView';

export default JsonTreeView;
