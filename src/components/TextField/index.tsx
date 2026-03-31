import type { TextFieldProps } from './TextField.types';

export default function TextField({
  label,
  error,
  rightIcon,
  onRightIconClick,
  id,
  ...props
}: TextFieldProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className='flex flex-col gap-1 w-full'>
      {label && (
        <label htmlFor={inputId} className='text-sm font-medium text-gray-700'>
          {label}
        </label>
      )}

      <div className='relative'>
        <input
          id={inputId}
          {...props}
          className={[
            'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition',
            'placeholder:text-gray-400 text-gray-900',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
            error ? 'border-red-400' : 'border-gray-300',
            rightIcon ? 'pr-10' : '',
          ].join(' ')}
        />

        {rightIcon && (
          <button
            type='button'
            onClick={onRightIconClick}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
            tabIndex={-1}
          >
            {rightIcon}
          </button>
        )}
      </div>

      {error && <p className='text-xs text-red-500'>{error}</p>}
    </div>
  );
}
