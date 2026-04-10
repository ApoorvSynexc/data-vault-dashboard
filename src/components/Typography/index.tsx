import type { ElementType, ReactNode } from 'react';

type TypographyVariant =
  | 'pageTitle'
  | 'sectionTitle'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption'
  | 'metricLabel'
  | 'metricValue';

type TypographyColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'brand'
  | 'white'
  | 'success'
  | 'danger';

type TypographyProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  color?: TypographyColor;
  variant: TypographyVariant;
};

const variantClasses: Record<TypographyVariant, string> = {
  pageTitle: 'text-xl font-bold',
  sectionTitle: 'text-sm font-semibold',
  body: 'text-sm',
  bodySm: 'text-xs',
  label: 'text-xs font-medium',
  caption: 'text-[11px] font-medium',
  metricLabel: 'text-[11px] font-medium',
  metricValue: 'text-[2rem] leading-none font-bold',
};

const colorClasses: Record<TypographyColor, string> = {
  primary: 'text-gray-900',
  secondary: 'text-gray-800',
  muted: 'text-gray-500',
  brand: 'text-blue-600',
  white: 'text-white',
  success: 'text-emerald-500',
  danger: 'text-red-500',
};

export default function Typography<T extends ElementType = 'p'>({
  as,
  children,
  className = '',
  color = 'primary',
  variant,
}: TypographyProps<T>) {
  const Component = (as ?? 'p') as ElementType;

  return (
    <Component
      className={[
        variantClasses[variant],
        colorClasses[color],
        className,
      ].join(' ').trim()}
    >
      {children}
    </Component>
  );
}
