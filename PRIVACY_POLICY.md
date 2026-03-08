# Privacy Policy - OData Inspector

**Last updated: March 7, 2026**

## Overview

OData Inspector is a browser DevTools extension for debugging OData and SAP requests. Your privacy is important to us.

## Data Collection

OData Inspector does **not** collect, store, transmit, or share any user data. Specifically:

- **No personal information** is collected
- **No browsing history** is tracked or stored outside your browser
- **No analytics or telemetry** data is sent to any server
- **No cookies** are set by the extension
- **No data** is transmitted to external servers or third parties

## How the Extension Works

OData Inspector operates entirely within your browser's DevTools environment. It uses the Chrome `webRequest` API solely to observe OData-related network requests in the currently inspected tab. All captured request data is:

- Processed locally in your browser
- Stored only in memory for the duration of the DevTools session
- Discarded when the DevTools panel is closed

## Permissions

The extension requires the following permissions:

- **`webRequest`** - To observe network requests and identify OData traffic. No requests are modified or blocked.
- **`devtools`** - To create the OData Inspector panel within Chrome DevTools.

These permissions are used exclusively for local debugging functionality.

## Third-Party Services

OData Inspector does not integrate with or send data to any third-party services, APIs, or analytics platforms.

## Changes to This Policy

If this privacy policy changes, updates will be posted in this repository.

## Contact

For questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/sani2608/odata-inspector/issues).
