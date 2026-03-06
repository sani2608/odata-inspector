/**
 * OrderBySelector Component
 *
 * Selects field and direction for $orderby.
 */

import { useBuilderStore } from '../../stores/builderStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function OrderBySelector() {
    const { entityType, orderby, setOrderBy } = useBuilderStore();

    const properties = entityType?.properties || [];

    const handleFieldChange = (value: string) => {
        // Handle special "none" value
        setOrderBy({ ...orderby, field: value === '__none__' ? '' : value });
    };

    const handleDirectionChange = (value: string) => {
        setOrderBy({ ...orderby, direction: value as 'asc' | 'desc' });
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={orderby.field || '__none__'} onValueChange={handleFieldChange} disabled={!entityType}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {properties.map((prop) => (
                        <SelectItem key={prop.name} value={prop.name}>
                            {prop.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={orderby.direction} onValueChange={handleDirectionChange} disabled={!orderby.field}>
                <SelectTrigger className="w-[110px] h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

export default OrderBySelector;
