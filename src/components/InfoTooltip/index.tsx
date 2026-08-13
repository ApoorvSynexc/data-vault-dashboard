import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipPortalProps {
  text: string;
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  visible: boolean;
}

function TooltipPortal({ text, anchorRef, visible }: TooltipPortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
  const [arrowUp, setArrowUp] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !anchorRef.current) {
      setStyle({ opacity: 0, pointerEvents: 'none' });
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const W = 208; // w-52 = 13rem = 208px
    const GAP = 8;
    const ARROW = 8;

    // Viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Measure tooltip height after render
    const tooltipH = tooltipRef.current?.offsetHeight ?? 80;

    // Decide: show above or below
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const showAbove = spaceAbove >= tooltipH + GAP + ARROW || spaceAbove >= spaceBelow;

    // Horizontal: align left edge of badge, clamp to viewport
    let left = rect.left;
    if (left + W > vw - 8) left = vw - W - 8;
    if (left < 8) left = 8;

    const top = showAbove
      ? rect.top + window.scrollY - tooltipH - GAP - ARROW
      : rect.bottom + window.scrollY + GAP;

    setArrowUp(!showAbove);
    setStyle({ position: 'fixed', top: showAbove ? rect.top - tooltipH - GAP - ARROW : rect.bottom + GAP, left, width: W, zIndex: 99999, opacity: 1, pointerEvents: 'none' });
  }, [visible, anchorRef]);

  if (!visible) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      style={style}
      className='rounded-lg bg-gray-900 px-3 py-2 text-[11px] text-gray-200 leading-relaxed shadow-xl transition-opacity duration-100'
    >
      {!arrowUp && (
        <span className='absolute left-3 bottom-full w-2 h-2 bg-gray-900 rotate-45 mb-[-4px] block' />
      )}
      {text}
      {arrowUp && (
        <span className='absolute left-3 top-full w-2 h-2 bg-gray-900 rotate-45 mt-[-4px] block' />
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
