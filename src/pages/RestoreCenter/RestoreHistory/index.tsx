import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import { useRestoreService } from '../../../services/restore/restore.service';

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  DONE:        { label: '✓ Done',        cls: 'text-green-600', icon: '✓' },
  PARTIAL:     { label: '⚠ Partial',     cls: 'text-yellow-600', icon: '⚠' },
  FAILED:      { label: '✗ Failed',      cls: 'text-red-600', icon: '✗' },
  ROLLED_BACK: { label: '↩ Rolled Back', cls: 'text-gray-600', icon: '↩' },
  DRAFT:       { label: '📝 Draft',      cls: 'text-orange-600', icon: '📝' },
  PENDING:     { label: '⏳ Pending',    cls: 'text-blue-600', icon: '⏳' },
};

interface Props {
  onBack?: () => void;
  jobId?: string;
}

const ITEMS_PER_PAGE = 10;

export default function RestoreHistory({ onBack, jobId }: Props) {
  const restoreService = useRestoreService();
  const [page, setPage] = useState(1);

  const { data: jobData, isLoading } = useQuery({
    queryKey: ['restore-job-detail', jobId],
    queryFn: () => jobId ? restoreService.getRestoreJob(jobId) : null,
    enabled: !!jobId,
  });

  if (!jobId) {
    return (
      <div className='flex-1 min-h-0 bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <Typography as='h2' variant='pageTitle' className='mb-2'>No job selected</Typography>
          {onBack && (
            <button
              onClick={onBack}
              className='text-blue-600 hover:text-blue-700 transition'
            >
              ← Back to Restore Center
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex-1 min-h-0 bg-gray-50 flex items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600' />
      </div>
    );
  }

  const job = (jobData as any)?.data;

  if (!job) {
    return (
      <div className='flex-1 min-h-0 bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <Typography as='h2' variant='pageTitle' className='mb-2'>Job not found</Typography>
          {onBack && (
            <button
              onClick={onBack}
              className='text-blue-600 hover:text-blue-700 transition'
            >
              ← Back to Restore Center
            </button>
          )}
        </div>
      </div>
    );
  }

  const status = job.status || 'PENDING';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const jobName = job.jobDetail?.name || 'Untitled Restore';
  const jobId_display = job.restoreId;
  const createdAt = job.createdAt;
  const updatedAt = job.updatedAt || job.completedAt;
  const objects: any[] = job.destination?.objects || [];
  const totalPages = Math.max(1, Math.ceil(objects.length / ITEMS_PER_PAGE));
  const paginatedObjects = objects.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const runtime = updatedAt && createdAt
    ? (() => {
        const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
        const s = Math.floor(ms / 1000);
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
      })()
    : '—';

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0'>

        {/* Header */}
        <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm flex-shrink-0'>
          <div className='flex items-center gap-3'>
            {onBack && (
              <button
                onClick={onBack}
                className='rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition'
              >
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
                  <path d='M19 12H5M12 19l-7-7 7-7' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </button>
            )}
            <div>
              <Typography as='h2' variant='pageTitle'>Restore Details</Typography>
              <Typography variant='bodySm' color='muted' className='mt-0.5'>{jobName}</Typography>
            </div>
          </div>
        </div>

        {/* Success/Status Card */}
        <div className='rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm flex-shrink-0 flex flex-col items-center'>
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${status === 'DONE' ? 'bg-green-100' : status === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <span className={`text-3xl font-bold ${statusConfig.cls}`}>{statusConfig.icon}</span>
          </div>
          <h3 className={`mt-4 text-xl font-bold ${statusConfig.cls}`}>
            Restore {statusConfig.label.split(' ')[1]}
          </h3>
          <p className='mt-2 text-sm text-gray-600 text-center'>
            Job ID: {jobId_display} · Runtime: {runtime} · {createdAt ? new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
        </div>

        {/* Summary Stats */}
        <div className='grid grid-cols-4 gap-3 flex-shrink-0'>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
            <p className='text-xs text-gray-600 font-semibold'>Records Restored</p>
            <p className='mt-2 text-lg font-bold text-green-600'>—</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
            <p className='text-xs text-gray-600 font-semibold'>Failed</p>
            <p className='mt-2 text-lg font-bold text-red-600'>—</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
            <p className='text-xs text-gray-600 font-semibold'>Skipped</p>
            <p className='mt-2 text-lg font-bold text-gray-600'>—</p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
            <p className='text-xs text-gray-600 font-semibold'>API Calls Used</p>
            <p className='mt-2 text-lg font-bold text-gray-900'>—</p>
          </div>
        </div>

        {/* Per-Object Breakdown */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm flex-shrink-0 overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h3 className='font-semibold text-gray-900'>Per-Object Breakdown</h3>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  {['Object', 'Created', 'Updated', 'Failed', 'Skipped'].map((col) => (
                    <th key={col} className='px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide'>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedObjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-6 py-4 text-center text-sm text-gray-400'>No objects data available</td>
                  </tr>
                ) : paginatedObjects.map((obj: any) => (
                  <tr key={obj.id || obj.name} className='border-b border-gray-100 hover:bg-gray-50'>
                    <td className='px-6 py-3 font-medium text-gray-900'>{obj.name}</td>
                    <td className='px-6 py-3 text-gray-700'>—</td>
                    <td className='px-6 py-3 text-gray-700'>—</td>
                    <td className='px-6 py-3 text-red-600 font-semibold'>—</td>
                    <td className='px-6 py-3 text-gray-700'>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className='flex items-center justify-between border-t border-gray-100 px-5 py-3'>
              <p className='text-xs text-gray-500'>Showing {paginatedObjects.length} of {objects.length} objects</p>
              <div className='flex items-center gap-1'>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition',
                      page === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                    ].join(' ')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Failed Records */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm flex-shrink-0 overflow-hidden'>
          <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
            <h3 className='font-semibold text-gray-900'>Failed Records</h3>
            {status === 'PARTIAL' && (
              <button className='flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition'>
                <svg viewBox='0 0 24 24' fill='currentColor' className='w-3.5 h-3.5'>
                  <polygon points='5 3 19 12 5 21 5 3' />
                </svg>
                Re-run Failed Only
              </button>
            )}
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  {['Record ID', 'Object', 'Reason'].map((col) => (
                    <th key={col} className='px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide'>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className='border-b border-gray-100 hover:bg-gray-50'>
                  <td className='px-6 py-3 font-medium text-gray-900'>001xx042</td>
                  <td className='px-6 py-3 text-gray-700'>Account</td>
                  <td className='px-6 py-3 text-gray-700'>Validation: Phone required</td>
                </tr>
                <tr className='border-b border-gray-100 hover:bg-gray-50'>
                  <td className='px-6 py-3 font-medium text-gray-900'>001xx071</td>
                  <td className='px-6 py-3 text-gray-700'>Account</td>
                  <td className='px-6 py-3 text-gray-700'>Missing: BillingCountry</td>
                </tr>
                <tr className='border-b border-gray-100 hover:bg-gray-50'>
                  <td className='px-6 py-3 font-medium text-gray-900'>003xx142</td>
                  <td className='px-6 py-3 text-gray-700'>Contact</td>
                  <td className='px-6 py-3 text-gray-700'>Owner mapping failed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
