/**
 * FilterRow Component
 *
 * Individual filter row with field, operator, and value inputs.
 * Memoized to prevent unnecessary re-renders when sibling filters change.
 */

import { X } from 'lucide-react';
import { memo, useCallback } from 'react';
import type { FilterOperator, ODataFilter, ODataProperty } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

/**
 * Available filter operators
 */
const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
    { value: 'eq', label: 'equals' },
    { value: 'ne', label: 'not equals' },
    { value: 'gt', label: 'greater than' },
    { value: 'ge', label: 'greater or equal' },
    { value: 'lt', label: 'less than' },
    { value: 'le', label: 'less or equal' },
    { value: 'contains', label: 'contains' },
    { value: 'startswith', label: 'starts with' },
    { value: 'endswith', label: 'ends with' }
];

interface FilterRowProps {
    filter: ODataFilter;
    index: number;
    properties: ODataProperty[];
    onUpdate: (index: number, updates: Partial<ODataFilter>) => void;
    onRemove: (index: number) => void;
}

export const FilterRow = memo(function FilterRow({ filter, index, properties, onUpdate, onRemove }: FilterRowProps) {
    // Memoize handlers to prevent unnecessary re-renders
    const handleFieldChange = useCallback(
        (value: string) => {
            onUpdate(index, { field: value });
        },
        [index, onUpdate]
    );

    const handleOperatorChange = useCallback(
        (value: string) => {
            onUpdate(index, { operator: value as FilterOperator });
        },
        [index, onUpdate]
    );

    const handleValueChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onUpdate(index, { value: e.target.value });
        },
        [index, onUpdate]
    );

    const handleRemove = useCallback(() => {
        onRemove(index);
    }, [index, onRemove]);

    return (
        <div
            className="space-y-1.5"
            role="group"
            aria-label={`Filter ${index + 1}${filter.field ? `: ${filter.field} ${filter.operator} ${filter.value}` : ''}`}
        >
            {/* Row 1: Field and Operator selects */}
            <div className="flex items-center gap-2">
                <Select value={filter.field || ''} onValueChange={handleFieldChange}>
                    <SelectTrigger className="w-[120px] h-7 text-xs" aria-label="Filter field">
                        <SelectValue placeholder="Field..." />
                    </SelectTrigger>
                    <SelectContent>
                        {properties.map((prop) => (
                            <SelectItem key={prop.name} value={prop.name}>
                                {prop.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filter.operator} onValueChange={handleOperatorChange}>
                    <SelectTrigger className="w-[100px] h-7 text-xs" aria-label="Filter operator">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FILTER_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                                {op.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Row 2: Value input + Remove button */}
            <div className="flex items-center gap-2">
                <Input
                    type="text"
                    value={filter.value}
                    onChange={handleValueChange}
                    placeholder="Value..."
                    className="flex-1 h-7 text-xs"
                    aria-label="Filter value"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemove}
                    className="h-6 w-6 shrink-0 text-foreground-muted hover:text-accent-red"
                    aria-label={`Remove filter ${index + 1}`}
                >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
});

export default FilterRow;

// Re-export the operators for potential use elsewhere
export { FILTER_OPERATORS };
