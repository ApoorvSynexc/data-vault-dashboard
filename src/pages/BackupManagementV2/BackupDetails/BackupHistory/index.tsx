import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { formatBytes } from '../../../../utils';
import dayjs from 'dayjs';
import JobDetailsModal from './JobDetailsModal';

const ErrorMessageCell = ({ errorMessage }: { errorMessage?: string }) => {
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);

  if (!errorMessage) {
    return <span className='text-xs text-gray-500'>--</span>;
  }

  return (
    <div className='relative inline-block'>
      <span
        className='cursor-help text-red-600 text-xs'
        onMouseEnter={() => setHoveredJobId('error')}
        onMouseLeave={() => setHoveredJobId(null)}
      >
        {errorMessage.length > 50
          ? errorMessage.substring(0, 50) + '...'
          : errorMessage}
      </span>

      {hoveredJobId === 'error' && (
        <div className='absolute bottom-full left-0 mb-2 z-50 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-normal max-w-xs break-words'>
          {errorMessage}
          <div className='absolute top-full left-2 w-2 h-2 bg-gray-900 transform rotate-45'></div>
        </div>
      )}
    </div>
  );
};

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
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<{ [page: number]: string | null }>({ 1: null });
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const itemsPerPage = 20;

  const { data: jobsResponse } = useQuery({
    queryKey: ['backup-jobs', slug, currentPage, cursors[currentPage]],
    queryFn: async () => {
      if (!slug) return null;
      const cursor = cursors[currentPage];
      const response = await backupConfigService.listBackupJobs(slug, true, cursor, itemsPerPage);

      // Store the next cursor for the next page
      if (response?.meta?.nextCursor) {
        setCursors(prev => ({
          ...prev,
          [currentPage + 1]: response.meta.nextCursor
        }));
      }

      return response;
    },
    enabled: !!slug,
  });

  const { data: statsResponse } = useQuery({
    queryKey: ['backup-stats', slug],
    queryFn: async () => {
      if (!slug) return null;
      const response = await backupConfigService.getStats(slug);
      return response?.data;
    },
    enabled: !!slug,
  });

  const currentJobs = (jobsResponse as any)?.data || [];
  const apiMeta = (jobsResponse as any)?.meta;
  const totalItems = apiMeta?.totalRecords || 0;
  const totalPages = apiMeta?.totalPages || 1;
  const hasNextPage = apiMeta?.nextCursor !== null && apiMeta?.nextCursor !== undefined;
  const hasPrevPage = currentPage > 1;

  // Get stats from API
  const apiStats = statsResponse as any;
  const completedJobsCount = typeof apiStats?.completedJobs === 'number'
    ? apiStats.completedJobs
    : (apiStats?.completedJobs?.count || 0);
  const runningJobsCount = typeof apiStats?.runningJobs === 'number'
    ? apiStats.runningJobs
    : (apiStats?.runningJobs?.count || 0);
  const failedJobsCount = typeof apiStats?.failedJobs === 'number'
    ? apiStats.failedJobs
    : (apiStats?.failedJobs?.count || 0);
  const totalDataBackedUp = apiStats?.dataProcessed?.bytes || 0;
  const totalRuns = completedJobsCount + runningJobsCount + failedJobsCount;

  const stats = {
    totalRuns,
    successful: completedJobsCount,
    failed: failedJobsCount,
    totalDataBackedUp,
  };

  // Use the current page jobs directly from API
  const paginatedJobs = currentJobs;

  const handleResume = async (backupJobId: string) => {
    setResumingJobId(backupJobId);
    try {
      await backupConfigService.resumeBackupJob(backupJobId);
      queryClient.invalidateQueries({ queryKey: ['backup-jobs', slug] });
      setResumingJobId(null);
    } catch (error) {
      console.error('Failed to resume backup job:', error);
      setResumingJobId(null);
    }
  };

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
                <th className='text-left px-4 py-3 font-medium text-gray-600'>#</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Start Time</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Status</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Duration</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Data Size</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Objects</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Backup Type</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Error Message</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.length > 0 ? (
                paginatedJobs.map((row: any, index: number) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={row.backupJobId} className='border-b border-gray-200 hover:bg-gray-50'>
                      <td className='px-4 py-3 text-sm text-gray-600'>{String(serialNumber).padStart(2, '0')}</td>
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
                    <td className='px-4 py-3'>
                      <ErrorMessageCell errorMessage={row.errorMessage} />
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        {row.status === 'FAILED' ? (
                          <button
                            type='button'
                            disabled={resumingJobId === row.backupJobId}
                            onClick={() => handleResume(row.backupJobId)}
                            className='inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60'
                          >
                            {resumingJobId === row.backupJobId ? (
                              <span className='h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent' />
                            ) : (
                              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
                                <polygon points='5 3 19 12 5 21 5 3' fill='currentColor' stroke='none' />
                              </svg>
                            )}
                            {resumingJobId === row.backupJobId ? 'Resuming…' : 'Resume'}
                          </button>
                        ) : null}
                        <button
                          type='button'
                          onClick={() => setSelectedJobId(row.backupJobId)}
                          className='text-gray-400 hover:text-gray-600 transition'
                          aria-label='View details'
                        >
                          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
                            <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                            <circle cx='12' cy='12' r='3' />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className='px-4 py-8 text-center text-sm text-gray-500'>
                    No backup history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(hasPrevPage || hasNextPage) && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200'>
            <p className='text-sm text-gray-600'>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}</p>
            <div className='flex items-center gap-4'>
              {/* Pagination Controls */}
              <div className='flex items-center gap-2'>
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={!hasPrevPage}
                  className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'
                >
                  &lt;
                </button>

                {/* Page Number Display */}
                <div className='flex items-center gap-1'>
                  <span className='px-3 py-1 text-sm font-medium text-gray-700'>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasNextPage}
                  className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJobId && (
        <JobDetailsModal
          job={allJobs.find((j: any) => j.backupJobId === selectedJobId)}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}
