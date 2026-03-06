/**
 * UI Store
 *
 * Zustand store for managing UI state like theme, panel widths, etc.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PANEL_DEFAULTS, STORAGE_KEYS } from '../constants';
import type { Theme } from '../types';

interface UIState {
    // Theme
    theme: Theme;

    // Panel state
    detailPanelWidth: number;
    metadataPanelOpen: boolean;
    requestBuilderOpen: boolean;

    // Collapsed sections (stored as Set<string>)
    collapsedSections: string[];

    // Actions
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    setDetailPanelWidth: (width: number) => void;
    toggleMetadataPanel: () => void;
    toggleRequestBuilder: () => void;
    toggleSection: (sectionId: string) => void;
    isSectionCollapsed: (sectionId: string) => boolean;
}

export const useUIStore = create<UIState>()(
    persist(
        (set, get) => ({
            // Initial state
            theme: 'dark',
            detailPanelWidth: PANEL_DEFAULTS.DEFAULT_WIDTH,
            metadataPanelOpen: false,
            requestBuilderOpen: false,
            collapsedSections: [],

            // Theme actions
            setTheme: (theme) => {
                set({ theme });
                // Apply theme to document
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'light') {
                    document.documentElement.classList.add('light-theme');
                } else {
                    document.documentElement.classList.remove('light-theme');
                }
            },

            toggleTheme: () => {
                const newTheme = get().theme === 'dark' ? 'light' : 'dark';
                get().setTheme(newTheme);
            },

            // Panel actions
            setDetailPanelWidth: (width) => {
                const clampedWidth = Math.max(PANEL_DEFAULTS.MIN_WIDTH, Math.min(width, PANEL_DEFAULTS.MAX_WIDTH));
                set({ detailPanelWidth: clampedWidth });
            },

            toggleMetadataPanel: () => {
                set((state) => ({
                    metadataPanelOpen: !state.metadataPanelOpen,
                    requestBuilderOpen: false // Close other overlay
                }));
            },

            toggleRequestBuilder: () => {
                set((state) => ({
                    requestBuilderOpen: !state.requestBuilderOpen,
                    metadataPanelOpen: false // Close other overlay
                }));
            },

            // Section collapse actions
            toggleSection: (sectionId) => {
                set((state) => {
                    const isCollapsed = state.collapsedSections.includes(sectionId);
                    return {
                        collapsedSections: isCollapsed
                            ? state.collapsedSections.filter((id) => id !== sectionId)
                            : [...state.collapsedSections, sectionId]
                    };
                });
            },

            isSectionCollapsed: (sectionId) => {
                return get().collapsedSections.includes(sectionId);
            }
        }),
        {
            name: STORAGE_KEYS.THEME,
            partialize: (state) => ({
                theme: state.theme,
                detailPanelWidth: state.detailPanelWidth,
                collapsedSections: state.collapsedSections
            })
        }
    )
);
