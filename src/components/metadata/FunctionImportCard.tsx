/**
 * FunctionImportCard Component
 *
 * Displays an OData FunctionImport.
 *
 * ★ Insight ─────────────────────────────────────
 * - FunctionImports are callable operations in OData
 * - Similar to stored procedures or RPC calls
 * - Can have In/Out/InOut parameters
 * ─────────────────────────────────────────────────
 */

import { ChevronRight, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMetadataStore } from '../../stores/metadataStore';
import type { FunctionImport, FunctionParameter } from '../../types';
import { Badge } from '../ui/badge';
import { HighlightedText } from './utils';

interface FunctionImportCardProps {
    functionImport: FunctionImport;
    searchTerm: string;
}

/**
 * Parameter row component
 */
function ParameterRow({ param, searchTerm }: { param: FunctionParameter; searchTerm: string }) {
    return (
        <div className="flex items-center py-2 px-2.5 gap-2.5 bg-[#32373c]/30 rounded-lg text-xs mb-1.5 last:mb-0">
            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">
                {param.mode}
            </Badge>
            <span className="font-mono font-medium text-slate-200">
                <HighlightedText text={param.name} searchTerm={searchTerm} />
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] bg-[#2ea3f2]/10 text-[#82c0c7]">
                {param.type}
            </Badge>
            {!param.nullable && (
                <span className="text-[10px] text-slate-400 bg-[#32373c] px-1.5 py-0.5 rounded">
                    Required
                </span>
            )}
        </div>
    );
}

export function FunctionImportCard({ functionImport, searchTerm }: FunctionImportCardProps) {
    const { isItemExpanded, toggleItemExpanded } = useMetadataStore();
    const itemId = `functionImport-${functionImport.name}`;
    const isExpanded = isItemExpanded(itemId);

    const hasParams = functionImport.parameters && functionImport.parameters.length > 0;

    const METHOD_COLORS: Record<string, string> = {
        GET: 'bg-[#2ea3f2]/20 text-[#82c0c7]',
        POST: 'bg-emerald-500/20 text-emerald-400',
        PUT: 'bg-amber-500/20 text-amber-400',
        PATCH: 'bg-teal-500/20 text-teal-400',
        DELETE: 'bg-rose-500/20 text-rose-400',
        MERGE: 'bg-teal-500/20 text-teal-400',
        HEAD: 'bg-[#2ea3f2]/20 text-[#82c0c7]',
        OPTIONS: 'bg-slate-500/20 text-slate-400'
    };
    const methodColor = METHOD_COLORS[functionImport.httpMethod] || 'bg-slate-500/20 text-slate-400';

    return (
        <div
            className={cn(
                'bg-[#32373c]/30 border border-slate-700/50 rounded-lg overflow-hidden transition-all duration-200',
                'hover:border-[#2ea3f2]/50 hover:shadow-lg hover:shadow-[#2ea3f2]/5'
            )}
        >
            {/* Header */}
            <button
                type="button"
                onClick={() => toggleItemExpanded(itemId)}
                className="w-full flex items-center px-3.5 py-3 gap-2.5 hover:bg-[#32373c]/50 cursor-pointer text-left"
            >
                <ChevronRight
                    className={cn('h-4 w-4 text-[#82c0c7] transition-transform', isExpanded && 'rotate-90')}
                />
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-slate-200 text-[13px]">
                    <HighlightedText text={functionImport.name} searchTerm={searchTerm} />
                </span>
                <Badge className={cn('text-xs font-mono ml-auto', methodColor)}>{functionImport.httpMethod}</Badge>
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-0 border-t border-slate-700/30 ml-7">
                    {/* Parameters */}
                    {hasParams ? (
                        <div className="mt-3">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#82c0c7] mb-2 pb-1.5 border-b border-[#2ea3f2]/20">
                                Parameters ({functionImport.parameters.length})
                            </div>
                            {functionImport.parameters.map((param) => (
                                <ParameterRow key={param.name} param={param} searchTerm={searchTerm} />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-3 text-xs text-slate-500 italic">No parameters</div>
                    )}

                    {/* Return Type */}
                    {functionImport.returnType && (
                        <div className="mt-3 flex items-center gap-2 py-2 px-2.5 bg-emerald-500/10 rounded-lg text-xs">
                            <span className="font-medium text-emerald-400">Returns:</span>
                            <Badge
                                variant="secondary"
                                className="font-mono text-[10px] bg-[#2ea3f2]/10 text-[#82c0c7]"
                            >
                                {functionImport.returnType}
                            </Badge>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FunctionImportCard;
