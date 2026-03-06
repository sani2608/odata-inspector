/**
 * FiltersCard Component
 *
 * Displays parsed OData filters in a readable format.
 *
 * ★ Insight ─────────────────────────────────────
 * - Displays both parsed filters (field/operator/value) and raw filter string
 * - Date values show both formatted and raw versions
 * - Raw filters (unparsed expressions) shown as code blocks
 * ─────────────────────────────────────────────────
 */

import { Filter } from 'lucide-react';
import type { ParsedFilter, ParsedFilterCondition, RawFilter } from '../../types';
import { formatOperator } from '../../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface FiltersCardProps {
    filters: {
        raw?: string;
        parsed?: ParsedFilter[];
    };
}

/**
 * Type guard for parsed filter condition
 */
function isParsedCondition(filter: ParsedFilter): filter is ParsedFilterCondition {
    return 'field' in filter && 'operator' in filter;
}

/**
 * Type guard for raw filter
 */
function isRawFilter(filter: ParsedFilter): filter is RawFilter {
    return 'raw' in filter && !('field' in filter);
}

/**
 * Single filter row displaying field, operator, and value
 */
function FilterRow({ filter }: { filter: ParsedFilter }) {
    if (isRawFilter(filter)) {
        return (
            <div className="py-1.5 px-2 bg-background-tertiary rounded font-mono text-xs">
                <code className="text-foreground-secondary">{filter.raw}</code>
            </div>
        );
    }

    if (isParsedCondition(filter)) {
        return (
            <div className="flex items-center gap-2 py-1.5 px-2 bg-background-tertiary rounded text-xs">
                <span className="font-medium text-accent-blue">{filter.field}</span>
                <span className="text-foreground-secondary font-mono">{formatOperator(filter.operator)}</span>
                {filter.formattedDate ? (
                    <span className="text-accent-green font-mono" title={filter.value}>
                        {filter.formattedDate}
                    </span>
                ) : (
                    <span className="text-foreground-primary font-mono">{filter.value}</span>
                )}
            </div>
        );
    }

    return null;
}

export function FiltersCard({ filters }: FiltersCardProps) {
    const hasFilters = (filters.parsed && filters.parsed.length > 0) || filters.raw;

    if (!hasFilters) return null;

    return (
        <Card>
            <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-medium text-foreground-secondary flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 space-y-2">
                {/* Parsed filters */}
                {filters.parsed && filters.parsed.length > 0 && (
                    <div className="space-y-1.5">
                        {filters.parsed.map((filter, index) => {
                            // Generate stable key from filter content
                            const key =
                                'field' in filter
                                    ? `${filter.field}-${filter.operator}-${filter.value}`
                                    : `raw-${index}`;
                            return <FilterRow key={key} filter={filter} />;
                        })}
                    </div>
                )}

                {/* Raw filter string */}
                {filters.raw && (
                    <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wide text-foreground-muted mb-1">
                            Raw $filter
                        </div>
                        <code className="block p-2 bg-background-tertiary rounded text-xs font-mono text-foreground-secondary break-all">
                            {filters.raw}
                        </code>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default FiltersCard;
