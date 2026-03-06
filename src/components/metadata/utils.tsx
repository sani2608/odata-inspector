/**
 * Metadata Component Utilities
 *
 * Shared utilities for metadata card components.
 */

import { escapeHtml, escapeRegex } from '../../utils/escape';

/**
 * Highlight search term in text (returns HTML string)
 */
export function highlightText(text: string, searchTerm: string): string {
    if (!searchTerm?.trim() || !text) {
        return escapeHtml(text || '');
    }

    const escaped = escapeHtml(text);
    const escapedTerm = escapeRegex(searchTerm);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return escaped.replace(regex, '<mark class="bg-accent-yellow text-background-primary rounded px-0.5">$1</mark>');
}

/**
 * Highlighted text component
 */
export function HighlightedText({ text, searchTerm }: { text: string; searchTerm: string }) {
    if (!searchTerm?.trim() || !text) {
        return <span>{text}</span>;
    }

    const parts = text.split(new RegExp(`(${escapeRegex(searchTerm)})`, 'gi'));

    return (
        <span>
            {parts.map((part, index) => {
                const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
                // Using index is necessary here as the same text part can appear multiple times
                const key = `${part}-${index}`;
                return isMatch ? (
                    <mark key={key} className="bg-accent-yellow text-background-primary rounded px-0.5">
                        {part}
                    </mark>
                ) : (
                    <span key={key}>{part}</span>
                );
            })}
        </span>
    );
}
