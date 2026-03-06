/**
 * PanelLayout Component
 *
 * Main layout orchestrator for the OData Inspector panel.
 * Combines Header, RequestListPanel (resizable), and DetailPanel.
 *
 * ★ Insight ─────────────────────────────────────
 * - Three-panel layout: Header (top), RequestList (left), Detail (center)
 * - Left panel is resizable via drag handle
 * - Footer shows version, tab ID, and capture status
 * - Network capture is initialized automatically via useNetworkCapture hook
 * - Layout adapts to both DevTools and standalone window contexts
 * ─────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { PANEL_DEFAULTS } from '../../constants';
import { useNetworkCapture } from '../../hooks';
import { useUIStore } from '../../stores/uiStore';
import { RequestBuilder } from '../builder';
import { MetadataPanel } from '../metadata';
import DetailPanel from './DetailPanel';
import Header from './Header';
import RequestListPanel from './RequestListPanel';
import ResizablePane from './ResizablePane';

export function PanelLayout() {
    // Initialize network capture and get context info
    const { isDevTools, isStandalone, isInitialized, error } = useNetworkCapture();
    const { theme } = useUIStore();

    // Apply theme on mount and when theme changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'light') {
            document.documentElement.classList.add('light-theme');
        } else {
            document.documentElement.classList.remove('light-theme');
        }
    }, [theme]);

    // Get tab ID for display (only in DevTools context)
    const tabId = isDevTools && typeof chrome !== 'undefined' ? chrome.devtools?.inspectedWindow?.tabId : null;

    // Status indicator for footer
    const captureStatus = error
        ? `Error: ${error}`
        : isInitialized
          ? 'Capturing'
          : isDevTools
            ? 'Initializing...'
            : 'Standalone';

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <Header isDevTools={isDevTools} isStandalone={isStandalone} />

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left Panel - Request List (Resizable) */}
                <ResizablePane
                    initialSize={PANEL_DEFAULTS.DEFAULT_WIDTH}
                    minSize={PANEL_DEFAULTS.REQUEST_LIST_MIN_WIDTH}
                    maxSize={PANEL_DEFAULTS.MAX_WIDTH}
                    direction="right"
                    className="border-r border-border"
                >
                    <RequestListPanel />
                </ResizablePane>

                {/* Center Panel - Detail View */}
                <section className="flex-1 overflow-hidden">
                    <DetailPanel />
                </section>
            </main>

            {/* Status Bar / Footer */}
            <footer className="flex items-center justify-between px-4 py-1 text-xs border-t border-border bg-background-secondary text-foreground-muted shrink-0">
                <span>OData Inspector v2.0.0</span>
                <div className="flex items-center gap-4">
                    <span className={error ? 'text-accent-red' : isInitialized ? 'text-accent-green' : ''}>
                        {captureStatus}
                    </span>
                    {tabId && <span>Tab: {tabId}</span>}
                </div>
            </footer>

            {/* Metadata Panel Overlay */}
            <MetadataPanel />

            {/* Request Builder Overlay */}
            <RequestBuilder />
        </div>
    );
}

export default PanelLayout;
