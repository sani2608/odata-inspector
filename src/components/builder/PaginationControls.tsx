/**
 * PaginationControls Component
 *
 * Inputs for $top and $skip pagination parameters.
 * Designed for narrow sidebar with side-by-side layout.
 */

import { useBuilderStore } from '../../stores/builderStore';
import { Input } from '../ui/input';

export function PaginationControls() {
    const { top, skip, setTop, setSkip } = useBuilderStore();

    const handleTopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const parsed = parseInt(value, 10);
        setTop(Number.isNaN(parsed) ? null : parsed);
    };

    const handleSkipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const parsed = parseInt(value, 10);
        setSkip(Number.isNaN(parsed) ? null : parsed);
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1">
                <label htmlFor="builder-top" className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">
                    $top
                </label>
                <Input
                    id="builder-top"
                    type="number"
                    value={top ?? ''}
                    onChange={handleTopChange}
                    placeholder="100"
                    min={0}
                    className="h-9 text-sm"
                />
            </div>

            <div className="flex-1">
                <label htmlFor="builder-skip" className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">
                    $skip
                </label>
                <Input
                    id="builder-skip"
                    type="number"
                    value={skip ?? ''}
                    onChange={handleSkipChange}
                    placeholder="0"
                    min={0}
                    className="h-9 text-sm"
                />
            </div>
        </div>
    );
}

export default PaginationControls;
