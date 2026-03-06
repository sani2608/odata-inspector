/**
 * Chrome Extension API Type Helpers
 *
 * These types extend or complement the chrome.* types
 * for better type safety in the extension context.
 */

/**
 * Initiator info from Chrome DevTools
 */
export interface HarInitiator {
    type: 'script' | 'parser' | 'other';
    url?: string;
    lineNumber?: number;
    stack?: {
        callFrames: Array<{
            functionName?: string;
            url?: string;
            lineNumber?: number;
            columnNumber?: number;
        }>;
    };
}

/**
 * HAR Entry from chrome.devtools.network.onRequestFinished
 */
export interface HarEntry {
    request: HarRequest;
    response: HarResponse;
    startedDateTime: string;
    time: number;
    timings: HarTimings;
    getContent: (callback: (content: string, encoding: string) => void) => void;
    /** Chrome-specific: Request initiator info (not in HAR spec) */
    _initiator?: HarInitiator;
}

export interface HarRequest {
    method: string;
    url: string;
    httpVersion: string;
    headers: HarHeader[];
    queryString: HarQueryParam[];
    cookies: HarCookie[];
    headersSize: number;
    bodySize: number;
    postData?: HarPostData;
}

export interface HarResponse {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: HarHeader[];
    cookies: HarCookie[];
    content: HarContent;
    redirectURL: string;
    headersSize: number;
    bodySize: number;
}

export interface HarHeader {
    name: string;
    value: string;
}

export interface HarQueryParam {
    name: string;
    value: string;
}

export interface HarCookie {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    expires?: string;
    httpOnly?: boolean;
    secure?: boolean;
}

export interface HarPostData {
    mimeType: string;
    text?: string;
    params?: HarParam[];
}

export interface HarParam {
    name: string;
    value?: string;
    fileName?: string;
    contentType?: string;
}

export interface HarContent {
    size: number;
    compression?: number;
    mimeType: string;
    text?: string;
    encoding?: string;
}

export interface HarTimings {
    blocked?: number;
    dns?: number;
    connect?: number;
    ssl?: number;
    send?: number;
    wait?: number;
    receive?: number;
}

/**
 * Message types for communication between extension parts
 */
export type BackgroundMessageType =
    | 'init'
    | 'request-started'
    | 'request-completed'
    | 'request-error'
    | 'clear-requests'
    | 'get-metadata';

export interface BackgroundMessage {
    type: BackgroundMessageType;
    tabId?: number;
    data?: unknown;
}

/**
 * Request started message from background
 */
export interface RequestStartedMessage {
    type: 'request-started';
    data: {
        requestId: string;
        url: string;
        method: string;
        entitySet?: string;
        timestamp: number;
        type: string;
    };
}

/**
 * Request completed message from background
 */
export interface RequestCompletedMessage {
    type: 'request-completed';
    data: {
        requestId: string;
        statusCode: number;
        duration: number;
    };
}

/**
 * Request error message from background
 */
export interface RequestErrorMessage {
    type: 'request-error';
    data: {
        requestId: string;
        error: string;
        duration: number;
    };
}

/**
 * Panel window interface for communication with devtools.js
 */
export interface PanelWindow extends Window {
    addODataRequest: (request: import('./odata').ODataRequest) => void;
    updatePendingRequest: (requestId: string, updates: Partial<import('./odata').ODataRequest>) => void;
    setMetadata: (metadata: import('./odata').ODataMetadata) => void;
    clearRequests: () => void;
}

/**
 * DevTools panel creation options
 */
export interface DevToolsPanelOptions {
    title: string;
    iconPath: string;
    pagePath: string;
}
