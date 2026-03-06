# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OData Inspector is a browser DevTools extension for debugging OData/SAP requests. Built with WXT, React, TypeScript, Tailwind CSS, and Zustand.

## Commands

```bash
# Development with hot reload
npm run dev              # Chrome
npm run dev:firefox      # Firefox

# Production build
npm run build            # Chrome
npm run build:firefox    # Firefox

# Package for distribution
npm run zip              # Chrome
npm run zip:firefox      # Firefox

# Type checking
npm run compile

# Linting (Biome)
npm run lint             # Check only
npm run lint:fix         # Auto-fix issues
npm run format           # Format code

# Testing (Vitest)
npm run test             # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## Architecture

### Extension Entrypoints

- **`entrypoints/background.ts`** - Service worker that:
  - Intercepts network requests via `chrome.webRequest` API
  - Detects OData patterns (`$batch`, `$metadata`, `/sap/opu/odata/`)
  - Maintains port connections with DevTools panels per tab
  - Opens standalone window when toolbar icon clicked

- **`entrypoints/devtools/main.ts`** - Creates "OData Inspector" panel in Chrome DevTools via `chrome.devtools.panels.create()`

- **`entrypoints/panel/`** - React app that runs in both:
  1. DevTools panel (F12 → OData Inspector tab)
  2. Standalone popup window (toolbar icon click)

### Communication Flow

```
Browser Tab → webRequest API → Background Worker → Port Message → DevTools Panel
```

The background worker maintains a `Map<tabId, Connection>` to route captured requests to the correct panel instance.

### State Management

Zustand stores in `src/stores/` with custom selector hooks:

- **requestStore** - Captured requests, selection state, search filtering
- **metadataStore** - Parsed OData service metadata
- **builderStore** - Request builder state (entity/function mode, filters, expands)
- **uiStore** - Theme, panel visibility

Pattern: Each store exports custom hooks like `useSelectedRequest()`, `useFilteredRequests()` that derive state.

### OData Services

`src/services/odata/`:
- **batchParser** - Parses multipart `$batch` request/response bodies
- **metadataParser** - Parses EDMX XML into TypeScript structures
- **urlGenerator** - Builds OData URLs from builder state
- **requestExecutor** - Executes requests via Chrome DevTools API

## Key Patterns

- **Path alias**: `@/` maps to `./src` (for shadcn/ui components and imports)
- **Manifest generation**: WXT auto-generates from `wxt.config.ts` + entrypoint definitions
- **UI components**: Radix UI primitives wrapped as shadcn/ui in `src/components/ui/`
- **Theming**: CSS variables in `src/styles/globals.css`, toggle via `data-theme` attribute
- **Code style**: Biome with 4-space indent, single quotes, semicolons, 120 char line width

## Build Output

- `.output/chrome-mv3/` - Chrome production build
- `.output/chrome-mv3-dev/` - Chrome development build
- `.wxt/` - WXT generated types (gitignored)
