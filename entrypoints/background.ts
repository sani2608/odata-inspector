/**
 * Background Service Worker
 *
 * Handles:
 * - Network request interception for real-time tracking
 * - Message passing between DevTools panel and content scripts
 */

export default defineBackground(() => {
    console.debug('[OData Inspector] Background service worker started');

    // =========================================================================
    // State
    // =========================================================================

    const connections = new Map<number, chrome.runtime.Port>();

    const pendingRequests = new Map<number, Map<string, PendingRequest>>();

    interface PendingRequest {
        requestId: string;
        url: string;
        method: string;
        timestamp: number;
    }

    // =========================================================================
    // OData Detection Utilities
    // =========================================================================

    const isODataUrl = (url: string): boolean => {
        const patterns = [
            /\/\$batch\b/i,
            /\/\$metadata\b/i,
            /\/sap\/opu\/odata\//i,
            /\/odata\//i,
            /\$filter=/i,
            /\$select=/i,
            /\$expand=/i,
        ];
        return patterns.some((pattern) => pattern.test(url));
    };

    const extractEntitySet = (url: string): string => {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);

            for (let i = pathParts.length - 1; i >= 0; i--) {
                const part = pathParts[i];
                if (part.startsWith('$')) continue;
                if (part === 'odata' || part === 'opu' || part === 'sap') continue;
                return part.split('(')[0];
            }
            return 'Unknown';
        } catch {
            return 'Unknown';
        }
    };

    const getRequestType = (url: string): string => {
        if (/\/\$batch\b/i.test(url)) return 'batch';
        if (/\/\$metadata\b/i.test(url)) return 'metadata';
        if (/\/\$count\b/i.test(url)) return 'count';
        if (/\/\$value\b/i.test(url)) return 'value';
        return 'entity';
    };

    // =========================================================================
    // Panel Connection Handler
    // =========================================================================

    chrome.runtime.onConnect.addListener((port) => {
        if (port.name !== 'odata-inspector') {
            return;
        }

        console.debug('[OData Inspector] Panel connected');

        let tabId: number | null = null;

        port.onMessage.addListener((message: { type: string; tabId?: number }) => {
            if (message.type === 'init' && typeof message.tabId === 'number') {
                tabId = message.tabId;
                connections.set(tabId, port);
                console.debug(`[OData Inspector] Panel registered for tab ${tabId}`);
            }
        });

        port.onDisconnect.addListener(() => {
            if (tabId !== null) {
                connections.delete(tabId);
                console.debug(`[OData Inspector] Panel disconnected for tab ${tabId}`);
            }
        });
    });

    // =========================================================================
    // webRequest API
    // =========================================================================

    chrome.webRequest.onBeforeRequest.addListener(
        (details): undefined => {
            if (!isODataUrl(details.url)) return undefined;

            const tabId = details.tabId;
            if (tabId === -1) return undefined;

            if (!pendingRequests.has(tabId)) {
                pendingRequests.set(tabId, new Map());
            }

            const tabPending = pendingRequests.get(tabId)!;
            tabPending.set(details.requestId, {
                requestId: details.requestId,
                url: details.url,
                method: details.method,
                timestamp: Date.now(),
            });

            const port = connections.get(tabId);
            if (port) {
                port.postMessage({
                    type: 'request-started',
                    data: {
                        requestId: details.requestId,
                        url: details.url,
                        method: details.method,
                        entitySet: extractEntitySet(details.url),
                        type: getRequestType(details.url),
                        timestamp: Date.now(),
                    },
                });
            }
            return undefined;
        },
        { urls: ['<all_urls>'] }
    );

    chrome.webRequest.onCompleted.addListener(
        (details) => {
            const tabId = details.tabId;
            if (tabId === -1) return;

            const tabPending = pendingRequests.get(tabId);
            const pending = tabPending?.get(details.requestId);

            if (!pending) return;

            const duration = Date.now() - pending.timestamp;
            tabPending?.delete(details.requestId);

            const port = connections.get(tabId);
            if (port) {
                port.postMessage({
                    type: 'request-completed',
                    data: {
                        requestId: details.requestId,
                        statusCode: details.statusCode,
                        duration,
                    },
                });
            }
        },
        { urls: ['<all_urls>'] }
    );

    chrome.webRequest.onErrorOccurred.addListener(
        (details) => {
            const tabId = details.tabId;
            if (tabId === -1) return;

            const tabPending = pendingRequests.get(tabId);
            const pending = tabPending?.get(details.requestId);

            if (!pending) return;

            const duration = Date.now() - pending.timestamp;
            tabPending?.delete(details.requestId);

            const port = connections.get(tabId);
            if (port) {
                port.postMessage({
                    type: 'request-error',
                    data: {
                        requestId: details.requestId,
                        error: details.error,
                        duration,
                    },
                });
            }
        },
        { urls: ['<all_urls>'] }
    );

    // =========================================================================
    // Tab Cleanup
    // =========================================================================

    chrome.tabs.onRemoved.addListener((tabId) => {
        connections.delete(tabId);
        pendingRequests.delete(tabId);
    });
});
