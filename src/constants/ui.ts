/**
 * UI Constants
 *
 * Theme settings, storage keys, panel defaults, and timing constants.
 */

import type { Theme } from '../types';

/**
 * UI Theme Names
 */
export const THEMES: Record<string, Theme> = {
    DARK: 'dark',
    LIGHT: 'light'
} as const;

/**
 * Storage Keys for persisted state
 */
export const STORAGE_KEYS = {
    THEME: 'odata-inspector-theme',
    PANEL_WIDTH: 'odata-inspector-panel-width',
    COLLAPSED_SECTIONS: 'odata-inspector-collapsed',
    RECENT_REQUESTS: 'odata-inspector-recent'
} as const;

/**
 * Duration Thresholds (milliseconds)
 */
export const DURATION_THRESHOLDS = {
    FAST: 200, // < 200ms = fast
    MEDIUM: 1000 // 200-1000ms = medium, > 1000ms = slow
} as const;

/**
 * Get duration classification
 */
export const getDurationClass = (duration: number): 'fast' | 'medium' | 'slow' => {
    if (duration < DURATION_THRESHOLDS.FAST) return 'fast';
    if (duration <= DURATION_THRESHOLDS.MEDIUM) return 'medium';
    return 'slow';
};

/**
 * Get duration color class for styling
 */
export const getDurationColor = (duration: number): string => {
    const classification = getDurationClass(duration);
    const colors: Record<string, string> = {
        fast: 'text-accent-green',
        medium: 'text-accent-yellow',
        slow: 'text-accent-red'
    };
    return colors[classification];
};

/**
 * Debounce Delays (milliseconds)
 */
export const DEBOUNCE_DELAYS = {
    SEARCH: 300,
    RESIZE: 100,
    SCROLL: 50,
    FILTER: 200
} as const;

/**
 * Panel Defaults
 */
export const PANEL_DEFAULTS = {
    MIN_WIDTH: 200,
    MAX_WIDTH: 600,
    DEFAULT_WIDTH: 350,
    REQUEST_LIST_MIN_WIDTH: 250
} as const;

/**
 * Animation Durations (milliseconds)
 */
export const ANIMATION_DURATIONS = {
    FAST: 150,
    NORMAL: 200,
    SLOW: 300
} as const;

/**
 * Request list virtualization settings
 */
export const VIRTUALIZATION = {
    ITEM_HEIGHT: 44,
    OVERSCAN_COUNT: 5,
    THRESHOLD: 100 // Enable virtualization when list exceeds this
} as const;

/**
 * JSON tree view defaults
 */
export const JSON_TREE_DEFAULTS = {
    MAX_INITIAL_DEPTH: 2,
    MAX_ARRAY_PREVIEW: 3,
    MAX_STRING_PREVIEW: 100,
    COLLAPSE_THRESHOLD: 10 // Collapse arrays/objects with more items
} as const;

/**
 * Keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
    SEARCH: 'mod+f', // Cmd/Ctrl + F
    CLEAR: 'mod+k', // Cmd/Ctrl + K
    CLOSE_PANEL: 'Escape',
    NEXT_REQUEST: 'ArrowDown',
    PREV_REQUEST: 'ArrowUp',
    TOGGLE_THEME: 'mod+shift+t'
} as const;
