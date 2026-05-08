type BackupHistoryProps = {
  backup: any;
};

export default function BackupHistory({ backup }: BackupHistoryProps) {
  return (
    <div className='bg-white rounded-lg border border-gray-200 p-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-4'>Backup History</h2>

      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-gray-200'>
              <th className='text-left px-4 py-3 font-medium text-gray-600'>Date & Time</th>
              <th className='text-left px-4 py-3 font-medium text-gray-600'>Status</th>
              <th className='text-left px-4 py-3 font-medium text-gray-600'>Duration</th>
              <th className='text-left px-4 py-3 font-medium text-gray-600'>Data Size</th>
              <th className='text-left px-4 py-3 font-medium text-gray-600'>Records</th>
              <th className='text-left px-4 py-3 font-medium text-gray-600'>Type</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className='border-b border-gray-200 hover:bg-gray-50'>
                <td className='px-4 py-3 text-sm text-gray-900'>April {10 - i}, 2026 08:00 AM</td>
                <td className='px-4 py-3'>
                  <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700'>
                    Completed
                  </span>
                </td>
                <td className='px-4 py-3 text-sm text-gray-900'>24m 32s</td>
                <td className='px-4 py-3 text-sm text-gray-900'>146.3 GB</td>
                <td className='px-4 py-3 text-sm text-gray-900'>12,424,545</td>
                <td className='px-4 py-3 text-sm text-gray-900'>Full</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='mt-4 flex items-center justify-between'>
        <p className='text-sm text-gray-600'>Showing 5 of 45 backups</p>
        <div className='flex gap-2'>
          <button className='px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50'>← Previous</button>
          <button className='px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50'>Next →</button>
        </div>
      </div>
    </div>
  );
}
