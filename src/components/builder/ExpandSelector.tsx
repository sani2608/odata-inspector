/**
 * ExpandSelector Component
 *
 * Checkboxes for selecting navigation properties to expand.
 * Designed for narrow sidebar layout.
 */

import { useBuilderStore } from '../../stores/builderStore';
import { Checkbox } from '../ui/checkbox';

export function ExpandSelector() {
    const { entityType, expand, toggleExpandField } = useBuilderStore();

    const navigationProperties = entityType?.navigationProperties || [];

    if (!entityType) {
        return <div className="text-sm text-slate-500 italic py-2">Select an EntitySet first</div>;
    }

    if (navigationProperties.length === 0) {
        return <div className="text-sm text-slate-500 italic py-2">No navigation properties</div>;
    }

    return (
        <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
            {navigationProperties.map((nav) => {
                const isExpanded = expand.includes(nav.name);

                return (
                    <div key={nav.name} className="flex items-center gap-2.5 py-1.5">
                        <Checkbox
                            id={`expand-${nav.name}`}
                            checked={isExpanded}
                            onCheckedChange={() => toggleExpandField(nav.name)}
                            className="h-4 w-4"
                        />
                        <label
                            htmlFor={`expand-${nav.name}`}
                            className="text-sm cursor-pointer font-mono text-slate-200 truncate"
                        >
                            {nav.name}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}

export default ExpandSelector;
