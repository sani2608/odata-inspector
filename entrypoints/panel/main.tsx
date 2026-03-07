/**
 * Panel Entry Point
 *
 * React entry point for the OData Inspector DevTools panel.
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
