/**
 * FieldSelector Component
 *
 * Checkboxes for selecting fields to include in $select.
 * Designed for narrow sidebar layout with single column.
 */

import { useBuilderStore } from '../../stores/builderStore';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';

export function FieldSelector() {
    const { entityType, select, toggleSelectField, selectAllFields, clearSelectFields } = useBuilderStore();

    const properties = entityType?.properties || [];
    const allSelected = properties.length > 0 && select.length === properties.length;

    const handleSelectAll = () => {
        if (allSelected) {
            clearSelectFields();
        } else {
            selectAllFields(properties.map((p) => p.name));
        }
    };

    if (!entityType) {
        return <div className="text-sm text-slate-500 italic py-2">Select an EntitySet first</div>;
    }

    if (properties.length === 0) {
        return <div className="text-sm text-slate-500 italic py-2">No properties available</div>;
    }

    return (
        <div className="space-y-2">
            {/* Select All - Right aligned */}
            <div className="flex items-center justify-end gap-2 pb-2 border-b border-slate-700/30">
                <Checkbox id="select-all" checked={allSelected} onCheckedChange={handleSelectAll} className="h-4 w-4" />
                <label htmlFor="select-all" className="text-sm text-slate-400 cursor-pointer">
                    All
                </label>
            </div>

            {/* Field List - Single column for sidebar */}
            <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                {properties.map((prop) => {
                    const isSelected = select.includes(prop.name);
                    const typeDisplay = prop.type?.replace('Edm.', '') || '';

                    return (
                        <div key={prop.name} className="flex items-center gap-2.5 py-1.5">
                            <Checkbox
                                id={`select-${prop.name}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectField(prop.name)}
                                className="h-4 w-4"
                            />
                            <label
                                htmlFor={`select-${prop.name}`}
                                className="flex items-center justify-between flex-1 text-sm cursor-pointer min-w-0"
                            >
                                <span className="font-mono truncate text-slate-200">{prop.name}</span>
                                {typeDisplay && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[11px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 shrink-0 ml-2"
                                    >
                                        {typeDisplay}
                                    </Badge>
                                )}
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default FieldSelector;
