/**
 * CSRF Token Status Indicator
 *
 * Shows the current CSRF token status for the active service.
 * Displays as a small badge next to the Execute button.
 */

import { AlertTriangle, Loader2, RefreshCw, Shield, ShieldOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import {
    extractServiceRootUrl,
    fetchCsrfToken,
    getTokenStatus,
    invalidateToken,
    requiresCsrfToken
} from '../../services/odata/csrfTokenService';

interface CsrfTokenIndicatorProps {
    url: string;
    method: string;
    className?: string;
}

type TokenState = 'idle' | 'fetching' | 'valid' | 'expired' | 'error' | 'not-required';

export function CsrfTokenIndicator({ url, method, className }: CsrfTokenIndicatorProps) {
    const [state, setState] = useState<TokenState>('idle');
    const [error, setError] = useState<string | null>(null);

    // Check if CSRF is needed for this method
    const needsCsrf = requiresCsrfToken(method);

    // Update state based on current token cache
    useEffect(() => {
        if (!needsCsrf) {
            setState('not-required');
            return;
        }

        if (!url || url === '/') {
            setState('idle');
            return;
        }

        const status = getTokenStatus(url);
        switch (status) {
            case 'valid':
                setState('valid');
                break;
            case 'expired':
                setState('expired');
                break;
            default:
                setState('idle');
        }
    }, [url, needsCsrf]);

    const handleRefresh = useCallback(async () => {
        if (!url || url === '/') return;

        setState('fetching');
        setError(null);

        const serviceUrl = extractServiceRootUrl(url);
        invalidateToken(serviceUrl);

        try {
            await fetchCsrfToken(serviceUrl);
            setState('valid');
        } catch (err) {
            setState('error');
            setError(err instanceof Error ? err.message : 'Failed to fetch token');
        }
    }, [url]);

    // Don't show indicator for GET requests
    if (!needsCsrf) {
        return null;
    }

    const getIcon = () => {
        switch (state) {
            case 'fetching':
                return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
            case 'valid':
                return <Shield className="h-3.5 w-3.5" />;
            case 'expired':
            case 'error':
                return <AlertTriangle className="h-3.5 w-3.5" />;
            default:
                return <ShieldOff className="h-3.5 w-3.5" />;
        }
    };

    const getTooltipContent = () => {
        switch (state) {
            case 'fetching':
                return 'Fetching CSRF token...';
            case 'valid':
                return 'CSRF token cached (click to refresh)';
            case 'expired':
                return 'CSRF token expired (click to refresh)';
            case 'error':
                return `Token error: ${error || 'Unknown'} (click to retry)`;
            default:
                return 'No CSRF token (will fetch on execute)';
        }
    };

    const getColorClasses = () => {
        switch (state) {
            case 'fetching':
                return 'text-blue-400 bg-blue-400/10';
            case 'valid':
                return 'text-green-400 bg-green-400/10';
            case 'expired':
            case 'error':
                return 'text-amber-400 bg-amber-400/10';
            default:
                return 'text-slate-400 bg-slate-400/10';
        }
    };

    return (
        <button
            type="button"
            onClick={handleRefresh}
            disabled={state === 'fetching'}
            title={getTooltipContent()}
            className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                'transition-colors hover:opacity-80',
                'focus:outline-none focus:ring-1 focus:ring-slate-500',
                getColorClasses(),
                className
            )}
        >
            {getIcon()}
            <span className="sr-only">CSRF Token Status</span>
            {state === 'fetching' && <span className="hidden sm:inline">Fetching...</span>}
            {state === 'valid' && <RefreshCw className="h-3 w-3 ml-0.5 opacity-50" />}
        </button>
    );
}

export default CsrfTokenIndicator;
