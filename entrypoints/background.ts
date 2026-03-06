/**
 * Background Service Worker
 *
 * Handles:
 * - Toolbar icon click → opens standalone window
 * - Network request interception for real-time tracking
 * - Chrome debugger API for full request/response capture in standalone mode
 * - Message passing between DevTools panel and content scripts
 *
 * ★ Insight ─────────────────────────────────────
 * - Service workers in MV3 are event-driven and can be terminated
 * - DevTools panels use webRequest for basic tracking + HAR for full data
 * - Standalone windows use chrome.debugger API for full request/response capture
 * - The debugger API shows a warning banner but provides complete network data
 * ─────────────────────────────────────────────────
 */

export default defineBackground(() => {
    console.debug('[OData Inspector] Background service worker started');

    // =========================================================================
    // State
    // =========================================================================

    // Store for tracking connections from panels (DevTools or standalone)
    const connections = new Map<number, chrome.runtime.Port>();

    // Track which tabs have debugger attached (for standalone mode)
    const debuggerAttached = new Set<number>();

    // Store for tracking requests captured by debugger
    interface DebuggerRequest {
        requestId: string;
        url: string;
        method: string;
        headers: Record<string, string>;
        postData?: string;
        timestamp: number;
    }
    const debuggerRequests = new Map<number, Map<string, DebuggerRequest>>();

    // Store for pending requests by tab ID (used by webRequest API)
    const pendingRequests = new Map<number, Map<string, PendingRequest>>();

    interface PendingRequest {
        requestId: string;
        url: string;
        method: string;
        timestamp: number;
    }

    // Track which connections are standalone (vs DevTools)
    const standaloneConnections = new Set<number>();

    // =========================================================================
    // Toolbar Icon Click Handler
    // =========================================================================

    chrome.action.onClicked.addListener(async () => {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = activeTab?.id;

            const panelUrl = chrome.runtime.getURL(
                `/panel.html${tabId ? `?tabId=${tabId}&standalone=true` : ''}`
            );

            const windows = await chrome.windows.getAll({ windowTypes: ['popup'] });
            const existingWindow = windows.find((w) => w.id ? true : false);

            if (existingWindow?.id) {
                await chrome.windows.update(existingWindow.id, { focused: true });
            } else {
                await chrome.windows.create({
                    url: panelUrl,
                    type: 'popup',
                    width: 1200,
                    height: 800,
                });
            }

            console.debug(`[OData Inspector] Opened standalone window for tab ${tabId}`);
        } catch (error) {
            console.error('[OData Inspector] Failed to open window:', error);
        }
    });

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
    // Chrome Debugger API (for Standalone Mode)
    // =========================================================================

    /**
     * Attach debugger to a tab for full network capture
     */
    const attachDebugger = async (tabId: number): Promise<boolean> => {
        if (debuggerAttached.has(tabId)) {
            return true;
        }

        try {
            await chrome.debugger.attach({ tabId }, '1.3');
            await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {});
            debuggerAttached.add(tabId);
            debuggerRequests.set(tabId, new Map());
            console.debug(`[OData Inspector] Debugger attached to tab ${tabId}`);
            return true;
        } catch (error) {
            console.error(`[OData Inspector] Failed to attach debugger to tab ${tabId}:`, error);
            return false;
        }
    };

    /**
     * Detach debugger from a tab
     */
    const detachDebugger = async (tabId: number): Promise<void> => {
        if (!debuggerAttached.has(tabId)) {
            return;
        }

        try {
            await chrome.debugger.detach({ tabId });
            debuggerAttached.delete(tabId);
            debuggerRequests.delete(tabId);
            console.debug(`[OData Inspector] Debugger detached from tab ${tabId}`);
        } catch (error) {
            console.debug(`[OData Inspector] Error detaching debugger:`, error);
        }
    };

    /**
     * Get response body for a request
     */
    const getResponseBody = async (tabId: number, requestId: string): Promise<{ body: string; base64Encoded: boolean } | null> => {
        try {
            const result = await chrome.debugger.sendCommand(
                { tabId },
                'Network.getResponseBody',
                { requestId }
            ) as { body: string; base64Encoded: boolean };
            return result;
        } catch (error) {
            // Response body may not be available for some requests
            return null;
        }
    };

    /**
     * Handle debugger events
     */
    chrome.debugger.onEvent.addListener((source, method, params) => {
        const tabId = source.tabId;
        if (!tabId || !debuggerAttached.has(tabId)) return;

        const port = connections.get(tabId);
        if (!port) return;

        const tabRequests = debuggerRequests.get(tabId);
        if (!tabRequests) return;

        // Type assertions for debugger params
        const p = params as Record<string, unknown>;

        if (method === 'Network.requestWillBeSent') {
            const request = p.request as { url: string; method: string; headers: Record<string, string>; postData?: string };
            const url = request.url;

            if (!isODataUrl(url)) return;

            const requestId = p.requestId as string;

            // Store request data
            tabRequests.set(requestId, {
                requestId,
                url,
                method: request.method,
                headers: request.headers,
                postData: request.postData,
                timestamp: Date.now(),
            });

            // Notify panel about request start
            port.postMessage({
                type: 'debugger-request-started',
                data: {
                    requestId,
                    url,
                    method: request.method,
                    headers: request.headers,
                    postData: request.postData,
                    entitySet: extractEntitySet(url),
                    requestType: getRequestType(url),
                    timestamp: Date.now(),
                },
            });
        } else if (method === 'Network.responseReceived') {
            const requestId = p.requestId as string;
            const storedRequest = tabRequests.get(requestId);

            if (!storedRequest) return;

            const response = p.response as {
                url: string;
                status: number;
                statusText: string;
                headers: Record<string, string>;
                mimeType: string;
            };

            // Notify panel about response headers
            port.postMessage({
                type: 'debugger-response-received',
                data: {
                    requestId,
                    statusCode: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    mimeType: response.mimeType,
                },
            });
        } else if (method === 'Network.loadingFinished') {
            const requestId = p.requestId as string;
            const storedRequest = tabRequests.get(requestId);

            if (!storedRequest) return;

            const duration = Date.now() - storedRequest.timestamp;

            // Get response body and send complete data
            getResponseBody(tabId, requestId).then((responseBody) => {
                let body: string | null = null;
                if (responseBody) {
                    body = responseBody.base64Encoded
                        ? atob(responseBody.body)
                        : responseBody.body;
                }

                port.postMessage({
                    type: 'debugger-request-complete',
                    data: {
                        requestId,
                        duration,
                        responseBody: body,
                    },
                });

                tabRequests.delete(requestId);
            });
        } else if (method === 'Network.loadingFailed') {
            const requestId = p.requestId as string;
            const storedRequest = tabRequests.get(requestId);

            if (!storedRequest) return;

            const duration = Date.now() - storedRequest.timestamp;

            port.postMessage({
                type: 'debugger-request-failed',
                data: {
                    requestId,
                    duration,
                    errorText: (p.errorText as string) || 'Unknown error',
                },
            });

            tabRequests.delete(requestId);
        }
    });

    /**
     * Handle debugger detach (e.g., when user closes the banner)
     */
    chrome.debugger.onDetach.addListener((source) => {
        const tabId = source.tabId;
        if (tabId) {
            debuggerAttached.delete(tabId);
            debuggerRequests.delete(tabId);
            console.debug(`[OData Inspector] Debugger was detached from tab ${tabId}`);

            // Notify the panel that debugger was detached
            const port = connections.get(tabId);
            if (port) {
                port.postMessage({ type: 'debugger-detached' });
            }
        }
    });

    // =========================================================================
    // Panel Connection Handler
    // =========================================================================

    chrome.runtime.onConnect.addListener((port) => {
        if (port.name !== 'odata-inspector') {
            return;
        }

        console.debug('[OData Inspector] Panel connected');

        let tabId: number | null = null;
        let isStandalone = false;

        port.onMessage.addListener(async (message: { type: string; tabId?: number; standalone?: boolean }) => {
            if (message.type === 'init' && typeof message.tabId === 'number') {
                tabId = message.tabId;
                isStandalone = message.standalone === true;
                connections.set(tabId, port);

                if (isStandalone) {
                    standaloneConnections.add(tabId);
                    // Attach debugger for full network capture
                    const attached = await attachDebugger(tabId);
                    if (attached) {
                        port.postMessage({ type: 'debugger-attached' });
                    } else {
                        port.postMessage({ type: 'debugger-attach-failed' });
                    }
                }

                console.debug(`[OData Inspector] Panel registered for tab ${tabId} (standalone: ${isStandalone})`);
            }
        });

        port.onDisconnect.addListener(() => {
            if (tabId !== null) {
                connections.delete(tabId);

                // Detach debugger if this was a standalone connection
                if (standaloneConnections.has(tabId)) {
                    standaloneConnections.delete(tabId);
                    detachDebugger(tabId);
                }

                console.debug(`[OData Inspector] Panel disconnected for tab ${tabId}`);
            }
        });
    });

    // =========================================================================
    // webRequest API (for DevTools mode - basic tracking)
    // =========================================================================

    chrome.webRequest.onBeforeRequest.addListener(
        (details): undefined => {
            if (!isODataUrl(details.url)) return undefined;

            const tabId = details.tabId;
            if (tabId === -1) return undefined;

            // Skip if debugger is handling this tab (standalone mode)
            if (debuggerAttached.has(tabId)) return undefined;

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

            // Skip if debugger is handling this tab
            if (debuggerAttached.has(tabId)) return;

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

            // Skip if debugger is handling this tab
            if (debuggerAttached.has(tabId)) return;

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
        standaloneConnections.delete(tabId);

        if (debuggerAttached.has(tabId)) {
            debuggerAttached.delete(tabId);
            debuggerRequests.delete(tabId);
        }
    });
});
