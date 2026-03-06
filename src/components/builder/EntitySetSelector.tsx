/**
 * EntitySetSelector Component
 *
 * Dropdown for selecting an EntitySet from the service metadata.
 */

import { useBuilderStore } from '../../stores/builderStore';
import { useMetadataStore } from '../../stores/metadataStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function EntitySetSelector() {
    const { entitySet, setEntitySet, setEntityType } = useBuilderStore();
    const { metadata } = useMetadataStore();

    const entitySets = metadata?.entitySets || [];

    const handleValueChange = (value: string) => {
        setEntitySet(value);

        // Find and set the entity type for this entity set
        if (value && metadata) {
            const selectedSet = entitySets.find((es) => es.name === value);
            if (selectedSet) {
                const entityTypeName = selectedSet.entityType;
                const entityType = metadata.entityTypes?.find(
                    (et) =>
                        et.fullName === entityTypeName ||
                        et.name === entityTypeName ||
                        entityTypeName?.endsWith(`.${et.name}`)
                );
                setEntityType(entityType || null);
            }
        } else {
            setEntityType(null);
        }
    };

    return (
        <Select value={entitySet} onValueChange={handleValueChange}>
            <SelectTrigger className="flex-1 min-w-[200px] h-8 text-xs">
                <SelectValue placeholder="Select EntitySet..." />
            </SelectTrigger>
            <SelectContent>
                {entitySets.map((es) => (
                    <SelectItem key={es.name} value={es.name}>
                        {es.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default EntitySetSelector;
