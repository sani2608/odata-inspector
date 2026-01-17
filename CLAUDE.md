# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OData Inspector is a browser extension built with WXT (Web Extension Toolkit) and React. It targets Chrome (Manifest V3) and Firefox.

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
```

## Architecture

This is a WXT browser extension with three entrypoints:

- **`entrypoints/background.ts`** - Service worker for background tasks. Uses `defineBackground()` from WXT.
- **`entrypoints/content.ts`** - Content script injected into pages. Uses `defineContentScript()` with URL match patterns.
- **`entrypoints/popup/`** - React-based popup UI rendered when clicking the extension icon.

WXT auto-generates the manifest from entrypoint definitions. The `matches` array in content scripts and entrypoint file names determine manifest configuration.

## Key Patterns

- Import assets with `@/assets/` alias (maps to `/assets` directory)
- Static files in `/public` are served at root path
- WXT globals (`defineBackground`, `defineContentScript`, `browser`) are auto-imported
- Cross-browser API: use `browser.*` (WXT polyfills for Chrome's `chrome.*` API)

## Build Output

- `.output/chrome-mv3/` - Chrome production build
- `.output/chrome-mv3-dev/` - Chrome development build
- `.wxt/` - WXT generated types and config (gitignored)
