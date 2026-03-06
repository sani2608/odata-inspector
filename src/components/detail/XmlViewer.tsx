/**
 * XmlViewer Component
 *
 * Displays XML data with syntax highlighting.
 *
 * ★ Insight ─────────────────────────────────────
 * - Uses manual HTML generation with dangerouslySetInnerHTML for syntax highlighting
 * - Escapes all user content before inserting into HTML
 * - Supports search highlighting via searchTerm prop
 * ─────────────────────────────────────────────────
 */

import { Check, Copy } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import { escapeHtml, escapeRegex } from '../../utils/escape';

interface XmlViewerProps {
    xml: string;
    className?: string;
    searchTerm?: string;
}

export interface XmlViewerHandle {
    getMatchCount: () => number;
    scrollToMatch: (index: number) => void;
}

/**
 * Format XML with proper indentation
 */
function formatXml(xml: string): string {
    if (!xml || typeof xml !== 'string') return '';

    // Remove existing whitespace between tags
    const formatted = xml.replace(/>\s+</g, '><');

    // Add newlines and indentation
    let indent = 0;
    const lines: string[] = [];
    const tagRegex = /<[^>]+>/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(formatted)) !== null) {
        // Add any text before this tag
        const textBefore = formatted.substring(lastIndex, match.index).trim();
        if (textBefore) {
            lines.push('  '.repeat(indent) + textBefore);
        }

        const tag = match[0];
        const isClosing = tag.startsWith('</');
        const isSelfClosing = tag.endsWith('/>') || tag.startsWith('<?');
        const isComment = tag.startsWith('<!--');

        if (isClosing) {
            indent = Math.max(0, indent - 1);
        }

        lines.push('  '.repeat(indent) + tag);

        if (!isClosing && !isSelfClosing && !isComment) {
            indent++;
        }

        lastIndex = match.index + tag.length;
    }

    // Add any remaining text
    const remainingText = formatted.substring(lastIndex).trim();
    if (remainingText) {
        lines.push('  '.repeat(indent) + remainingText);
    }

    return lines.join('\n');
}

/**
 * Highlight a single XML tag with its attributes
 */
function highlightXmlTag(tag: string): string {
    // Closing tag </tagname>
    const closingMatch = tag.match(/^<\/([a-zA-Z][\w:.-]*)>$/);
    if (closingMatch) {
        return `<span class="xml-bracket">&lt;/</span><span class="xml-tag">${escapeHtml(closingMatch[1])}</span><span class="xml-bracket">&gt;</span>`;
    }

    // Opening tag with potential attributes
    const tagMatch = tag.match(/^<([a-zA-Z][\w:.-]*)([\s\S]*?)(\/?>)$/);
    if (!tagMatch) {
        return escapeHtml(tag);
    }

    const tagName = tagMatch[1];
    const attrString = tagMatch[2];
    const closing = tagMatch[3];

    let result = `<span class="xml-bracket">&lt;</span><span class="xml-tag">${escapeHtml(tagName)}</span>`;

    // Parse attributes
    if (attrString.trim()) {
        const attrRegex = /([a-zA-Z][\w:.-]*)\s*=\s*(["'])((?:(?!\2)[\s\S])*)\2/g;
        let attrLastIndex = 0;
        let attrMatch: RegExpExecArray | null;

        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
            // Add whitespace before attribute
            if (attrMatch.index > attrLastIndex) {
                result += escapeHtml(attrString.slice(attrLastIndex, attrMatch.index));
            }

            const attrName = attrMatch[1];
            const quote = attrMatch[2];
            const attrValue = attrMatch[3];

            result += `<span class="xml-attr-name">${escapeHtml(attrName)}</span>=<span class="xml-attr-value">${escapeHtml(quote)}${escapeHtml(attrValue)}${escapeHtml(quote)}</span>`;
            attrLastIndex = attrMatch.index + attrMatch[0].length;
        }

        // Add remaining whitespace
        if (attrLastIndex < attrString.length) {
            result += escapeHtml(attrString.slice(attrLastIndex));
        }
    }

    // Closing bracket
    if (closing === '/>') {
        result += `<span class="xml-bracket">/&gt;</span>`;
    } else {
        result += `<span class="xml-bracket">&gt;</span>`;
    }

    return result;
}

/**
 * Apply syntax highlighting to XML string
 */
function highlightXmlSyntax(xmlString: string): string {
    let result = '';
    let i = 0;

    while (i < xmlString.length) {
        // XML declaration <?xml ... ?>
        if (xmlString.slice(i, i + 5) === '<?xml') {
            const end = xmlString.indexOf('?>', i);
            if (end !== -1) {
                const decl = xmlString.slice(i, end + 2);
                result += `<span class="xml-declaration">${escapeHtml(decl)}</span>`;
                i = end + 2;
                continue;
            }
        }

        // Comments <!-- ... -->
        if (xmlString.slice(i, i + 4) === '<!--') {
            const end = xmlString.indexOf('-->', i);
            if (end !== -1) {
                const comment = xmlString.slice(i, end + 3);
                result += `<span class="xml-comment">${escapeHtml(comment)}</span>`;
                i = end + 3;
                continue;
            }
        }

        // Tags < ... >
        if (xmlString[i] === '<') {
            const end = xmlString.indexOf('>', i);
            if (end !== -1) {
                const tag = xmlString.slice(i, end + 1);
                result += highlightXmlTag(tag);
                i = end + 1;
                continue;
            }
        }

        // Regular text content
        let nextTag = xmlString.indexOf('<', i);
        if (nextTag === -1) nextTag = xmlString.length;
        const text = xmlString.slice(i, nextTag);
        result += escapeHtml(text);
        i = nextTag;
    }

    return result;
}

/**
 * Apply search highlighting on top of syntax highlighting
 */
function applySearchHighlighting(html: string, searchTerm: string): string {
    if (!searchTerm?.trim()) return html;

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');

    // Only highlight text content, not HTML tags
    return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
        if (tag) return tag; // Don't modify HTML tags
        if (text) return text.replace(regex, '<mark class="xml-search-highlight">$1</mark>');
        return match;
    });
}

