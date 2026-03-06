/**
 * useNetworkCapture Hook
 *
 * Connects the DevTools network capture service to the Zustand store.
 * Supports both DevTools panel and standalone popup window modes.
 *
 * ★ Insight ─────────────────────────────────────
 * - This hook bridges the Chrome DevTools API with React state
 * - DevTools mode uses full HAR data via chrome.devtools.network
 * - Standalone mode uses basic request info via background worker
 * - The hook handles cleanup automatically on unmount
 * - Network capture callbacks update the Zustand store directly
 * ─────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import type { CapturedRequest, NetworkCaptureCallbacks } from '../services/devtools';
import { cleanupNetworkCapture, initNetworkCapture, initStandaloneCapture } from '../services/devtools';
import { useMetadataStore } from '../stores/metadataStore';
import { useRequestStore } from '../stores/requestStore';

/**
 * Check if we're running in a DevTools context
 */
function isDevToolsContext(): boolean {
    return (
        typeof chrome !== 'undefined' &&
        typeof chrome.devtools !== 'undefined' &&
        typeof chrome.devtools.network !== 'undefined'
    );
}

/**
 * Get tab ID from URL parameter (for standalone mode)
 */
function getTabIdFromUrl(): number | null {
    try {
        const params = new URLSearchParams(window.location.search);
        const tabIdStr = params.get('tabId');
        if (tabIdStr) {
            const tabId = parseInt(tabIdStr, 10);
            return Number.isNaN(tabId) ? null : tabId;
        }
    } catch {
        // Ignore URL parsing errors
    }
    return null;
}

/**
 * Hook to initialize and manage network capture
 *
 * Supports two modes:
 * 1. DevTools mode - Full HAR data via chrome.devtools.network
 * 2. Standalone mode - Basic request info via background worker (when tabId URL param exists)
 *
 * @returns Object containing mode info and initialization status
 */
export function useNetworkCapture() {
    const [isDevTools, setIsDevTools] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addRequest, updateRequest, setMetadata: setRequestStoreMetadata, clearRequests } = useRequestStore();
    const { setMetadata: setMetadataStoreMetadata, clearMetadata } = useMetadataStore();

    useEffect(() => {
        const devToolsAvailable = isDevToolsContext();
        const standaloneTabId = getTabIdFromUrl();

        setIsDevTools(devToolsAvailable);
        setIsStandalone(standaloneTabId !== null);

        // Need either DevTools context or a tabId URL parameter
        if (!devToolsAvailable && standaloneTabId === null) {
            console.debug('[useNetworkCapture] Not in DevTools context and no tabId parameter, skipping initialization');
            return;
        }

        try {
            const callbacks: NetworkCaptureCallbacks = {
                onRequest: (request: CapturedRequest) => {
                    // Convert CapturedRequest to ODataRequest for the store
                    addRequest({
                        id: request.id,
                        _requestId: String(request._uniqueId),
                        url: request.url,
                        path: request.path,
                        name: request.name,
                        type: request.type,
                        request: request.request,
                        response: request.response,
                        timestamp: request.timestamp,
                        duration: request.duration,
                        batch: request.batch,
                        initiator: request.initiator,
                        _pending: request._pending,
                        _error: request._error,
                        isMetadata: request.isMetadata,
                        metadataSummary: request.metadataSummary
                    });
                },
                onMetadata: (metadata) => {
                    // Update both stores
                    setRequestStoreMetadata(metadata);
                    setMetadataStoreMetadata(metadata, metadata.serviceUrl);
                },
                onClear: () => {
                    clearRequests();
                    clearMetadata();
                },
                onPendingUpdate: (requestId, updates) => {
                    updateRequest(requestId, updates);
                }
            };

            // Initialize based on available mode
            if (devToolsAvailable) {
                // DevTools mode - full HAR support
                initNetworkCapture(callbacks);
                console.debug('[useNetworkCapture] Initialized in DevTools mode');
            } else if (standaloneTabId !== null) {
                // Standalone mode - basic info from background worker
                initStandaloneCapture(standaloneTabId, callbacks);
                console.debug(`[useNetworkCapture] Initialized in standalone mode for tab ${standaloneTabId}`);
            }

            setIsInitialized(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            console.error('[useNetworkCapture] Failed to initialize:', message);
        }

        return () => {
            cleanupNetworkCapture();
            setIsInitialized(false);
            console.debug('[useNetworkCapture] Cleaned up');
        };
    }, [addRequest, updateRequest, setRequestStoreMetadata, setMetadataStoreMetadata, clearRequests, clearMetadata]);

    return {
        isDevTools,
        isStandalone,
        isInitialized,
        error
    };
}

export default useNetworkCapture;
