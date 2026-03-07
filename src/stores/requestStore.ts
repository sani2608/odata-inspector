/**
 * Request Store
 *
 * Zustand store for managing captured OData requests.
 *
 * ★ Insight ─────────────────────────────────────
 * - This replaces the observable pattern from the original vanilla JS
 * - Zustand provides similar simplicity with better TypeScript support
 * - The store is used by the DevTools panel
 * ─────────────────────────────────────────────────
 */

import { create } from 'zustand';
import type { DetailTab, ODataMetadata, ODataRequest } from '../types';

interface RequestState {
    // Request list
    requests: ODataRequest[];
    selectedRequestId: string | null;

    // Metadata
    metadata: ODataMetadata | null;

    // UI state
    searchQuery: string;
    responseSearchQuery: string;
    activeTab: DetailTab;

    // Actions
    addRequest: (request: ODataRequest) => void;
    updateRequest: (id: string, updates: Partial<ODataRequest>) => void;
    selectRequest: (id: string | null) => void;
    clearRequests: () => void;
    setMetadata: (metadata: ODataMetadata | null) => void;
    setSearchQuery: (query: string) => void;
    setResponseSearchQuery: (query: string) => void;
    setActiveTab: (tab: DetailTab) => void;
}

export const useRequestStore = create<RequestState>((set) => ({
    // Initial state
    requests: [],
    selectedRequestId: null,
    metadata: null,
    searchQuery: '',
    responseSearchQuery: '',
    activeTab: 'request',

    // Add a new request
    addRequest: (request) => {
        set((state) => ({
            requests: [request, ...state.requests]
        }));
    },

    // Update an existing request (e.g., when response arrives)
    updateRequest: (id, updates) => {
        set((state) => ({
            requests: state.requests.map((req) =>
                req.id === id || req._requestId === id ? { ...req, ...updates } : req
            )
        }));
    },

    // Select a request
    selectRequest: (id) => {
        set({ selectedRequestId: id });
    },

    // Clear all requests
    clearRequests: () => {
        set({
            requests: [],
            selectedRequestId: null
        });
    },

    // Set metadata
    setMetadata: (metadata) => {
        set({ metadata });
    },

    // Set search query
    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    // Set response search query
    setResponseSearchQuery: (query) => {
        set({ responseSearchQuery: query });
    },

    // Set active tab
    setActiveTab: (tab) => {
        set({ activeTab: tab });
    }
}));

// Selectors for derived state
export const useSelectedRequest = () => {
    const { requests, selectedRequestId } = useRequestStore();
    return requests.find((r) => r.id === selectedRequestId) ?? null;
};

export const useFilteredRequests = () => {
    const { requests, searchQuery } = useRequestStore();

    if (!searchQuery.trim()) {
        return requests;
    }

    const query = searchQuery.toLowerCase();
    return requests.filter((req) => {
        return (
            req.name?.toLowerCase().includes(query) ||
            req.url.toLowerCase().includes(query) ||
            req.request.method.toLowerCase().includes(query)
        );
    });
};
