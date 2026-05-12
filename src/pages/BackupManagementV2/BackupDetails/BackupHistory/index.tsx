import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import type { TableColumn } from '../../../../components/Table';
import Table from '../../../../components/Table';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { formatBytes } from '../../../../utils';
import dayjs from 'dayjs';
import JobDetailsModal from './JobDetailsModal';

interface BackupJob {
  backupJobId: string;
  startedAt?: string;
  completedAt?: string;
  status?: string;
  object?: BackupJobObject[];
  sizeInBytes?: number;
  jobType?: string;
  errorMessage?: string;
}

interface BackupJobObject {
  name: string;
  status: string;
  totalRecordCount?: number;
}

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
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const itemsPerPage = 20;

  const { data: jobsResponse } = useQuery({
    queryKey: ['backup-jobs', slug, cursor],
    queryFn: async () => {
      if (!slug) return null;
      const response = await backupConfigService.listBackupJobs(slug, true, cursor || undefined, itemsPerPage);
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
  const nextCursor = apiMeta?.nextCursor || null;
  const hasNextPage = nextCursor !== null && nextCursor !== undefined;
  const hasPrevPage = pageIndex > 0;

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

  const handleNext = () => {
    if (nextCursor) {
      setCursorHistory([...cursorHistory, nextCursor]);
      setCursor(nextCursor);
      setPageIndex(pageIndex + 1);
    }
  };

  const handlePrev = () => {
    if (hasPrevPage) {
      const newHistory = cursorHistory.slice(0, -1);
      const prevCursor = newHistory[newHistory.length - 1] || null;
      setCursorHistory(newHistory);
      setCursor(prevCursor);
      setPageIndex(pageIndex - 1);
    }
  };

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

  // Define columns for the Table component
  const columns: TableColumn<BackupJob>[] = [
    {
      key: 'startedAt',
      header: 'Start Time',
      render: (job) => job.startedAt ? dayjs(job.startedAt).format('MMM D, YYYY h:mm A') : '--',
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status || '')}`}>
          {getStatusDisplayText(job.status || '')}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (job) => calculateDuration(job.startedAt, job.completedAt),
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      render: (job) => formatBytes(calculateJobDataSize(job)),
    },
    {
      key: 'objects',
      header: 'Objects',
      render: (job) => job.object?.length || 0,
    },
    {
      key: 'jobType',
      header: 'Backup Type',
      render: (job) => job.jobType === 'BULK' ? 'Scheduled' : 'Realtime',
    },
    {
      key: 'errorMessage',
      header: 'Error Message',
      render: (job) => <ErrorMessageCell errorMessage={job.errorMessage} />,
    },
    {
      key: 'action',
      header: 'Action',
      render: (job) => (
        <div className='flex items-center gap-2'>
          {job.status === 'FAILED' ? (
            <button
              type='button'
              disabled={resumingJobId === job.backupJobId}
              onClick={() => handleResume(job.backupJobId)}
              className='inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60'
            >
              {resumingJobId === job.backupJobId ? (
                <span className='h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent' />
              ) : (
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
                  <polygon points='5 3 19 12 5 21 5 3' fill='currentColor' stroke='none' />
                </svg>
              )}
              {resumingJobId === job.backupJobId ? 'Resuming…' : 'Resume'}
            </button>
          ) : null}
          <button
            type='button'
            onClick={() => setSelectedJobId(job.backupJobId)}
            className='text-gray-400 hover:text-gray-600 transition'
            aria-label='View details'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
              <circle cx='12' cy='12' r='3' />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className='space-y-2'>
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
      <div className='bg-white rounded border border-gray-200 flex flex-col' style={{ height: 'calc(100vh - 280px)' }}>
        <div className='flex-1 overflow-y-auto' style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties & { scrollbarWidth?: string; msOverflowStyle?: string }}>
          <style>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <Table<BackupJob>
            columns={columns}
            rows={currentJobs}
            getRowKey={(job) => job.backupJobId}
            showPagination={false}
            showSerialNumber={true}
            serialNumberStart={pageIndex * itemsPerPage + 1}
            emptyState='No backup history found.'
          />
        </div>

        {/* Custom Pagination */}
        <div className='p-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0'>
          <div className='text-sm text-gray-600'>
            Showing {currentJobs.length > 0 ? pageIndex * itemsPerPage + 1 : 0} to {pageIndex * itemsPerPage + currentJobs.length} of {totalItems}
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={handlePrev}
              disabled={!hasPrevPage}
              className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900 transition'
            >
              ← Prev
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNextPage}
              className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900 transition'
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJobId && (
        <JobDetailsModal
          job={currentJobs.find((j: any) => j.backupJobId === selectedJobId)}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}
