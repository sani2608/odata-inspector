/**
 * Metadata Store
 *
 * Zustand store for managing OData metadata state.
 *
 * ★ Insight ─────────────────────────────────────
 * - Stores parsed OData service metadata
 * - Manages current section and search filtering
 * - Provides computed getters for filtered items
 * ─────────────────────────────────────────────────
 */

import { create } from 'zustand';
import type { MetadataSection, ODataMetadata } from '../types';

interface MetadataState {
    // Metadata
    metadata: ODataMetadata | null;
    serviceUrl: string;

    // UI State
    currentSection: MetadataSection;
    searchTerm: string;
    expandedItems: Set<string>;

    // Actions
    setMetadata: (metadata: ODataMetadata, serviceUrl: string) => void;
    clearMetadata: () => void;
    setCurrentSection: (section: MetadataSection) => void;
    setSearchTerm: (term: string) => void;
    toggleItemExpanded: (itemId: string) => void;
    isItemExpanded: (itemId: string) => boolean;

    // Computed getters
    getSectionItems: () => unknown[];
    getFilteredItems: () => unknown[];
    getSectionCount: (section: MetadataSection) => number;
}

/**
 * Get items for a metadata section
 */
function getItemsForSection(metadata: ODataMetadata | null, section: MetadataSection): unknown[] {
    if (!metadata) return [];

    switch (section) {
        case 'entityTypes':
            return metadata.entityTypes;
        case 'complexTypes':
            return metadata.complexTypes;
        case 'associations':
            return metadata.associations;
        case 'functionImports':
            return metadata.functionImports;
        default:
            return [];
    }
}

/**
 * Filter items by search term
 */
function filterItems(items: unknown[], searchTerm: string): unknown[] {
    if (!searchTerm.trim()) return items;

    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
        // Stringify and search - simple but effective
        const searchableText = JSON.stringify(item).toLowerCase();
        return searchableText.includes(term);
    });
}

/**
 * Sort items alphabetically by name
 */
function sortItemsByName(items: unknown[]): unknown[] {
    return [...items].sort((a, b) => {
        const nameA = (a as { name: string }).name || '';
        const nameB = (b as { name: string }).name || '';
        return nameA.localeCompare(nameB);
    });
}

export const useMetadataStore = create<MetadataState>()((set, get) => ({
    // Initial state
    metadata: null,
    serviceUrl: '',
    currentSection: 'entityTypes',
    searchTerm: '',
    expandedItems: new Set<string>(),

    // Actions
    setMetadata: (metadata, serviceUrl) => {
        set({
            metadata,
            serviceUrl,
            // Reset state when new metadata is loaded
            currentSection: 'entityTypes',
            searchTerm: '',
            expandedItems: new Set()
        });
    },

    clearMetadata: () => {
        set({
            metadata: null,
            serviceUrl: '',
            searchTerm: '',
            expandedItems: new Set()
        });
    },

    setCurrentSection: (section) => {
        set({ currentSection: section });
    },

    setSearchTerm: (term) => {
        set({ searchTerm: term });
    },

    toggleItemExpanded: (itemId) => {
        set((state) => {
            const newExpanded = new Set(state.expandedItems);
            if (newExpanded.has(itemId)) {
                newExpanded.delete(itemId);
            } else {
                newExpanded.add(itemId);
            }
            return { expandedItems: newExpanded };
        });
    },

    isItemExpanded: (itemId) => {
        return get().expandedItems.has(itemId);
    },

    // Computed getters
    getSectionItems: () => {
        const { metadata, currentSection } = get();
        return getItemsForSection(metadata, currentSection);
    },

    getFilteredItems: () => {
        const { metadata, currentSection, searchTerm } = get();
        const items = getItemsForSection(metadata, currentSection);
        const filtered = filterItems(items, searchTerm);
        return sortItemsByName(filtered);
    },

    getSectionCount: (section) => {
        const { metadata } = get();
        const items = getItemsForSection(metadata, section);
        return items.length;
    }
}));

/**
 * Hook to check if metadata is available
 */
export function useHasMetadata(): boolean {
    return useMetadataStore((state) => state.metadata !== null);
}

/**
 * Hook to get filtered items for current section
 */
export function useFilteredMetadataItems<T = unknown>(): T[] {
    return useMetadataStore((state) => state.getFilteredItems()) as T[];
}
