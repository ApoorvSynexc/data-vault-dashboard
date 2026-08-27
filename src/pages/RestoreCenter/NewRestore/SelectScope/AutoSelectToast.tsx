// Fixed-position toast for automatic parent-object selection — pairs with
// useAutoSelectToast. Same visual pattern already used for other ad-hoc
// toasts in this app (fixed, top-center, dismiss-on-timeout).
export default function AutoSelectToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className='fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg bg-white border border-blue-100 text-sm text-blue-700 font-medium min-w-[260px] max-w-[420px]'>
      <svg className='flex-shrink-0' width='16' height='16' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
        <circle cx='12' cy='12' r='10' /><line x1='12' y1='16' x2='12' y2='12' /><line x1='12' y1='8' x2='12.01' y2='8' />
      </svg>
      {message}
    </div>
  );
}
