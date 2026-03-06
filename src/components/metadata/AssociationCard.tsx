/**
 * AssociationCard Component
 *
 * Displays an OData Association (V2).
 *
 * ★ Insight ─────────────────────────────────────
 * - Associations define relationships between EntityTypes (OData V2)
 * - Each end has a role, type, and multiplicity (0..1, 1, *)
 * - OData V4 uses NavigationProperty with Partner instead
 * ─────────────────────────────────────────────────
 */

import { ChevronRight, GitBranch } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMetadataStore } from '../../stores/metadataStore';
import type { Association, AssociationEnd } from '../../types';
import { HighlightedText } from './utils';

interface AssociationCardProps {
    association: Association;
    searchTerm: string;
}

/**
 * Association end row component
 */
function AssociationEndRow({ end }: { end: AssociationEnd }) {
    return (
        <div className="flex items-center py-2 px-2.5 gap-2.5 bg-[#32373c]/30 rounded-lg text-xs mb-1.5 last:mb-0">
            <span className="font-medium text-slate-200 min-w-[100px]">{end.role}</span>
            <span className="font-mono text-[#82c0c7]">{end.type}</span>
            <span className="text-[11px] px-2 py-0.5 bg-[#32373c] rounded text-slate-400 ml-auto">
                {end.multiplicity}
            </span>
        </div>
    );
}

export function AssociationCard({ association, searchTerm }: AssociationCardProps) {
    const { isItemExpanded, toggleItemExpanded } = useMetadataStore();
    const itemId = `association-${association.namespace}.${association.name}`;
    const isExpanded = isItemExpanded(itemId);

    return (
        <div
            className={cn(
                'bg-[#32373c]/30 border border-slate-700/50 rounded-lg overflow-hidden transition-all duration-200',
                'hover:border-[#2ea3f2]/50 hover:shadow-lg hover:shadow-[#2ea3f2]/5'
            )}
        >
            {/* Header */}
            <button
                type="button"
                onClick={() => toggleItemExpanded(itemId)}
                className="w-full flex items-center px-3.5 py-3 gap-2.5 hover:bg-[#32373c]/50 cursor-pointer text-left"
            >
                <ChevronRight
                    className={cn('h-4 w-4 text-[#82c0c7] transition-transform', isExpanded && 'rotate-90')}
                />
                <GitBranch className="h-4 w-4 text-[#2ea3f2]" />
                <span className="font-semibold text-slate-200 text-[13px]">
                    <HighlightedText text={association.name} searchTerm={searchTerm} />
                </span>
                <span className="font-mono text-[11px] text-slate-500 ml-auto">{association.namespace}</span>
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-0 border-t border-slate-700/30 ml-7">
                    <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#82c0c7] mb-2 pb-1.5 border-b border-[#2ea3f2]/20">
                            Ends
                        </div>
                        {association.ends?.map((end, index) => (
                            <AssociationEndRow key={`${end.role}-${index}`} end={end} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AssociationCard;
