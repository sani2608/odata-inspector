/**
 * JSX Custom Element Declarations
 *
 * Extends React's JSX.IntrinsicElements to support custom web components.
 */

import type * as React from 'react';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'json-viewer': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & {
                    data?: unknown;
                },
                HTMLElement
            >;
        }
    }
}
