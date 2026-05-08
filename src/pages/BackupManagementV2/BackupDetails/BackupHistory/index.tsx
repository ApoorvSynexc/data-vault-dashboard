import { useState } from 'react';

type BackupHistoryProps = {
  backup: any;
};

const mockBackupHistory = {
  stats: {
    totalRuns: 28,
    successful: 27,
    failed: 1,
    totalDataBackedUp: '148.3 GB',
  },
  data: [
    { id: 1, startTime: 'Apr 24, 2026, 02:00 AM', status: 'Completed', duration: '38m 10s', dataSize: '5.1 GB', objects: 152, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 2, startTime: 'Apr 23, 2026, 02:00 AM', status: 'Completed', duration: '40m 17s', dataSize: '5.1 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 3, startTime: 'Apr 22, 2026, 02:00 AM', status: 'Completed', duration: '40m 15s', dataSize: '5 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 4, startTime: 'Apr 21, 2026, 02:00 AM', status: 'Failed', duration: '---', dataSize: '---', objects: 0, dataBackup: 'Full', backupType: 'Scheduled' },
    { id: 5, startTime: 'Apr 20, 2026, 02:00 AM', status: 'Completed', duration: '40m 18s', dataSize: '4.9 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 6, startTime: 'Apr 19, 2026, 02:00 AM', status: 'Completed', duration: '40m 11s', dataSize: '4.8 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 7, startTime: 'Apr 18, 2026, 02:00 AM', status: 'Completed', duration: '40m 11s', dataSize: '4.8 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 8, startTime: 'Apr 17, 2026, 02:00 AM', status: 'Completed', duration: '40m 11s', dataSize: '4.8 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 9, startTime: 'Apr 16, 2026, 02:00 AM', status: 'Completed', duration: '40m 11s', dataSize: '4.8 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
    { id: 10, startTime: 'Apr 15, 2026, 02:00 AM', status: 'Completed', duration: '40m 11s', dataSize: '4.8 GB', objects: 151, dataBackup: 'Full Backup', backupType: 'Scheduled' },
  ],
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-700';
    case 'Failed':
      return 'bg-red-100 text-red-700';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default function BackupHistory({ backup }: BackupHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = 28;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className='space-y-4'>
      {/* Stats Cards */}
      <div className='bg-white rounded border border-gray-200 p-4'>
        <div className='grid grid-cols-4 gap-3'>
          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Total Runs</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>{mockBackupHistory.stats.totalRuns}</p>
            <p className='text-xs text-gray-500'>+15 last 30 days</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Successful</span>
            </div>
            <p className='text-lg font-bold text-green-600'>{mockBackupHistory.stats.successful}</p>
            <p className='text-xs text-gray-500'>96.4% success rate</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-red-600' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Failed</span>
            </div>
            <p className='text-lg font-bold text-red-600'>01</p>
            <p className='text-xs text-gray-500'>3.6% failure rate</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v-1h8v1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3h2v3h-2z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Total Data Backed up</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>{mockBackupHistory.stats.totalDataBackedUp}</p>
            <p className='text-xs text-gray-500'>+12.4 GB in last 30 days</p>
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className='bg-white rounded border border-gray-200 p-4'>
        <h2 className='text-sm font-semibold text-gray-900 mb-4'>Backup History</h2>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Start Time</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Status</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Duration</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Data Size</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Objects</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Data Backup</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Backup Type</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockBackupHistory.data.map((row) => (
                <tr key={row.id} className='border-b border-gray-200 hover:bg-gray-50'>
                  <td className='px-4 py-3 text-gray-900'>{row.startTime}</td>
                  <td className='px-4 py-3'>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-gray-900'>{row.duration}</td>
                  <td className='px-4 py-3 text-gray-900'>{row.dataSize}</td>
                  <td className='px-4 py-3 text-gray-900'>{row.objects}</td>
                  <td className='px-4 py-3 text-gray-900'>{row.dataBackup}</td>
                  <td className='px-4 py-3 text-gray-900'>{row.backupType}</td>
                  <td className='px-4 py-3 text-gray-400 cursor-pointer hover:text-gray-600'>
                    <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                      <path d='M10.5 1.5H9.5V0h1v1.5zm0 17H9.5v1.5h1V18.5zM19 9.5v1h1.5v-1H19zM0 9.5v1h1.5v-1H0zm14.243-5.243l.707-.707L18.9 7.793l-.707.707-4.65-4.65zm-8.486 8.486l.707-.707 4.65 4.65-.707.707-4.65-4.65zM18.9 12.207l.707.707-4.65 4.65-.707-.707 4.65-4.65zM7.793 1.1l.707.707-4.65 4.65-.707-.707 4.65-4.65z' />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className='mt-4 flex items-center justify-between'>
          <p className='text-sm text-gray-600'>Showing 10 of {totalItems}</p>
          <div className='flex gap-1'>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