export const XmlViewer = forwardRef<XmlViewerHandle, XmlViewerProps>(({ xml, className = '', searchTerm }, ref) => {
    const [copied, setCopied] = useState(false);
    const containerRef = useRef<HTMLPreElement>(null);

    // Format and highlight XML
    const { formattedXml, highlightedHtml, matchCount } = useMemo(() => {
        if (!xml || typeof xml !== 'string') {
            return { formattedXml: '', highlightedHtml: '', matchCount: 0 };
        }

        const formatted = formatXml(xml);
        let highlighted = highlightXmlSyntax(formatted);

        let count = 0;
        if (searchTerm?.trim()) {
            const regex = new RegExp(escapeRegex(searchTerm), 'gi');
            const matches = formatted.match(regex);
            count = matches ? matches.length : 0;
            highlighted = applySearchHighlighting(highlighted, searchTerm);
        }

        return { formattedXml: formatted, highlightedHtml: highlighted, matchCount: count };
    }, [xml, searchTerm]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        getMatchCount: () => matchCount,
        scrollToMatch: (index: number) => {
            if (!containerRef.current) return;
            const highlights = containerRef.current.querySelectorAll('.xml-search-highlight');
            if (highlights[index]) {
                // Remove current class from all
                highlights.forEach((el) => el.classList.remove('xml-search-current'));
                // Add to target
                highlights[index].classList.add('xml-search-current');
                highlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }));

    // Scroll to first match when search changes
    useEffect(() => {
        if (matchCount > 0 && containerRef.current) {
            const firstMatch = containerRef.current.querySelector('.xml-search-highlight');
            if (firstMatch) {
                firstMatch.classList.add('xml-search-current');
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [matchCount]);

    const handleCopy = useCallback(async () => {
        try {
            await copyToClipboard(formattedXml);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Copy failed silently
        }
    }, [formattedXml]);

    if (!xml || typeof xml !== 'string') {
        return <div className="p-4 text-xs text-foreground-muted italic">No XML data</div>;
    }

    return (
        <div className={`relative ${className}`}>
            {/* Copy button */}
            <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 z-10 p-1.5 bg-background-tertiary hover:bg-background-hover border border-border rounded text-foreground-secondary hover:text-foreground-primary transition-colors"
                title="Copy XML"
            >
                {copied ? <Check className="h-3.5 w-3.5 text-accent-green" /> : <Copy className="h-3.5 w-3.5" />}
            </button>

            {/* XML Content */}
            <pre
                ref={containerRef}
                className="p-4 text-xs font-mono overflow-auto xml-content xml-highlighted"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: XML is escaped before insertion
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
        </div>
    );
});

XmlViewer.displayName = 'XmlViewer';

export default XmlViewer;
