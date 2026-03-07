/**
 * Header Component
 *
 * Main header bar for the OData Inspector panel.
 * Contains title, context indicator, request count, and action buttons.
 *
 * ★ Insight ─────────────────────────────────────
 * - Uses uiStore for theme management (persisted across sessions)
 * - Uses requestStore for request count display
 * - Theme toggle affects the entire app via CSS variables
 * - Metadata button shows when metadata is available
 * ─────────────────────────────────────────────────
 */

import { FileCode2, Moon, Sun, Wrench } from 'lucide-react';
import { useBuilderStore } from '../../stores/builderStore';
import { useHasMetadata } from '../../stores/metadataStore';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface HeaderProps {
    /** Whether running in DevTools context */
    isDevTools: boolean;
}

/**
 * Elegant toolbar button with gradient background and glow effect
 */
function ToolbarButton({
    onClick,
    icon: Icon,
    label,
    color,
    ariaLabel,
    disabled = false,
    title
}: {
    onClick: () => void;
    icon: React.ElementType;
    label?: string;
    color: 'blue' | 'green' | 'neutral';
    ariaLabel: string;
    disabled?: boolean;
    title?: string;
}) {
    const colorClasses = {
        blue: 'from-[var(--accent-blue)]/20 to-[var(--accent-blue)]/5 hover:from-[var(--accent-blue)]/30 hover:to-[var(--accent-blue)]/10 text-[var(--accent-blue-light)] hover:shadow-[var(--shadow-glow-blue)]',
        green: 'from-[var(--accent-green)]/20 to-[var(--accent-green)]/5 hover:from-[var(--accent-green)]/30 hover:to-[var(--accent-green)]/10 text-[var(--accent-green-light)] hover:shadow-[var(--shadow-glow-green)]',
        neutral: 'from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    };

    const disabledClasses = 'opacity-40 cursor-not-allowed hover:scale-100 active:scale-100';

    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            aria-label={ariaLabel}
            aria-disabled={disabled}
            title={title}
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'bg-gradient-to-r backdrop-blur-sm',
                'border border-white/10',
                'text-xs font-medium cursor-pointer',
                'transition-all duration-300 ease-out',
                disabled ? disabledClasses : 'hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]',
                disabled ? 'from-white/5 to-white/5 text-[var(--text-muted)]' : colorClasses[color],
                !label && 'px-2'
            )}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label && <span>{label}</span>}
        </button>
    );
}

export function Header({ isDevTools }: HeaderProps) {
    const { theme, toggleTheme, toggleMetadataPanel } = useUIStore();
    const { open: openBuilder } = useBuilderStore();
    const hasMetadata = useHasMetadata();

    return (
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] shrink-0 shadow-lg shadow-black/10">
            {/* Left: Title and context badge */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)] animate-pulse" />
                    <h1 className="text-sm font-bold text-[var(--accent-blue)]">
                        OData Inspector
                    </h1>
                </div>
                {isDevTools && (
                    <Badge variant="primary" aria-label="Running in DevTools mode">
                        DevTools
                    </Badge>
                )}
            </div>

            {/* Right: Actions */}
            <nav className="flex items-center gap-2" aria-label="Main actions">
                {hasMetadata && (
                    <ToolbarButton
                        onClick={toggleMetadataPanel}
                        icon={FileCode2}
                        label="Metadata"
                        color="blue"
                        ariaLabel="View service metadata"
                    />
                )}

                {hasMetadata && (
                    <ToolbarButton
                        onClick={openBuilder}
                        icon={Wrench}
                        label="Builder"
                        color="green"
                        ariaLabel="Open OData request builder"
                    />
                )}

                {/* Theme toggle */}
                <ToolbarButton
                    onClick={toggleTheme}
                    icon={theme === 'dark' ? Sun : Moon}
                    color="neutral"
                    ariaLabel={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                />
            </nav>
        </header>
    );
}

export default Header;
