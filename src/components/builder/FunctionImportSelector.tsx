/**
 * FunctionImportSelector Component
 *
 * Dropdown for selecting a Function Import from the service metadata.
 */

import { useBuilderStore } from '../../stores/builderStore';
import { useMetadataStore } from '../../stores/metadataStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function FunctionImportSelector() {
    const { functionImport, setFunctionImport } = useBuilderStore();
    const { metadata } = useMetadataStore();

    const functionImports = metadata?.functionImports || [];

    const handleValueChange = (value: string) => {
        if (value && metadata) {
            const selectedFunc = functionImports.find((fi) => fi.name === value);
            setFunctionImport(selectedFunc || null);
        } else {
            setFunctionImport(null);
        }
    };

    return (
        <Select value={functionImport?.name || ''} onValueChange={handleValueChange}>
            <SelectTrigger className="flex-1 min-w-[200px] h-8 text-xs">
                <SelectValue placeholder="Select Function Import..." />
            </SelectTrigger>
            <SelectContent>
                {functionImports.map((fi) => (
                    <SelectItem key={fi.name} value={fi.name}>
                        {fi.name} ({fi.httpMethod || 'GET'})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default FunctionImportSelector;
