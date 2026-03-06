/**
 * Clipboard Utilities
 *
 * Functions for copying text to clipboard.
 */

export interface CopyOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
export const copyToClipboard = async (text: string, options: CopyOptions = {}): Promise<boolean> => {
    const { onSuccess, onError } = options;

    try {
        // Modern Clipboard API
        await navigator.clipboard.writeText(text);
        onSuccess?.();
        return true;
    } catch {
        // Fallback for permission issues or older browsers
        try {
            const success = fallbackCopy(text);
            if (success) {
                onSuccess?.();
                return true;
            }
            throw new Error('Fallback copy failed');
        } catch (fallbackErr) {
            console.error('[Clipboard] Copy failed:', fallbackErr);
            onError?.(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
            return false;
        }
    }
};

/**
 * Fallback copy method using execCommand
 * @deprecated This method uses deprecated APIs but is kept for compatibility
 */
const fallbackCopy = (text: string): boolean => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';

    document.body.appendChild(textarea);
    textarea.select();

    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        console.error('[Clipboard] execCommand failed:', err);
    }

    document.body.removeChild(textarea);
    return success;
};

/**
 * Copy JSON data to clipboard (formatted)
 */
export const copyJsonToClipboard = async (data: unknown, options: CopyOptions = {}): Promise<boolean> => {
    try {
        const text = JSON.stringify(data, null, 2);
        return copyToClipboard(text, options);
    } catch {
        options.onError?.(new Error('Failed to stringify JSON'));
        return false;
    }
};

/**
 * Copy URL to clipboard
 */
export const copyUrlToClipboard = async (url: string, options: CopyOptions = {}): Promise<boolean> => {
    return copyToClipboard(url, options);
};
