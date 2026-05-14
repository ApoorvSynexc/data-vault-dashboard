import Typography from '../Typography';

type WarningDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function WarningDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  error,
  onConfirm,
  onCancel,
}: WarningDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4'>
      <div className='w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]'>
        <div className='border-b border-gray-100 px-6 py-4'>
          <div className='flex items-start gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' className='h-5 w-5'>
                <path d='M12 9v4' strokeLinecap='round' />
                <circle cx='12' cy='16.5' r='0.8' fill='currentColor' stroke='none' />
                <path d='M10.29 3.86L1.82 18a2 2 0 001.72 3h16.92a2 2 0 001.72-3L13.71 3.86a2 2 0 00-3.42 0z' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>
            <div>
              <Typography as='h3' variant='sectionTitle' color='secondary'>
                {title}
              </Typography>
              <Typography className='mt-1' variant='bodySm' color='muted'>
                {message}
              </Typography>
            </div>
          </div>
        </div>

        {error && (
          <div className='px-6 pb-2'>
            <p className='text-xs font-medium text-red-600'>{error}</p>
          </div>
        )}
        <div className='flex justify-end gap-3 px-6 py-4'>
          <button
            type='button'
            onClick={onCancel}
            className='inline-flex min-w-[88px] items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50'
          >
            {cancelLabel}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isLoading}
            className='inline-flex min-w-[110px] items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300'
          >
            {isLoading && (
              <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent' />
            )}
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
