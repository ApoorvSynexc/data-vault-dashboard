import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { formatBytes } from '../../../../utils';
import dayjs from 'dayjs';

type BackupHistoryProps = {
  backup: any;
};

const getStatusColor = (status: string) => {
  const upperStatus = status?.toUpperCase();
  switch (upperStatus) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    case 'RUNNING':
      return 'bg-yellow-100 text-yellow-700';
    case 'PENDING':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getStatusDisplayText = (status: string) => {
  const upperStatus = status?.toUpperCase();
  switch (upperStatus) {
    case 'SUCCESS':
      return 'Completed';
    case 'FAILED':
      return 'Failed';
    case 'RUNNING':
      return 'In Progress';
    case 'PENDING':
      return 'Pending';
    default:
      return status;
  }
};

const calculateDuration = (startedAt?: string, completedAt?: string) => {
  if (!startedAt || !completedAt) return '--';
  const start = dayjs(startedAt);
  const end = dayjs(completedAt);
  const diffMs = end.diff(start, 'ms');

  if (diffMs < 0) return '--';

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const calculateJobDataSize = (job: any) => {
  if (job.object && Array.isArray(job.object)) {
    const totalSize = job.object.reduce((sum: number, obj: any) => sum + (obj.sizeInBytes || 0), 0);
    return totalSize;
  }
  return job.sizeInBytes || 0;
};

export default function BackupHistory(_: BackupHistoryProps) {
  const { slug } = useParams();
  const backupConfigService = useBackupConfigService();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: jobsResponse } = useQuery({
    queryKey: ['backup-jobs', slug],
    queryFn: async () => {
      if (!slug) return null;
      const response = await backupConfigService.listBackupJobs(slug, true, undefined, 50);
      return response;
    },
    enabled: !!slug,
  });

  const allJobs = (jobsResponse as any)?.data || [];
  const itemsPerPage = 10;
  const totalItems = allJobs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Calculate stats from real data
  const stats = {
    totalRuns: totalItems,
    successful: allJobs.filter((j: any) => j.status === 'SUCCESS').length,
    failed: allJobs.filter((j: any) => j.status === 'FAILED').length,
    totalDataBackedUp: allJobs.reduce((sum: number, j: any) => sum + (j.sizeInBytes || 0), 0),
  };

  // Paginate jobs
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = allJobs.slice(startIndex, endIndex);

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
            <p className='text-lg font-bold text-gray-900'>{stats.totalRuns}</p>
            <p className='text-xs text-gray-500'>+15 last 30 days</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Successful</span>
            </div>
            <p className='text-lg font-bold text-green-600'>{stats.successful}</p>
            <p className='text-xs text-gray-500'>{totalItems > 0 ? `${Math.round((stats.successful / totalItems) * 100)}% success rate` : 'N/A'}</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-red-600' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Failed</span>
            </div>
            <p className='text-lg font-bold text-red-600'>{String(stats.failed).padStart(2, '0')}</p>
            <p className='text-xs text-gray-500'>{totalItems > 0 ? `${Math.round((stats.failed / totalItems) * 100)}% failure rate` : 'N/A'}</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v-1h8v1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3h2v3h-2z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Total Data Backed up</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>{formatBytes(stats.totalDataBackedUp)}</p>
            <p className='text-xs text-gray-500'>Across all backups</p>
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className='bg-white rounded border border-gray-200'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Start Time</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Status</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Duration</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Data Size</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Objects</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Backup Type</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.length > 0 ? (
                paginatedJobs.map((row: any) => (
                  <tr key={row.backupJobId} className='border-b border-gray-200 hover:bg-gray-50'>
                    <td className='px-4 py-3 text-gray-900'>{row.startedAt ? dayjs(row.startedAt).format('MMM D, YYYY h:mm A') : '--'}</td>
                    <td className='px-4 py-3'>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
                        {getStatusDisplayText(row.status)}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-gray-900'>{calculateDuration(row.startedAt, row.completedAt)}</td>
                    <td className='px-4 py-3 text-gray-900'>{formatBytes(calculateJobDataSize(row))}</td>
                    <td className='px-4 py-3 text-gray-900'>{row.object?.length || row.recordCount || 0}</td>
                    <td className='px-4 py-3 text-gray-900'>{row.jobType === 'BULK' ? 'Scheduled' : 'Realtime'}</td>
                    <td className='px-4 py-3 text-gray-400 cursor-pointer hover:text-gray-600'>
                      <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                        <path d='M10.5 1.5H9.5V0h1v1.5zm0 17H9.5v1.5h1V18.5zM19 9.5v1h1.5v-1H19zM0 9.5v1h1.5v-1H0zm14.243-5.243l.707-.707L18.9 7.793l-.707.707-4.65-4.65zm-8.486 8.486l.707-.707 4.65 4.65-.707.707-4.65-4.65zM18.9 12.207l.707.707-4.65 4.65-.707-.707 4.65-4.65zM7.793 1.1l.707.707-4.65 4.65-.707-.707 4.65-4.65z' />
                      </svg>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className='px-4 py-8 text-center text-sm text-gray-500'>
                    No backup history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200'>
            <p className='text-sm text-gray-600'>Showing {Math.min(itemsPerPage, paginatedJobs.length)} of {totalItems}</p>
            <div className='flex gap-1'>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
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
                className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
