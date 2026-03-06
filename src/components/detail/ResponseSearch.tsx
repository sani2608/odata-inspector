/**
 * ResponseSearch Component
 *
 * Search bar for finding content within JSON/XML responses.
 *
 * ★ Insight ─────────────────────────────────────
 * - Debounced search input to prevent excessive re-renders
 * - Shows match count and current match index
 * - Prev/Next navigation through matches
 * - Clear button to reset search
 * ─────────────────────────────────────────────────
 */

import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ResponseSearchProps {
    onSearch: (query: string) => void;
    matchCount: number;
    currentMatch: number;
    onPrevMatch: () => void;
    onNextMatch: () => void;
    className?: string;
}

/**
 * Debounce utility
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export function ResponseSearch({
    onSearch,
    matchCount,
    currentMatch,
    onPrevMatch,
    onNextMatch,
    className
}: ResponseSearchProps) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);
    const inputRef = useRef<HTMLInputElement>(null);

    // Trigger search when debounced query changes
    useEffect(() => {
        onSearch(debouncedQuery);
    }, [debouncedQuery, onSearch]);

    const handleClear = useCallback(() => {
        setQuery('');
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    onPrevMatch();
                } else {
                    onNextMatch();
                }
            } else if (e.key === 'Escape') {
                handleClear();
            }
        },
        [onNextMatch, onPrevMatch, handleClear]
    );

    const hasMatches = matchCount > 0;
    const hasQuery = query.trim().length > 0;

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search in response..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-7 pl-8 pr-8 text-xs"
                />
                {hasQuery && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-foreground-muted hover:text-foreground-primary"
                        title="Clear search (Esc)"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Match info */}
            {hasQuery && (
                <span
                    className={cn(
                        'text-xs min-w-[60px] text-center',
                        hasMatches ? 'text-foreground-secondary' : 'text-accent-red'
                    )}
                >
                    {hasMatches ? `${currentMatch} of ${matchCount}` : 'No matches'}
                </span>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onPrevMatch}
                    disabled={!hasMatches}
                    title="Previous match (Shift+Enter)"
                >
                    <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onNextMatch}
                    disabled={!hasMatches}
                    title="Next match (Enter)"
                >
                    <ChevronDown className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

export default ResponseSearch;
