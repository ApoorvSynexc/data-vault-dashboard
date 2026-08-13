import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipPortalProps {
  text: string;
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  visible: boolean;
}

function TooltipPortal({ text, anchorRef, visible }: TooltipPortalProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number; left: number; arrowLeft: number; arrowUp: boolean; ready: boolean;
  }>({ top: 0, left: 0, arrowLeft: 12, arrowUp: false, ready: false });

  useEffect(() => {
    if (!visible || !anchorRef.current) {
      setPos((p) => ({ ...p, ready: false }));
      return;
    }

    // Run after paint so tooltipRef has real dimensions
    const frame = requestAnimationFrame(() => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const W = 208;
      const GAP = 6;
      const ARROW_SIZE = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tooltipH = tooltipRef.current?.offsetHeight ?? 72;

      // Badge center x
      const badgeCenterX = rect.left + rect.width / 2;

      // Tooltip left: prefer centered on badge, then clamp to viewport
      let left = badgeCenterX - W / 2;
      if (left + W > vw - 8) left = vw - W - 8;
      if (left < 8) left = 8;

      // Arrow offset relative to tooltip left — always points at badge center
      const arrowLeft = Math.max(8, Math.min(W - 16, badgeCenterX - left - ARROW_SIZE / 2));

      // Show above or below based on available space
      const spaceAbove = rect.top;
      const spaceBelow = vh - rect.bottom;
      const showAbove = spaceAbove >= tooltipH + GAP + ARROW_SIZE || spaceAbove >= spaceBelow;

      const top = showAbove
        ? rect.top - tooltipH - GAP - ARROW_SIZE
        : rect.bottom + GAP;

      setPos({ top, left, arrowLeft, arrowUp: !showAbove, ready: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [visible, anchorRef]);

  if (!visible) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 208,
        zIndex: 99999,
        opacity: pos.ready ? 1 : 0,
        pointerEvents: 'none',
      }}
      className='rounded-lg bg-gray-900 px-3 py-2 text-[11px] text-gray-200 leading-relaxed shadow-xl'
    >
      {/* Arrow above tooltip (tooltip is below badge) */}
      {pos.arrowUp && (
        <span
          className='absolute bottom-full w-2 h-2 bg-gray-900 rotate-45'
          style={{ left: pos.arrowLeft, marginBottom: -4 }}
        />
      )}
      {text}
      {/* Arrow below tooltip (tooltip is above badge) */}
      {!pos.arrowUp && (
        <span
          className='absolute top-full w-2 h-2 bg-gray-900 rotate-45'
          style={{ left: pos.arrowLeft, marginTop: -4 }}
        />
      )}
    </div>,
    document.body,
  );
}

interface Props {
  text: string;
  active?: boolean;
  className?: string;
}

export default function InfoTooltip({ text, active, className = '' }: Props) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const show = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setVisible(true); }, []);
  const hide = useCallback(() => setVisible(false), []);

  return (
    <span
      ref={ref}
      className={`relative flex-shrink-0 cursor-default inline-flex align-middle ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none select-none ${active ? 'bg-blue-200 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
        i
      </span>
      <TooltipPortal text={text} anchorRef={ref} visible={visible} />
    </span>
  );
}
