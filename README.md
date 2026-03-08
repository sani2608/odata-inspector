# OData Inspector

A Chrome DevTools extension for debugging and analyzing OData/SAP requests. Built with modern web technologies: WXT, React, TypeScript, Tailwind CSS, and Zustand.

## Features

- **Request Capture** - Automatically captures OData requests in Chrome DevTools
- **Batch Request Parsing** - Parses and displays individual requests within `$batch` operations
- **Metadata Explorer** - Browse service metadata including EntityTypes, EntitySets, ComplexTypes, FunctionImports, and Associations
- **Request Builder** - Visual query builder for constructing OData URLs with:
  - EntitySet selection with field filtering ($select)
  - Navigation property expansion ($expand)
  - Filter builder with operators (eq, ne, gt, ge, lt, le, contains, startswith, endswith)
  - Sorting ($orderby) and pagination ($top, $skip)
  - FunctionImport execution with parameter inputs
- **Response Viewer** - JSON tree view with OData datetime parsing and search
- **Request Details** - View filters, parameters, headers, request/response bodies, and call stack

## Installation

### From Source

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load in Chrome:
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` directory

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run compile

# Lint check
npm run lint

# Lint and fix
npm run lint:fix
```

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | WXT | Extension boilerplate, hot reload, manifest generation |
| UI | React 19 | Component-based UI |
| Types | TypeScript | Type safety for OData structures |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| State | Zustand | Lightweight state management |
| Linting | Biome | Fast linting and formatting |

### Project Structure

```
odata-inspector/
├── entrypoints/
│   ├── devtools/           # DevTools panel creation
│   ├── panel/              # Main panel React app
│   └── background.ts       # Service worker
├── src/
│   ├── components/
│   │   ├── builder/        # Request Builder components
│   │   ├── detail/         # Request detail views
│   │   ├── layout/         # Layout components
│   │   ├── metadata/       # Metadata explorer
│   │   └── ui/             # Reusable UI primitives
│   ├── hooks/              # Custom React hooks
│   ├── services/odata/     # OData parsing utilities
│   ├── stores/             # Zustand state stores
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
└── tests/
    ├── services/           # Service tests
    └── stores/             # Store tests
```

### State Management

The application uses Zustand stores for state management:

- **requestStore** - Captured OData requests and selection state
- **metadataStore** - Parsed OData service metadata
- **builderStore** - Request Builder state (entity/function mode, filters, etc.)
- **uiStore** - UI preferences (theme, panel visibility)

### OData Services

Located in `src/services/odata/`:

- **batchParser** - Parses multipart `$batch` request/response bodies
- **metadataParser** - Parses EDMX metadata XML into TypeScript structures
- **urlGenerator** - Generates OData URLs from builder state
- **requestExecutor** - Executes requests via Chrome DevTools API

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Test coverage includes:
- Batch request/response parsing
- Metadata XML parsing
- URL generation with filters and parameters
- Builder store state management

## Code Style

- **Linter**: Biome (not ESLint)
- **Indent**: 4 spaces
- **Quotes**: Single quotes
- **Semicolons**: Always
- **Line width**: 120 characters

Run `npm run lint:fix` to auto-fix issues.

## Browser Support

- Chrome (Manifest V3)
- Firefox support available via `npm run dev:firefox`

## Privacy Policy

OData Inspector does not collect, store, or transmit any user data. All request data is processed locally in your browser and discarded when DevTools is closed. See the full [Privacy Policy](PRIVACY_POLICY.md).

## License

MIT
