/**
 * OData Inspector Panel App
 *
 * Main application component for the OData Inspector.
 * This component serves as the root of the React component tree.
 *
 * ★ Insight ─────────────────────────────────────
 * - The App component is now a thin wrapper around PanelLayout
 * - All state management moved to Zustand stores
 * - Layout logic encapsulated in PanelLayout component
 * - This simplifies the entry point and improves maintainability
 * ─────────────────────────────────────────────────
 */

import { PanelLayout } from '../../src/components/layout';

/**
 * Main App Component
 */
export default function App() {
    return <PanelLayout />;
}
