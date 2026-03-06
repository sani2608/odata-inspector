/**
 * ComplexTypeCard Component
 *
 * Displays an OData ComplexType.
 *
 * ★ Insight ─────────────────────────────────────
 * - ComplexTypes are structured types without identity (no keys)
 * - Used as property types within EntityTypes
 * - Similar to value objects or embedded types
 * ─────────────────────────────────────────────────
 */

import { Boxes, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMetadataStore } from '../../stores/metadataStore';
import type { ComplexType, ODataProperty } from '../../types';
import { Badge } from '../ui/badge';
import { HighlightedText } from './utils';

interface ComplexTypeCardProps {
    complexType: ComplexType;
    searchTerm: string;
}

/**
 * Property row component
 */
function PropertyRow({ property, searchTerm }: { property: ODataProperty; searchTerm: string }) {
    return (
        <div className="flex items-center py-1.5 gap-3 text-xs border-b border-slate-700/30 last:border-0">
            <span className="font-mono font-medium min-w-[140px] text-slate-200">
                <HighlightedText text={property.name} searchTerm={searchTerm} />
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] bg-[#2ea3f2]/10 text-[#82c0c7]">
                {property.type}
            </Badge>
            {!property.nullable && (
                <span className="text-[10px] text-slate-400 bg-[#32373c] px-1.5 py-0.5 rounded">
                    Required
                </span>
            )}
        </div>
    );
}

export function ComplexTypeCard({ complexType, searchTerm }: ComplexTypeCardProps) {
    const { isItemExpanded, toggleItemExpanded } = useMetadataStore();
    const itemId = `complexType-${complexType.fullName}`;
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
                <Boxes className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-slate-200 text-[13px]">
                    <HighlightedText text={complexType.name} searchTerm={searchTerm} />
                </span>
                <span className="font-mono text-[11px] text-slate-500 ml-auto">{complexType.namespace}</span>
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-0 border-t border-slate-700/30 ml-7">
                    <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#82c0c7] mb-2 pb-1.5 border-b border-[#2ea3f2]/20">
                            Properties ({complexType.properties?.length || 0})
                        </div>
                        {complexType.properties?.map((prop) => (
                            <PropertyRow key={prop.name} property={prop} searchTerm={searchTerm} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ComplexTypeCard;
