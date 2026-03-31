import Typography from '../../../components/Typography';
import type { StepMarkerProps } from './types';

export function StepMarker({ step, label, status }: StepMarkerProps) {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <div className='flex min-w-[120px] flex-1 flex-col items-center gap-2 text-center'>
      <div
        className={[
          'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold',
          isCompleted || isActive
            ? 'border-blue-600 text-blue-600'
            : 'border-blue-600 bg-blue-600 text-white',
          isCompleted ? 'bg-blue-600 text-white' : 'bg-white',
        ].join(' ')}
      >
        {isCompleted ? (
          <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-3.5 w-3.5'>
            <path d='M5 10l3 3 7-7' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        ) : (
          step
        )}
      </div>
      <Typography variant='label' color={isActive ? 'brand' : 'secondary'}>
        {label}
      </Typography>
    </div>
  );
}

export function SelectChevron() {
  return (
    <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4 text-gray-400'>
      <path d='M5 7.5L10 12.5L15 7.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4 text-gray-400'>
      <circle cx='9' cy='9' r='5.5' />
      <path d='M13.5 13.5L17 17' strokeLinecap='round' />
    </svg>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onChange}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition',
        checked ? 'bg-blue-600' : 'bg-gray-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

export function ReviewCard({
  title,
  details,
  meta,
  onEdit,
}: {
  title: string;
  details: string;
  meta: string;
  onEdit: () => void;
}) {
  return (
    <div className='grid grid-cols-1 items-center gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm md:grid-cols-[1.1fr_1.2fr_1.1fr_auto]'>
      <Typography variant='sectionTitle' color='secondary'>
        {title}
      </Typography>
      <Typography variant='bodySm' color='muted'>
        {details}
      </Typography>
      <Typography variant='bodySm' color='muted'>
        {meta}
      </Typography>
      <button
        type='button'
        onClick={onEdit}
        className='inline-flex min-w-[58px] items-center justify-center rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700'
      >
        Edit
      </button>
    </div>
  );
}
