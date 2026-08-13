import Typography from '../../../../components/Typography';

export default function FullRestoreScope() {
  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='px-5 py-3 border-b border-gray-100'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>★ Full Restore — Summary</Typography>
      </div>
      <div className='p-5'>
        <div className='flex items-start gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4'>
          <div className='w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5'>
            <svg className='text-white' width='16' height='16' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7'/>
            </svg>
          </div>
          <div className='flex-1'>
            <p className='text-sm font-bold text-green-800'>All data in the source will be restored</p>
            <p className='text-xs text-green-700 mt-1'>
              Every record of every object in the chosen source. No further selection or filtering needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
