/**
 * Panel Entry Point
 *
 * This is the React entry point for the OData Inspector panel.
 * It renders the main App component into the DOM.
 *
 * ★ Insight ─────────────────────────────────────
 * - This panel can run in two contexts:
 *   1. As a DevTools panel (accessed via F12)
 *   2. As a standalone window (via toolbar icon)
 * - The same React app serves both use cases
 * - Context detection happens in App.tsx for adapting behavior
 * ─────────────────────────────────────────────────
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../src/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
