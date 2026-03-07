/**
 * useNetworkCapture Hook
 *
 * Connects the DevTools network capture service to the Zustand store.
 * Uses chrome.devtools.network for full HAR data capture.
 */

import { useEffect, useState } from 'react';
import type { CapturedRequest, NetworkCaptureCallbacks } from '../services/devtools';
import { cleanupNetworkCapture, initNetworkCapture } from '../services/devtools';
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
 * Hook to initialize and manage network capture via DevTools HAR API
 */
export function useNetworkCapture() {
    const [isDevTools, setIsDevTools] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addRequest, updateRequest, setMetadata: setRequestStoreMetadata, clearRequests } = useRequestStore();
    const { setMetadata: setMetadataStoreMetadata, clearMetadata } = useMetadataStore();

    useEffect(() => {
        const devToolsAvailable = isDevToolsContext();
        setIsDevTools(devToolsAvailable);

        if (!devToolsAvailable) {
            console.debug('[useNetworkCapture] Not in DevTools context, skipping initialization');
            return;
        }

        try {
            const callbacks: NetworkCaptureCallbacks = {
                onRequest: (request: CapturedRequest) => {
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

            initNetworkCapture(callbacks);
            console.debug('[useNetworkCapture] Initialized in DevTools mode');
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
        isInitialized,
        error
    };
}

export default useNetworkCapture;
