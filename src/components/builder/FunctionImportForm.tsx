/**
 * FunctionImportForm Component
 *
 * Form for entering function import parameters.
 */

import { useBuilderStore } from '../../stores/builderStore';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

export function FunctionImportForm() {
    const { functionImport, functionParams, setFunctionParam } = useBuilderStore();

    if (!functionImport) {
        return <div className="text-xs text-foreground-muted italic py-2">Select a Function Import first</div>;
    }

    const parameters = functionImport.parameters || [];

    return (
        <div className="space-y-4">
            {/* Function Info */}
            <div className="p-3 bg-background-tertiary rounded space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-muted">Name:</span>
                    <span className="text-xs font-medium text-foreground-primary">{functionImport.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground-muted">Method:</span>
                    <Badge variant="outline" className="text-[10px]">
                        {functionImport.httpMethod || 'GET'}
                    </Badge>
                </div>
                {functionImport.returnType && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-muted">Returns:</span>
                        <Badge variant="secondary" className="text-[10px] bg-accent-purple/10 text-accent-purple">
                            {functionImport.returnType}
                        </Badge>
                    </div>
                )}
                {functionImport.entitySet && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-muted">EntitySet:</span>
                        <span className="text-xs font-mono text-foreground-primary">{functionImport.entitySet}</span>
                    </div>
                )}
            </div>

            {/* Parameters */}
            {parameters.length === 0 ? (
                <div className="text-xs text-foreground-muted italic">No parameters required</div>
            ) : (
                <div className="space-y-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                        Parameters ({parameters.length})
                    </div>
                    {parameters.map((param) => {
                        const typeDisplay = param.type?.replace('Edm.', '') || 'String';
                        const isRequired = !param.nullable;

                        return (
                            <div key={param.name} className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground-primary">{param.name}</span>
                                    <Badge
                                        variant="secondary"
                                        className="text-[9px] bg-accent-purple/10 text-accent-purple"
                                    >
                                        {typeDisplay}
                                    </Badge>
                                    {isRequired && <span className="text-[9px] text-accent-orange">Required</span>}
                                </div>
                                <Input
                                    type="text"
                                    value={functionParams[param.name] || ''}
                                    onChange={(e) => setFunctionParam(param.name, e.target.value)}
                                    placeholder={`Enter ${param.name}...`}
                                    className="h-8 text-xs"
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default FunctionImportForm;
