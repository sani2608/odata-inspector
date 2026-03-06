/**
 * ParamsCard Component
 *
 * Displays OData query parameters as styled chips.
 *
 * ★ Insight ─────────────────────────────────────
 * - Shows key-value pairs for $select, $expand, $orderby, etc.
 * - Arrays are joined with commas for display
 * - Hover tooltip shows full value for long strings
 * ─────────────────────────────────────────────────
 */

import { Settings2 } from 'lucide-react';
import type { ODataQueryParams } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ParamsCardProps {
    queryParams: ODataQueryParams;
}

/**
 * Format parameter value for display
 */
function formatParamValue(value: string | string[] | number | undefined): string {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
}

/**
 * Get display style for known OData parameters
 */
function getParamStyle(key: string): string {
    const odataParams = [
        '$select',
        '$expand',
        '$filter',
        '$orderby',
        '$top',
        '$skip',
        '$count',
        '$inlinecount',
        '$format',
        '$search'
    ];
    if (odataParams.includes(key.toLowerCase()) || key.startsWith('$')) {
        return 'text-accent-blue';
    }
    return 'text-foreground-secondary';
}

type QueryParamValue = string | string[] | number | undefined;

export function ParamsCard({ queryParams }: ParamsCardProps) {
    const entries = Object.entries(queryParams).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
    ) as [string, QueryParamValue][];

    if (entries.length === 0) return null;

    return (
        <Card>
            <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-medium text-foreground-secondary flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    Query Parameters
                    <span className="text-foreground-muted">({entries.length})</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
                <div className="flex flex-col gap-1.5">
                    {entries.map(([key, value]) => {
                        const displayValue = formatParamValue(value);

                        return (
                            <div
                                key={key}
                                className="flex items-start gap-1.5 px-2 py-1 bg-background-tertiary rounded text-xs"
                            >
                                <span className={`font-medium shrink-0 ${getParamStyle(key)}`}>{key}</span>
                                <span className="text-foreground-muted shrink-0">=</span>
                                <span className="font-mono text-foreground-primary break-all">
                                    {displayValue}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

export default ParamsCard;
