/**
 * DevTools Entry Point
 *
 * This script runs in the DevTools page context and creates
 * the OData Inspector panel in Chrome DevTools.
 *
 * ★ Insight ─────────────────────────────────────
 * - DevTools extensions have a special lifecycle: this script runs
 *   when DevTools opens, not when the page loads
 * - The panel HTML/JS only loads when the user clicks on the panel tab
 * - We use chrome.devtools.panels.create() to register our panel
 * ─────────────────────────────────────────────────
 */

// Create the OData Inspector panel in DevTools
chrome.devtools.panels.create(
    'OData Inspector', // Panel title
    '/icon/32.png', // Panel icon (relative to extension root)
    '/panel.html', // Panel HTML page
    (panel) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to create DevTools panel:', chrome.runtime.lastError);
            return;
        }

        console.debug('[OData Inspector] DevTools panel created');

        // Panel lifecycle events
        panel.onShown.addListener((panelWindow) => {
            console.debug('[OData Inspector] Panel shown');
            // The panelWindow is the panel's window object
            // We can use this to communicate with the panel
        });

        panel.onHidden.addListener(() => {
            console.debug('[OData Inspector] Panel hidden');
        });
    }
);

// Log when DevTools page loads
console.debug('[OData Inspector] DevTools page loaded for tab:', chrome.devtools.inspectedWindow.tabId);
