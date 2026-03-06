/**
 * MetadataNav Component
 *
 * Sidebar navigation for metadata sections.
 *
 * ★ Insight ─────────────────────────────────────
 * - Shows counts for each section
 * - Active section is highlighted
 * - Icons help quickly identify section types
 * ─────────────────────────────────────────────────
 */

import type { LucideIcon } from 'lucide-react';
import { Boxes, GitBranch, Layers, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMetadataStore } from '../../stores/metadataStore';
import type { MetadataSection } from '../../types';

interface SectionConfig {
    key: MetadataSection;
    label: string;
    icon: LucideIcon;
}

const SECTIONS: SectionConfig[] = [
    { key: 'entityTypes', label: 'Entity Types', icon: Layers },
    { key: 'complexTypes', label: 'Complex Types', icon: Boxes },
    { key: 'functionImports', label: 'Functions', icon: Zap },
    { key: 'associations', label: 'Associations', icon: GitBranch }
];

interface MetadataNavProps {
    className?: string;
}

export function MetadataNav({ className }: MetadataNavProps) {
    const { currentSection, setCurrentSection, getSectionCount } = useMetadataStore();

    return (
        <nav className={cn('flex flex-col p-2 gap-1', className)}>
            {SECTIONS.map(({ key, label, icon: Icon }) => {
                const count = getSectionCount(key);
                const isActive = currentSection === key;

                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setCurrentSection(key)}
                        className={cn(
                            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium',
                            'transition-all duration-200 text-left',
                            isActive
                                ? 'bg-gradient-to-r from-[#2ea3f2]/20 to-[#82c0c7]/10 text-[#2ea3f2] border border-[#2ea3f2]/30'
                                : 'text-slate-400 hover:bg-[#32373c]/50 hover:text-[#82c0c7] border border-transparent'
                        )}
                    >
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[#2ea3f2]' : 'opacity-70')} />
                        <span className="flex-1">{label}</span>
                        <span
                            className={cn(
                                'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                isActive ? 'bg-[#2ea3f2] text-white' : 'bg-[#32373c] text-slate-400'
                            )}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}

export default MetadataNav;
