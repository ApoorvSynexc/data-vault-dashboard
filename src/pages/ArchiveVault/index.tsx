export default function ArchiveVault() {
  return (
    <div className='flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-6'>
      <div className='w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center'>
        <svg className='w-10 h-10 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='1.5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z' />
        </svg>
      </div>
      <div className='text-center'>
        <h1 className='text-2xl font-bold text-gray-900'>Coming Soon</h1>
        <p className='text-gray-500 mt-2 max-w-sm'>Archive Vault is under construction. We are working hard to bring it to you shortly.</p>
      </div>
    </div>
  );
}
