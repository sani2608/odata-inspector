/**
 * HeadersTable Component
 *
 * Displays HTTP headers in a collapsible table format.
 *
 * ★ Insight ─────────────────────────────────────
 * - Used for both request and response headers
 * - Key headers like Content-Type are highlighted
 * - Values are truncated with full tooltip on hover
 * - Supports collapsed state via defaultCollapsed prop
 * ─────────────────────────────────────────────────
 */

import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';
import type { HttpHeaders } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface HeadersTableProps {
    headers: HttpHeaders;
    title?: string;
    icon?: React.ReactNode;
    /** Whether the headers table should be collapsed by default */
    defaultCollapsed?: boolean;
}

/**
 * Headers that are commonly important to highlight
 */
const IMPORTANT_HEADERS = [
    'content-type',
    'authorization',
    'x-csrf-token',
    'sap-client',
    'accept',
    'odata-version',
    'dataserviceversion'
];

/**
 * Check if a header is important
 */
function isImportantHeader(key: string): boolean {
    return IMPORTANT_HEADERS.includes(key.toLowerCase());
}

export function HeadersTable({ headers, title = 'Headers', icon, defaultCollapsed = false }: HeadersTableProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const entries = Object.entries(headers);

    if (entries.length === 0) {
        return (
            <Card>
                <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-medium text-foreground-secondary flex items-center gap-2">
                        {icon || <FileText className="h-3.5 w-3.5" />}
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                    <p className="text-xs text-foreground-muted italic">No headers</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader
                className="py-2 px-3 cursor-pointer select-none hover:bg-background-hover transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <CardTitle className="text-xs font-medium text-foreground-secondary flex items-center gap-2">
                    {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-foreground-muted" />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" />
                    )}
                    {icon || <FileText className="h-3.5 w-3.5" />}
                    {title}
                    <span className="text-foreground-muted">({entries.length})</span>
                </CardTitle>
            </CardHeader>
            {!isCollapsed && (
                <CardContent className="px-3 pb-3 pt-0">
                    <div className="rounded border border-border-subtle overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-background-tertiary border-b border-border-subtle">
                                    <th className="text-left px-2 py-1.5 font-medium text-foreground-secondary w-1/3">
                                        Name
                                    </th>
                                    <th className="text-left px-2 py-1.5 font-medium text-foreground-secondary">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(([key, value]) => (
                                    <tr
                                        key={key}
                                        className="border-b border-border-subtle last:border-0 hover:bg-background-hover"
                                    >
                                        <td
                                            className={`px-2 py-1.5 font-mono ${
                                                isImportantHeader(key)
                                                    ? 'text-accent-blue font-medium'
                                                    : 'text-foreground-secondary'
                                            }`}
                                        >
                                            {key}
                                        </td>
                                        <td
                                            className="px-2 py-1.5 font-mono text-foreground-primary break-all"
                                            title={value}
                                        >
                                            {value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export default HeadersTable;
