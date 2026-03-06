/**
 * EntityTypeCard Component
 *
 * Displays an OData EntityType with properties and navigation properties.
 *
 * ★ Insight ─────────────────────────────────────
 * - EntityTypes are the core data structures in OData
 * - Key properties are marked with an asterisk
 * - Navigation properties show relationships to other entities
 * ─────────────────────────────────────────────────
 */

import { ChevronRight, Key } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMetadataStore } from '../../stores/metadataStore';
import type { EntityType, NavigationProperty, ODataProperty } from '../../types';
import { Badge } from '../ui/badge';
import { HighlightedText } from './utils';

interface EntityTypeCardProps {
    entityType: EntityType;
    searchTerm: string;
}

/**
 * Capability badge for SAP annotations (Filterable, Sortable, Creatable, Updatable)
 */
function CapabilityBadge({
    label,
    enabled,
    title,
    isFirst
}: { label: string; enabled?: boolean; title: string; isFirst?: boolean }) {
    return (
        <span
            title={`${title}: ${enabled ? 'Yes' : 'No'}`}
            className={cn(
                'w-[28px] h-[28px] flex items-center justify-center text-xs font-semibold cursor-help border border-slate-700/50',
                isFirst ? 'rounded-l' : '',
                label === 'U' ? 'rounded-r' : '',
                enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 text-slate-600'
            )}
        >
            {label}
        </span>
    );
}

/**
 * Column header row for properties table
 */
function PropertyHeader() {
    return (
        <div className="flex items-center py-1.5 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-600/50 mb-1">
            <span className="w-[180px] shrink-0">Property</span>
            <span className="w-[130px] shrink-0">Label</span>
            <span className="w-[130px] shrink-0">Type</span>
            <span className="w-[60px] shrink-0 text-center">Req</span>
            <span className="w-[70px] shrink-0">Length</span>
            <span className="shrink-0" title="Filterable / Sortable / Creatable / Updatable">
                FSCU
            </span>
        </div>
    );
}

/**
 * Property row component
 *
 * Displays property name, SAP label (as column), type, constraints, and capability badges.
 * Uses fixed-width columns for consistent alignment.
 */
function PropertyRow({ property, searchTerm }: { property: ODataProperty; searchTerm: string }) {
    return (
        <div className="flex items-center py-1.5 text-xs border-b border-slate-700/30 last:border-0">
            {/* Property name column - fixed width */}
            <span
                className={cn(
                    'font-mono font-medium w-[180px] shrink-0 truncate',
                    property.isKey ? 'text-amber-400' : 'text-slate-200'
                )}
                title={property.name}
            >
                {property.isKey && <Key className="inline h-3 w-3 mr-1 text-amber-400" />}
                <HighlightedText text={property.name} searchTerm={searchTerm} />
            </span>

            {/* SAP Label column - fixed width */}
            <span className="text-[11px] text-slate-500 w-[130px] shrink-0 truncate" title={property.sapLabel || ''}>
                {property.sapLabel || '—'}
            </span>

            {/* Type badge - fixed width */}
            <span className="w-[130px] shrink-0">
                <Badge variant="secondary" className="font-mono text-[10px] bg-[#2ea3f2]/10 text-[#82c0c7]">
                    {property.type}
                </Badge>
            </span>

            {/* Required indicator - fixed width */}
            <span className="w-[60px] shrink-0 text-center">
                {!property.nullable && (
                    <span className="text-[10px] text-slate-400 bg-[#32373c] px-1.5 py-0.5 rounded">Req</span>
                )}
            </span>

            {/* Max length - fixed width */}
            <span className="w-[70px] shrink-0 text-[10px] text-slate-500 font-mono">
                {property.maxLength ? `max:${property.maxLength}` : ''}
            </span>

            {/* Capability badges - fixed width */}
            <div className="flex shrink-0">
                <CapabilityBadge label="F" enabled={property.sapFilterable} title="Filterable" isFirst />
                <CapabilityBadge label="S" enabled={property.sapSortable} title="Sortable" />
                <CapabilityBadge label="C" enabled={property.sapCreatable} title="Creatable" />
                <CapabilityBadge label="U" enabled={property.sapUpdatable} title="Updatable" />
            </div>
        </div>
    );
}

/**
 * Navigation property row component
 */
function NavPropertyRow({ navProp, searchTerm }: { navProp: NavigationProperty; searchTerm: string }) {
    const targetType = navProp.relationship || navProp.type || '';

    return (
        <div className="flex items-center py-2 px-2.5 gap-2.5 bg-[#32373c]/30 rounded-lg text-xs mb-1.5 last:mb-0">
            <span className="font-mono font-medium text-[#2ea3f2]">
                <HighlightedText text={navProp.name} searchTerm={searchTerm} />
            </span>
            <span className="font-mono text-slate-500 text-[11px]">→ {targetType}</span>
        </div>
    );
}

export function EntityTypeCard({ entityType, searchTerm }: EntityTypeCardProps) {
    const { isItemExpanded, toggleItemExpanded } = useMetadataStore();
    const itemId = `entityType-${entityType.fullName}`;
    const isExpanded = isItemExpanded(itemId);

    const hasNavProps = entityType.navigationProperties && entityType.navigationProperties.length > 0;

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
                <span className="font-semibold text-slate-200 text-[13px]">
                    <HighlightedText text={entityType.name} searchTerm={searchTerm} />
                </span>
                <span className="font-mono text-[11px] text-slate-500 ml-auto">{entityType.namespace}</span>
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-0 border-t border-slate-700/30 ml-7">
                    {/* Properties */}
                    <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#82c0c7] mb-2 pb-1.5 border-b border-[#2ea3f2]/20">
                            Properties ({entityType.properties?.length || 0})
                        </div>
                        <PropertyHeader />
                        {entityType.properties?.map((prop) => (
                            <PropertyRow key={prop.name} property={prop} searchTerm={searchTerm} />
                        ))}
                    </div>

                    {/* Navigation Properties */}
                    {hasNavProps && (
                        <div className="mt-4">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#82c0c7] mb-2 pb-1.5 border-b border-[#2ea3f2]/20">
                                Navigation Properties ({entityType.navigationProperties.length})
                            </div>
                            {entityType.navigationProperties.map((navProp) => (
                                <NavPropertyRow key={navProp.name} navProp={navProp} searchTerm={searchTerm} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default EntityTypeCard;
