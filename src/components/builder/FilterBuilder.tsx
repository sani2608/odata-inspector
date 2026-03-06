/**
 * FilterBuilder Component
 *
 * Manages multiple filter rows for building $filter expressions.
 */

import { Plus } from 'lucide-react';
import { useBuilderStore } from '../../stores/builderStore';
import type { ODataFilter } from '../../types';
import { Button } from '../ui/button';
import { FilterRow } from './FilterRow';

export function FilterBuilder() {
    const { entityType, filters, addFilter, updateFilter, removeFilter } = useBuilderStore();

    const properties = entityType?.properties || [];

    const handleAddFilter = () => {
        const defaultField = properties[0]?.name || '';
        addFilter({
            field: defaultField,
            operator: 'eq',
            value: ''
        });
    };

    const handleUpdateFilter = (index: number, updates: Partial<ODataFilter>) => {
        updateFilter(index, updates);
    };

    if (!entityType) {
        return <div className="text-xs text-foreground-muted italic py-2">Select an EntitySet first</div>;
    }

    return (
        <div className="space-y-2">
            {/* Filter Rows */}
            {filters.length > 0 && (
                <div className="space-y-1.5">
                    {filters.map((filter, index) => (
                        <FilterRow
                            key={`filter-${index}`}
                            filter={filter}
                            index={index}
                            properties={properties}
                            onUpdate={handleUpdateFilter}
                            onRemove={removeFilter}
                        />
                    ))}
                </div>
            )}

            {/* Add Filter Button */}
            <Button type="button" variant="outline" size="sm" onClick={handleAddFilter} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Filter
            </Button>
        </div>
    );
}

export default FilterBuilder;
