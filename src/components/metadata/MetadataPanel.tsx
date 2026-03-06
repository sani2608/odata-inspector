/**
 * MetadataPanel Component
 *
 * Overlay panel for browsing OData service metadata.
 *
 * ★ Insight ─────────────────────────────────────
 * - Full-screen overlay for exploring metadata
 * - Sidebar navigation for different metadata sections
 * - Search filters across all metadata items
 * - Escape key or backdrop click closes the panel
 * ─────────────────────────────────────────────────
 */

import { FileCode2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { useMetadataStore } from '../../stores/metadataStore';
import { useUIStore } from '../../stores/uiStore';
import type { Association, ComplexType, EntityType, FunctionImport, MetadataSection } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AssociationCard } from './AssociationCard';
import { ComplexTypeCard } from './ComplexTypeCard';
import { EntityTypeCard } from './EntityTypeCard';
import { FunctionImportCard } from './FunctionImportCard';
import { MetadataNav } from './MetadataNav';

/**
 * Debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Render the appropriate card for an item based on section
 */
function renderItem(item: unknown, section: MetadataSection, searchTerm: string): React.ReactNode {
    switch (section) {
        case 'entityTypes':
            return <EntityTypeCard entityType={item as EntityType} searchTerm={searchTerm} />;
        case 'complexTypes':
            return <ComplexTypeCard complexType={item as ComplexType} searchTerm={searchTerm} />;
        case 'functionImports':
            return <FunctionImportCard functionImport={item as FunctionImport} searchTerm={searchTerm} />;
        case 'associations':
            return <AssociationCard association={item as Association} searchTerm={searchTerm} />;
        default:
            return null;
    }
}

/**
 * Get unique key for item
 */
function getItemKey(item: unknown, section: MetadataSection): string {
    switch (section) {
        case 'entityTypes':
            return `entityType-${(item as EntityType).fullName}`;
        case 'complexTypes':
            return `complexType-${(item as ComplexType).fullName}`;
        case 'functionImports':
            return `functionImport-${(item as FunctionImport).name}`;
        case 'associations':
            return `association-${(item as Association).namespace}.${(item as Association).name}`;
        default:
            return String(item);
    }
}

/**
 * Empty state component
 */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Search className="h-12 w-12 text-[#82c0c7] opacity-30 mb-4" />
            <div className="text-slate-400">{hasSearch ? 'No matches found' : 'No items in this category'}</div>
        </div>
    );
}

export function MetadataPanel() {
    const { metadataPanelOpen, toggleMetadataPanel } = useUIStore();
    const { metadata, serviceUrl, currentSection, searchTerm, setSearchTerm, getFilteredItems } = useMetadataStore();

    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(localSearchTerm, 200);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sync debounced search term to store
    useEffect(() => {
        setSearchTerm(debouncedSearchTerm);
    }, [debouncedSearchTerm, setSearchTerm]);

    // Focus search input when panel opens
    useEffect(() => {
        if (metadataPanelOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            // Reset search when closing
            setLocalSearchTerm('');
        }
    }, [metadataPanelOpen]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && metadataPanelOpen) {
                toggleMetadataPanel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [metadataPanelOpen, toggleMetadataPanel]);

    if (!metadataPanelOpen || !metadata) {
        return null;
    }

    const filteredItems = getFilteredItems();

    return (
        <div
            className="fixed inset-0 z-50 animate-in fade-in duration-150"
            onKeyDown={(e) => e.key === 'Escape' && toggleMetadataPanel()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="metadata-panel-title"
        >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Content container needs click stop propagation */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard handled by parent dialog */}
            <div
                className={cn(
                    'w-full h-full',
                    'bg-slate-950',
                    'flex flex-col overflow-hidden',
                    'animate-in fade-in duration-150'
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center px-5 py-4 bg-gradient-to-r from-[#32373c] via-slate-900 to-slate-900 border-b border-slate-700/50 gap-4">
                    <div className="flex items-center gap-2.5">
                        <FileCode2 className="h-5 w-5 text-[#2ea3f2]" />
                        <h2 id="metadata-panel-title" className="text-base font-semibold bg-gradient-to-r from-[#2ea3f2] to-[#82c0c7] bg-clip-text text-transparent">
                            Service Metadata
                        </h2>
                    </div>
                    <span className="flex-1 font-mono text-xs text-slate-400 truncate" title={serviceUrl}>
                        {serviceUrl}
                    </span>
                    <Button variant="ghost" size="icon" onClick={toggleMetadataPanel} className="shrink-0">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-slate-700/50 bg-[#32373c]/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#82c0c7]/60 pointer-events-none" />
                        <Input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search metadata..."
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden bg-slate-950">
                    {/* Sidebar */}
                    <div className="w-[220px] shrink-0 bg-gradient-to-b from-[#32373c] to-slate-950 border-r border-slate-700/50 overflow-y-auto">
                        <MetadataNav />
                    </div>

                    {/* Detail Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
                        {filteredItems.length === 0 ? (
                            <EmptyState hasSearch={!!searchTerm.trim()} />
                        ) : (
                            <div className="flex flex-col gap-2">
                                {filteredItems.map((item) => (
                                    <div key={getItemKey(item, currentSection)}>
                                        {renderItem(item, currentSection, searchTerm)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MetadataPanel;
