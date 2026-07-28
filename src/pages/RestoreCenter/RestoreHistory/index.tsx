import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import Table from '../../../components/Table';
import type { TableColumn } from '../../../components/Table';
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

export default function RestoreHistory({ onBack, jobId }: Props) {
  const restoreService = useRestoreService();

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

  const [errorPanel, setErrorPanel] = useState<{ obj: any } | null>(null);

  const objectColumns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className='font-medium text-gray-900'>{row.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const cfg = STATUS_CONFIG[row.status] || { label: row.status, cls: 'bg-gray-100 text-gray-600' };
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>{cfg.label}</span>;
      },
    },
    {
      key: 'successRecords',
      header: 'Success Records',
      render: () => <span className='text-sm font-semibold text-green-600'>—</span>,
    },
    {
      key: 'failedRecords',
      header: 'Failed Records',
      render: () => <span className='text-sm font-semibold text-red-500'>—</span>,
    },
    {
      key: 'errors',
      header: 'Errors',
      render: (row) => (
        <button
          onClick={() => setErrorPanel({ obj: row })}
          className='inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition hover:opacity-80'
          style={{ background: 'rgba(242,68,0,0.1)', color: '#F24400', border: '1px solid rgba(242,68,0,0.2)' }}
        >
          View Errors
        </button>
      ),
    },
  ];

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

      {/* ── Error Records Popup ─────────────────────────────────────────── */}
      {errorPanel && (
        <div
          className='fixed inset-0 z-[70] flex items-center justify-center p-4'
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setErrorPanel(null)}
        >
          <div
            className='bg-white rounded-2xl w-full flex flex-col overflow-hidden'
            style={{ maxWidth: '660px', maxHeight: '75vh', boxShadow: '0 32px 80px rgba(0,0,0,0.22)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className='flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0'
              style={{ background: 'linear-gradient(135deg,#FFF5F5 0%,#FFF 60%)', borderBottom: '1px solid #FFE4E1' }}
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0' style={{ background: 'rgba(242,68,0,0.1)' }}>
                  <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                  </svg>
                </div>
                <div>
                  <h3 className='font-bold text-sm' style={{ color: '#111827' }}>
                    Record Errors
                    <span className='ml-2 font-normal text-xs px-2 py-0.5 rounded-full' style={{ background: 'rgba(242,68,0,0.1)', color: '#F24400' }}>
                      {errorPanel.obj.name}
                    </span>
                  </h3>
                  <p className='text-xs mt-0.5' style={{ color: '#94A3B8' }}>Failed records for this object</p>
                </div>
              </div>
              <button
                onClick={() => setErrorPanel(null)}
                className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition'
                style={{ color: '#94A3B8' }}
              >
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M18 6L6 18M6 6l12 12'/>
                </svg>
              </button>
            </div>

            {/* Records list — placeholder until API is wired */}
            <div className='overflow-y-auto flex-1 px-5 py-4'>
              <div className='flex flex-col items-center justify-center py-12 gap-2'>
                <div className='w-10 h-10 rounded-full flex items-center justify-center' style={{ background: '#F1F5F9' }}>
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#94A3B8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                  </svg>
                </div>
                <p className='text-sm font-medium' style={{ color: '#64748B' }}>No error records loaded yet</p>
                <p className='text-xs' style={{ color: '#94A3B8' }}>API will be wired here</p>
              </div>
            </div>
          </div>
        </div>
      )}
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
          <Table
            columns={objectColumns}
            rows={objects}
            getRowKey={(row) => row.id || row.name}
            emptyState='No objects data available.'
            rowClassName='border-b border-gray-100 hover:bg-gray-50'
            cellPaddingClassName='px-6 py-3'
            showPagination
            itemsPerPage={10}
          />
        </div>
      </div>
    </div>
  );
}
