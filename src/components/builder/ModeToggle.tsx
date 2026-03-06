/**
 * ModeToggle Component
 *
 * Toggle between Entity mode (EntitySet queries) and Function mode (FunctionImports).
 */

import { Database, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBuilderStore } from '../../stores/builderStore';
import { Button } from '../ui/button';

export function ModeToggle() {
    const { mode, setMode } = useBuilderStore();

    return (
        <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg">
            <Button
                type="button"
                variant={mode === 'entity' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('entity')}
                className={cn('flex items-center gap-1.5', mode === 'entity' && 'bg-accent-blue text-white')}
            >
                <Database className="h-3.5 w-3.5" />
                EntitySet
            </Button>
            <Button
                type="button"
                variant={mode === 'function' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('function')}
                className={cn('flex items-center gap-1.5', mode === 'function' && 'bg-accent-green text-white')}
            >
                <Zap className="h-3.5 w-3.5" />
                Function Import
            </Button>
        </div>
    );
}

export default ModeToggle;
