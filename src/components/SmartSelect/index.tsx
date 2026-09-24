import { useState, useRef, useEffect, useCallback } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SmartSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  disabled?: boolean;
}

const DROPDOWN_MAX_HEIGHT = 220;

export default function SmartSelect({ value, onChange, options, placeholder, className = '', hasError = false, disabled = false }: SmartSelectProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const openDropdown = useCallback(() => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const goUp = spaceBelow < DROPDOWN_MAX_HEIGHT + 8;
    setStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: DROPDOWN_MAX_HEIGHT,
      ...(goUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
    setOpen(true);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // close on scroll/resize to avoid stale position
  // but skip if the scroll is happening *inside* the dropdown itself
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const borderColor = hasError ? '#F87171' : open ? '#3B82F6' : '#D1D5DB';

  return (
    <>
      <button
        ref={triggerRef}
        type='button'
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm text-left outline-none transition-shadow ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'bg-white cursor-pointer hover:border-gray-400'} ${className}`}
        style={{ border: `1px solid ${borderColor}`, boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.15)' : undefined }}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <svg
          width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'
          className='flex-shrink-0 text-gray-400 transition-transform'
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={{ ...style, overflowY: 'auto', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type='button'
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className='w-full text-left px-4 py-2 text-sm transition-colors'
                style={{
                  background: isSelected ? 'rgba(59,130,246,0.08)' : undefined,
                  color: isSelected ? '#2563EB' : '#111827',
                  fontWeight: isSelected ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = ''; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
