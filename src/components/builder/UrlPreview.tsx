/**
 * UrlPreview Component
 *
 * Displays the generated OData URL with copy functionality.
 */

import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '../../lib/utils';
import { generateODataUrl } from '../../services/odata/urlGenerator';
import { useBuilderStore } from '../../stores/builderStore';
import { useMetadataStore } from '../../stores/metadataStore';
import { Button } from '../ui/button';

export function UrlPreview() {
    const [copied, setCopied] = useState(false);
    const { metadata } = useMetadataStore();
    const builderState = useBuilderStore();

    // Generate URL from current state
    const url = generateODataUrl(
        {
            mode: builderState.mode,
            entitySet: builderState.entitySet || null,
            entityType: builderState.entityType,
            select: builderState.select,
            expand: builderState.expand,
            filters: builderState.filters,
            orderby: builderState.orderby.field ? builderState.orderby : null,
            top: builderState.top,
            skip: builderState.skip,
            functionImport: builderState.functionImport,
            functionParams: builderState.functionParams
        },
        metadata
    );

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    }, [url]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                    Generated URL
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-xs">
                    {copied ? (
                        <>
                            <Check className="h-3 w-3 mr-1 text-accent-green" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                        </>
                    )}
                </Button>
            </div>

            <div
                className={cn(
                    'p-3 bg-background-tertiary rounded border border-border-subtle',
                    'font-mono text-xs text-foreground-secondary',
                    'break-all overflow-x-auto max-h-[100px] overflow-y-auto'
                )}
            >
                {url || '/'}
            </div>
        </div>
    );
}

export default UrlPreview;
