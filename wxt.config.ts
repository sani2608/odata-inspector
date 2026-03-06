import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * WXT Configuration for OData Inspector
 *
 * ★ Insight ─────────────────────────────────────
 * - WXT auto-generates manifest.json from this config + entrypoints
 * - DevTools panel requires: devtools_page in manifest
 * - Network request capture requires: webRequest, webRequestBlocking permissions
 * - The extension runs in two contexts: DevTools panel and standalone window
 * ─────────────────────────────────────────────────
 *
 * @see https://wxt.dev/api/config.html
 */
export default defineConfig({
    modules: ['@wxt-dev/module-react'],

    manifest: {
        name: 'OData Inspector',
        description: 'Debug and analyze OData/SAP requests in Chrome DevTools',
        version: '2.0.0',

        // Required permissions for network interception
        // 'debugger' permission allows standalone window to capture full request/response data
        permissions: ['webRequest', 'storage', 'tabs', 'scripting', 'debugger'],

        // Host permissions for intercepting requests
        host_permissions: ['<all_urls>'],

        // DevTools page - creates the panel
        devtools_page: 'devtools.html',

        // Action (toolbar icon) configuration
        action: {
            default_title: 'OData Inspector',
            default_icon: {
                16: 'icon/16.png',
                32: 'icon/32.png',
                48: 'icon/48.png',
                128: 'icon/128.png',
            },
        },

        // Extension icons
        icons: {
            16: 'icon/16.png',
            32: 'icon/32.png',
            48: 'icon/48.png',
            96: 'icon/96.png',
            128: 'icon/128.png',
        },
    },

    // Build configuration
    vite: () => ({
        // Enable source maps for debugging
        build: {
            sourcemap: process.env.NODE_ENV === 'development',
        },
        // Path aliases for shadcn/ui
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
    }),
});
