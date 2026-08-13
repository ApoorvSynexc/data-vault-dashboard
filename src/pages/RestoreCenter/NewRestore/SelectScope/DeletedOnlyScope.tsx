import Typography from '../../../../components/Typography';

export default function DeletedOnlyScope() {
  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='px-5 py-3 border-b border-gray-100'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>⌫ Deleted-Only Mode</Typography>
      </div>
      <div className='p-5'>
        <div className='flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4'>
          <div className='w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-600 text-base'>⌫</div>
          <div className='flex-1'>
            <p className='text-sm font-bold text-amber-800'>Will restore records deleted in destination since the snapshot</p>
            <p className='text-xs text-amber-700 mt-1'>
              The system auto-compares the source snapshot to the destination and surfaces records that exist in the source but are missing (or in the recycle bin) in the destination. Records that were never deleted will not be touched.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
