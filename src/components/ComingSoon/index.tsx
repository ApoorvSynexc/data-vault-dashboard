export default function ComingSoon({ title = 'Coming Soon', description = 'This feature is under development and will be available soon.' }: { title?: string; description?: string }) {
  return (
    <div className='flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6'>
      <div className='w-20 h-20 rounded-full flex items-center justify-center mb-6' style={{ background: 'rgba(21,93,252,0.08)' }}>
        <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'>
          <circle cx='12' cy='12' r='10' />
          <polyline points='12 6 12 12 16 14' />
        </svg>
      </div>
      <h2 className='text-2xl font-bold text-gray-900 mb-2'>{title}</h2>
      <p className='text-sm text-gray-500 max-w-sm'>{description}</p>
    </div>
  );
}
