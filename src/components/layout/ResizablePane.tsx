/**
 * ResizablePane Component
 *
 * A container that can be resized by dragging an edge.
 * Used for the left sidebar (request list) and could be used for other panels.
 *
 * ★ Insight ─────────────────────────────────────
 * - Uses mouse events for drag handling
 * - Supports both horizontal (left/right) and vertical (top/bottom) resize
 * - Minimum and maximum widths prevent unusable panel sizes
 * - The resize handle is positioned at the specified edge
 * ─────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

type ResizeDirection = 'left' | 'right' | 'top' | 'bottom';

interface ResizablePaneProps {
    /** Content to render inside the pane */
    children: React.ReactNode;
    /** Initial size in pixels */
    initialSize: number;
    /** Minimum size in pixels */
    minSize?: number;
    /** Maximum size in pixels */
    maxSize?: number;
    /** Which edge the resize handle appears on */
    direction: ResizeDirection;
    /** Callback when size changes (for persistence) */
    onResize?: (size: number) => void;
    /** Additional class names */
    className?: string;
}

export function ResizablePane({
    children,
    initialSize,
    minSize = 100,
    maxSize = 800,
    direction,
    onResize,
    className
}: ResizablePaneProps) {
    const [size, setSize] = useState(initialSize);
    const [isResizing, setIsResizing] = useState(false);
    const paneRef = useRef<HTMLDivElement>(null);
    const startSizeRef = useRef(size);
    const startPosRef = useRef(0);

    const isHorizontal = direction === 'left' || direction === 'right';

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            startSizeRef.current = size;
            startPosRef.current = isHorizontal ? e.clientX : e.clientY;
        },
        [size, isHorizontal]
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing) return;

            const currentPos = isHorizontal ? e.clientX : e.clientY;
            const delta = currentPos - startPosRef.current;

            // Calculate new size based on direction
            let newSize: number;
            if (direction === 'right' || direction === 'bottom') {
                newSize = startSizeRef.current + delta;
            } else {
                newSize = startSizeRef.current - delta;
            }

            // Clamp to min/max
            newSize = Math.max(minSize, Math.min(maxSize, newSize));
            setSize(newSize);
        },
        [isResizing, direction, minSize, maxSize, isHorizontal]
    );

    const handleMouseUp = useCallback(() => {
        if (isResizing) {
            setIsResizing(false);
            onResize?.(size);
        }
    }, [isResizing, size, onResize]);

    // Attach global mouse listeners when resizing
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection during resize
            document.body.style.userSelect = 'none';
            document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            };
        }
    }, [isResizing, handleMouseMove, handleMouseUp, isHorizontal]);

    // Update size if initialSize changes externally
    useEffect(() => {
        setSize(initialSize);
    }, [initialSize]);

    const handleStyle = cn(
        'absolute bg-transparent hover:bg-accent-blue/30 transition-colors z-10',
        isHorizontal ? 'w-1 cursor-col-resize top-0 bottom-0' : 'h-1 cursor-row-resize left-0 right-0',
        direction === 'right' && 'right-0',
        direction === 'left' && 'left-0',
        direction === 'bottom' && 'bottom-0',
        direction === 'top' && 'top-0',
        isResizing && 'bg-accent-blue/50'
    );

    const sizeStyle = isHorizontal ? { width: size } : { height: size };

    // Calculate aria-valuenow as percentage (0-100)
    const valueNow = Math.round(((size - minSize) / (maxSize - minSize)) * 100);

    return (
        <div ref={paneRef} className={cn('relative shrink-0', className)} style={sizeStyle}>
            {children}
            {/* Resize handle - using div with button-like behavior for resize interaction */}
            <div
                role="slider"
                aria-orientation={isHorizontal ? 'horizontal' : 'vertical'}
                aria-label="Resize panel"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={valueNow}
                tabIndex={0}
                className={handleStyle}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}

export default ResizablePane;
