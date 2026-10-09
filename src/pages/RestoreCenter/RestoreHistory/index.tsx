import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import Table from '../../../components/Table';
import type { TableColumn } from '../../../components/Table';
import { useRestoreService } from '../../../services/restore/restore.service';


function DownloadCsvButton({ restoreJobId, objectName, disabled }: { restoreJobId: string; objectName: string; disabled: boolean }) {
  const restoreService = useRestoreService();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await restoreService.downloadCsv(restoreJobId, objectName);
      const files = res?.data?.files ?? [];

      files.forEach((f) => {
        const a = document.createElement('a');
        a.href = f.url;
        a.download = f.fileName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || loading}
      className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed'
      style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC', border: '1px solid rgba(21,93,252,0.2)' }}
    >
      {loading ? (
        <svg className='w-3 h-3 animate-spin' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
        </svg>
      ) : (
        <svg className='w-3 h-3' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' /><polyline points='7 10 12 15 17 10' /><line x1='12' y1='15' x2='12' y2='3' />
        </svg>
      )}
      {loading ? 'Downloading…' : 'Download CSV'}
    </button>
  );
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  SUCCESS:               { label: '✓ Success',          cls: 'text-green-600',  icon: '✓' },
  COMPLETED:             { label: '✓ Completed',         cls: 'text-green-600',  icon: '✓' },
  DONE:                  { label: '✓ Done',              cls: 'text-green-600',  icon: '✓' },
  PARTIAL_FAILURE:       { label: '⚠ Partial',           cls: 'text-yellow-600', icon: '⚠' },
  PARTIAL:               { label: '⚠ Partial',           cls: 'text-yellow-600', icon: '⚠' },
  FAILED:                { label: '✗ Failed',            cls: 'text-red-600',    icon: '✗' },
  CANCELLED:             { label: '⊘ Cancelled',         cls: 'text-gray-500',   icon: '⊘' },
  ROLLED_BACK:           { label: '↩ Rolled Back',       cls: 'text-gray-600',   icon: '↩' },
  DRAFT:                 { label: '📝 Draft',            cls: 'text-orange-600', icon: '📝' },
  PENDING:               { label: '⏳ Pending',          cls: 'text-blue-600',   icon: '⏳' },
  RUNNING:               { label: '⏳ Running',          cls: 'text-blue-600',   icon: '⏳' },
  IN_PROGRESS:           { label: '⏳ In Progress',      cls: 'text-blue-600',   icon: '⏳' },
  CSV_CREATING:          { label: '⏳ Creating CSV',     cls: 'text-blue-600',   icon: '⏳' },
  INGEST_IN_PROGRESS:    { label: '⏳ Ingesting',        cls: 'text-blue-600',   icon: '⏳' },
  ROLLBACK_IN_PROGRESS:  { label: '↩ Rolling Back',      cls: 'text-purple-600', icon: '↩' },
  ROLLBACK_COMPLETED:    { label: '↩ Rolled Back',       cls: 'text-gray-600',   icon: '↩' },
  ROLLBACK_FAILED:       { label: '✗ Rollback Failed',   cls: 'text-red-600',    icon: '✗' },
};

interface Props {
  onBack?: () => void;
  jobId?: string;
  isExport?: boolean;
}

export default function RestoreHistory({ onBack, jobId, isExport: isExportProp = false }: Props) {
  const restoreService = useRestoreService();
  const queryClient = useQueryClient();
  const [errorPanel, setErrorPanel] = useState<{ obj: any } | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const rollbackMutation = useMutation({
    mutationFn: (restoreId: string) => restoreService.rollbackRestoreJob(restoreId),
    onSuccess: () => {
      setShowRollbackConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['restore-job-detail', jobId] });
    },
    onError: (err: any) => {
      setRollbackError(err?.message ?? 'Rollback failed. Please try again.');
    },
  });

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

  const rawStatus = (job.status || 'PENDING').toUpperCase();
  const jobName = job.name || job.jobDetail?.name || 'Untitled Restore';
  const jobId_display = job.restoreJobId;
  const createdAt = job.createdAt;
  const updatedAt = job.updatedAt || job.completedAt;
  const objects: any[] = job.destination?.objects || [];

  // Summary stats derived from objects array
  const totalProcessed = objects.reduce((s: number, o: any) => s + (o.processedRecordCount ?? 0), 0);
  const totalFailed    = objects.reduce((s: number, o: any) => s + (o.failedRecordCount ?? 0), 0);
  const totalSuccess   = totalProcessed - totalFailed;

  const destType = (
    job.destination?.type ??
    job.jobDetail?.destination?.type ??
    job.jobDetail?.destinationType ??
    job.destinationType ??
    job.type ??
    ''
  ).toUpperCase();
  // Detect export by explicit type OR by presence of csvCount on objects (new API shape)
  const isExportJob = isExportProp || destType.includes('EXPORT') || objects.some((o: any) => o.csvCount !== undefined);

  // Derive effective status from per-object statuses to detect rollback state.
  // Backend sets job.status = PENDING during rollback; the real phase lives in per-object statuses.
  const objStatuses = objects.map((o: any) => (o.status as string)?.toUpperCase() ?? '');
  const hasRollbackInProgress = objStatuses.some((s) => s === 'ROLLBACK_IN_PROGRESS');
  const hasRollbackFailed     = objStatuses.some((s) => s === 'ROLLBACK_FAILED');
  const allRollbackDone       = objects.length > 0 && objStatuses.some((s) => s === 'ROLLBACK_COMPLETED') && objStatuses.every((s) => s === 'ROLLBACK_COMPLETED' || s === 'SUCCESS');

  const status: string = hasRollbackInProgress
    ? 'ROLLBACK_IN_PROGRESS'
    : hasRollbackFailed
      ? 'ROLLBACK_FAILED'
      : allRollbackDone && rawStatus !== 'FAILED'
        ? 'ROLLBACK_COMPLETED'
        : rawStatus;

  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  const isJobReady  = ['DONE', 'SUCCESS', 'COMPLETED', 'PARTIAL', 'PARTIAL_FAILURE', 'FAILED', 'CANCELLED', 'ROLLBACK_COMPLETED', 'ROLLBACK_FAILED'].includes(status);
  const canRollback = ['DONE', 'SUCCESS', 'COMPLETED', 'PARTIAL_FAILURE'].includes(status);

  // Source backup/archival config info
  const sourceConfig = job.source?.backupConfig as any;
  const sourceConfigType = sourceConfig?.type?.toUpperCase() === 'NORMAL' ? 'Backup' : sourceConfig?.type ? 'Archival' : null;
  const sourceDatasetLabel: Record<string, string> = { PARTIAL: 'Partial', FULL: 'Full', INCREMENTAL: 'Incremental' };
  const sourceScheduleLabel: Record<string, string> = { REALTIME: 'Real-time', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', HOURLY: 'Hourly', MANUAL: 'Manual' };
  const sourceDataset  = sourceConfig?.dataset  ? (sourceDatasetLabel[sourceConfig.dataset.toUpperCase()]  ?? sourceConfig.dataset)  : null;
  const sourceSchedule = sourceConfig?.schedule ? (sourceScheduleLabel[sourceConfig.schedule.toUpperCase()] ?? sourceConfig.schedule) : null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const statusBadge = (rowStatus: string) => {
    const s = (rowStatus as string)?.toUpperCase();
    const style =
      s === 'SUCCESS'              ? { bg: 'rgba(0,128,32,0.1)',   color: '#008020' } :
      s === 'FAILED'               ? { bg: 'rgba(242,68,0,0.1)',   color: '#F24400' } :
      s === 'PARTIAL_FAILURE'      ? { bg: 'rgba(217,119,6,0.1)',  color: '#D97706' } :
      s === 'CANCELLED'            ? { bg: 'rgba(107,114,128,0.1)',color: '#6B7280' } :
      s === 'ROLLBACK_COMPLETED'   ? { bg: 'rgba(107,114,128,0.1)',color: '#6B7280' } :
      s === 'RESTORE_IN_PROGRESS' || s === 'ROLLBACK_IN_PROGRESS' ? { bg: 'rgba(21,93,252,0.1)', color: '#155DFC' } :
      (s === 'PENDING' || s === 'RUNNING' || s === 'IN_PROGRESS' || s === 'CSV_CREATING' || s === 'INGEST_IN_PROGRESS') ? { bg: 'rgba(234,179,8,0.1)', color: '#A16207' } :
                                     { bg: '#F3F4F6',               color: '#374151' };
    const labelMap: Record<string, string> = {
      SUCCESS: 'Success', FAILED: 'Failed', PARTIAL_FAILURE: 'Partial Failure',
      CANCELLED: 'Cancelled', ROLLBACK_COMPLETED: 'Rolled Back',
      RESTORE_IN_PROGRESS: 'Restoring', ROLLBACK_IN_PROGRESS: 'Rolling Back',
      PENDING: 'Pending', RUNNING: 'Running', IN_PROGRESS: 'In Progress',
      CSV_CREATING: 'Creating CSV', INGEST_IN_PROGRESS: 'Ingesting',
    };
    return (
      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold'
        style={{ background: style.bg, color: style.color }}>
        {labelMap[s] ?? (rowStatus || '—')}
      </span>
    );
  };

  // Export-specific aggregates
  const totalCsvFiles  = objects.reduce((s: number, o: any) => s + (o.csvCount ?? 0), 0);
  const totalSizeBytes = objects.reduce((s: number, o: any) => s + (o.sizeInBytes ?? 0), 0);

  const exportObjectColumns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'Object',
      render: (row) => (
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0' style={{ background: 'rgba(21,93,252,0.08)' }}>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14 2 14 8 20 8'/>
            </svg>
          </div>
          <span className='font-semibold text-gray-900 text-sm'>{row.name}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'csvCount',
      header: 'CSV Files',
      render: (row) => (
        <div className='flex items-center gap-1.5'>
          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#64748B' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14 2 14 8 20 8'/>
          </svg>
          <span className='text-sm font-semibold text-gray-800'>{row.csvCount ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'sizeInBytes',
      header: 'Size',
      render: (row) => (
        <span className='text-sm font-semibold text-gray-700'>{formatBytes(row.sizeInBytes ?? 0)}</span>
      ),
    },
    {
      key: 'download',
      header: 'Download',
      render: (row: any) => (
        <DownloadCsvButton
          restoreJobId={jobId_display}
          objectName={row.name}
          disabled={!isJobReady || (row.csvCount ?? 0) === 0}
        />
      ),
    },
  ];

  const restoreObjectColumns: TableColumn<any>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className='font-medium text-gray-900'>{row.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => statusBadge(row.status),
    },
    {
      key: 'successRecords',
      header: 'Success Records',
      render: (row) => {
        const processed = row.processedRecordCount ?? 0;
        const failed    = row.failedRecordCount ?? 0;
        return <span className='text-sm font-semibold text-green-600'>{processed - failed}</span>;
      },
    },
    {
      key: 'failedRecords',
      header: 'Failed Records',
      render: (row) => {
        const n = row.failedRecordCount ?? 0;
        return <span className='text-sm font-semibold' style={{ color: n > 0 ? '#F24400' : '#94A3B8' }}>{n}</span>;
      },
    },
    {
      key: 'errors',
      header: 'Errors',
      render: (row) => {
        const hasErrors = Array.isArray(row.errors) && row.errors.length > 0;
        if (hasErrors) {
          return (
            <button
              onClick={() => setErrorPanel({ obj: row })}
              className='inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition hover:opacity-80'
              style={{ background: 'rgba(242,68,0,0.1)', color: '#F24400', border: '1px solid rgba(242,68,0,0.2)' }}
            >
              View Errors
              <span className='ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold'
                style={{ background: '#F24400', color: '#fff' }}>
                {row.errors.length}
              </span>
            </button>
          );
        }
        if (row.errorMessage) {
          return (
            <span
              className='inline-flex items-center gap-1 text-xs font-medium max-w-[220px] truncate'
              style={{ color: '#F24400' }}
              title={row.errorMessage}
            >
              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0'>
                <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
              </svg>
              {row.errorMessage}
            </span>
          );
        }
        return <span className='text-xs text-gray-400'>—</span>;
      },
    },
  ];

  const objectColumns = isExportJob ? exportObjectColumns : restoreObjectColumns;

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
                  <p className='text-xs mt-0.5' style={{ color: '#94A3B8' }}>
                    {errorPanel.obj.errors.length} error{errorPanel.obj.errors.length !== 1 ? 's' : ''} · {errorPanel.obj.failedRecordCount ?? 0} failed record{(errorPanel.obj.failedRecordCount ?? 0) !== 1 ? 's' : ''}
                  </p>
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

            {/* Error list */}
            <div className='overflow-y-auto flex-1 px-5 py-4'>
              {errorPanel.obj.errorMessage && (
                <div className='mb-3 rounded-xl px-4 py-3 flex items-start gap-2' style={{ background: 'rgba(242,68,0,0.06)', border: '1px solid rgba(242,68,0,0.15)' }}>
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                    <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                  </svg>
                  <p className='text-xs leading-relaxed font-mono break-all' style={{ color: '#B91C1C' }}>{errorPanel.obj.errorMessage}</p>
                </div>
              )}
              {(errorPanel.obj.errors as string[]).length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 gap-2'>
                  <div className='w-10 h-10 rounded-full flex items-center justify-center' style={{ background: '#F1F5F9' }}>
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#94A3B8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='10'/><polyline points='20 6 9 17 4 12'/>
                    </svg>
                  </div>
                  <p className='text-sm font-medium' style={{ color: '#64748B' }}>No errors for this object</p>
                </div>
              ) : (
                <div className='flex flex-col gap-2'>
                  {(errorPanel.obj.errors as string[]).map((err, i) => (
                    <div key={i} className='rounded-xl p-4' style={{ background: i % 2 === 0 ? '#FAFAFA' : '#FFF', border: '1px solid #F1F5F9' }}>
                      <div className='flex items-center gap-2 mb-2'>
                        <span className='text-xs font-semibold uppercase tracking-wide' style={{ color: '#94A3B8' }}>Error</span>
                        <span className='font-mono text-xs px-2 py-0.5 rounded-md font-semibold'
                          style={{ background: 'rgba(242,68,0,0.08)', color: '#F24400' }}>
                          #{i + 1}
                        </span>
                      </div>
                      <p className='text-xs leading-relaxed font-mono break-all' style={{ color: '#374151' }}>{err}</p>
                    </div>
                  ))}
                </div>
              )}
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
          {!isExportJob && (
            <button
              onClick={() => { setRollbackError(null); setShowRollbackConfirm(true); }}
              disabled={!canRollback}
              title={!canRollback ? 'Rollback is only available after a successful restore' : undefined}
              className='flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-50 disabled:hover:border-orange-300'
            >
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M3 7v6h6' /><path d='M3 13C5.5 6 13 3 20 7' />
              </svg>
              Rollback
            </button>
          )}
        </div>

        {showRollbackConfirm && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
            <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4' onClick={(e) => e.stopPropagation()}>
              <div className='flex items-start gap-3'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100'>
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#C2410C' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M3 7v6h6' /><path d='M3 13C5.5 6 13 3 20 7' />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-bold text-gray-900'>Rollback Restore Job</h3>
                  <p className='mt-1 text-sm text-gray-600'>
                    This will undo all changes made by <span className='font-semibold'>"{jobName}"</span>. This action cannot be undone. Are you sure you want to proceed?
                  </p>
                </div>
              </div>
              {rollbackError && (
                <div className='rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600'>{rollbackError}</div>
              )}
              <div className='flex justify-end gap-3 pt-1'>
                <button
                  onClick={() => setShowRollbackConfirm(false)}
                  disabled={rollbackMutation.isPending}
                  className='px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={() => rollbackMutation.mutate(jobId_display)}
                  disabled={rollbackMutation.isPending}
                  className='px-4 py-2 text-sm font-semibold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2'
                >
                  {rollbackMutation.isPending && <span className='w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin' />}
                  {rollbackMutation.isPending ? 'Rolling back…' : 'Yes, Rollback'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success/Status Card */}
        <div className='rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm flex-shrink-0 flex flex-col items-center'>
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
            ['SUCCESS', 'DONE', 'COMPLETED', 'ROLLBACK_COMPLETED'].includes(status)
              ? (isExportJob ? 'bg-blue-100' : status === 'ROLLBACK_COMPLETED' ? 'bg-gray-100' : 'bg-green-100')
              : ['FAILED', 'ROLLBACK_FAILED'].includes(status) ? 'bg-red-100'
              : ['ROLLBACK_IN_PROGRESS'].includes(status) ? 'bg-purple-100'
              : 'bg-yellow-100'
          }`}>
            {isExportJob ? (
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke={status === 'FAILED' ? '#F24400' : '#155DFC'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/>
              </svg>
            ) : (
              <span className={`text-3xl font-bold ${statusConfig.cls}`}>{statusConfig.icon}</span>
            )}
          </div>
          <h3 className={`mt-4 text-xl font-bold ${isExportJob ? (status === 'FAILED' ? 'text-red-600' : 'text-blue-600') : statusConfig.cls}`}>
            {(() => {
              const labelText = statusConfig.label.replace(/^[^\s]+\s/, ''); // strip icon prefix
              if (isExportJob) return `CSV Export ${labelText}`;
              if (['ROLLBACK_IN_PROGRESS', 'ROLLBACK_COMPLETED', 'ROLLBACK_FAILED'].includes(status)) return labelText;
              return `Restore ${labelText}`;
            })()}
          </h3>
          <p className='mt-2 text-sm text-gray-600 text-center'>
            <span className='font-bold text-gray-800'>Job ID:</span> {jobId_display} · <span className='font-bold text-gray-800'>Runtime:</span> {runtime} · {createdAt ? new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
          </p>
        </div>

        {/* Job-level failure reason banner */}
        {(status === 'FAILED' || status === 'PARTIAL_FAILURE') && job.errorMessage && (
          <div className='rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex-shrink-0 flex items-start gap-3'>
            <div className='flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center' style={{ background: 'rgba(242,68,0,0.12)' }}>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
              </svg>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-xs font-bold text-red-700 uppercase tracking-wide mb-1'>Failure Reason</p>
              <p className='text-sm text-red-800 break-words leading-relaxed'>{job.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Restore Specifications — source config + scope + conflict settings combined */}
        {(job.source?.type || job.selection?.restoreScope?.type || job.conflict) && (() => {
          const SOURCE_TYPE_LABELS: Record<string, string> = {
            ENTIRE:          'Entire Backup',
            CHANGED_BETWEEN: 'Changed Between',
          };
          const SCOPE_LABELS: Record<string, string> = {
            ALL: 'Full Restore', OBJECT: 'By Object', RECORD: 'By Record',
            FIELD: 'By Field', FILTER: 'Custom Filter', BULK_CSV: 'Bulk CSV', DELETED_ONLY: 'Deleted Only',
          };
          const EDGE_CASE_LABELS: Record<string, string> = {
            missingFieldInDestination: 'Missing Field',
            ownerInactive:             'Inactive Owner',
            includeAuditFields:        'Audit Fields',
            recordTypeMissing:         'Record Type Missing',
            missingRequiredFieldValue: 'Required Field Missing',
            parentMissing:             'Parent Missing',
          };
          const VALUE_LABELS: Record<string, string> = {
            SKIP_THE_FIELD:       'Skip Field',
            SKIP_RECORD:          'Skip Record',
            SKIP_THE_RECORD:      'Skip Record',
            SKIP:                 'Skip',
            RESTORE_PARENT_FIRST: 'Restore Parent First',
            Include:              'Include',
            Exclude:              'Exclude',
            OVERWRITE:            'Overwrite',
            INSERT_ONLY:          'Insert Only',
            UPSERT:               'Upsert',
          };
          // colour coding by action semantics
          const valueStyle = (v: string): { bg: string; color: string } => {
            const u = v.toUpperCase();
            if (u.includes('SKIP')) return { bg: 'rgba(217,119,6,0.1)', color: '#B45309' };
            if (u === 'RESTORE_PARENT_FIRST' || u === 'INCLUDE') return { bg: 'rgba(21,93,252,0.08)', color: '#155DFC' };
            if (u === 'OVERWRITE') return { bg: 'rgba(124,58,237,0.1)', color: '#7C3AED' };
            return { bg: '#F1F5F9', color: '#374151' };
          };

          const fmtDate = (d: string) =>
            new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

          const srcType    = job.source?.type as string | undefined;
          const scopeType  = job.selection?.restoreScope?.type as string | undefined;
          const conflict   = job.conflict as any;
          const edgeCases  = conflict?.edgeCases as Record<string, any> | undefined;
          const restoreMode = conflict?.restoreMode as string | undefined;

          return (
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm flex-shrink-0 overflow-hidden'>
              <div className='flex items-center gap-2 px-5 py-3 border-b border-gray-100'>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#6B7280' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M9 11l3 3L22 4'/><path d='M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11'/>
                </svg>
                <span className='text-sm font-semibold text-gray-700'>Restore Specifications</span>
              </div>

              <div className='divide-y divide-gray-50'>

                {/* ── Row 0: Backup / Archival Source Config ── */}
                {sourceConfig !== undefined && sourceConfig !== null && (
                  <div className='px-5 py-3 flex flex-wrap items-center gap-2'>
                    <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-24 flex-shrink-0'>Source Config</span>
                    <div className='flex flex-wrap items-center gap-2 flex-1'>
                      {!sourceConfig.name ? (
                        <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px] text-gray-500'>
                          <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='#9CA3AF' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6'/>
                          </svg>
                          Config deleted
                        </span>
                      ) : (
                        <>
                          <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-100'
                            style={{ background: sourceConfigType === 'Backup' ? 'rgba(21,93,252,0.06)' : 'rgba(124,58,237,0.06)' }}>
                            <span className='text-[10px] font-bold' style={{ color: sourceConfigType === 'Backup' ? '#155DFC' : '#7C3AED' }}>
                              {sourceConfig.name}
                            </span>
                            {sourceConfigType && (
                              <span className='text-[9px] font-semibold px-1.5 py-0.5 rounded-full'
                                style={{ background: sourceConfigType === 'Backup' ? 'rgba(21,93,252,0.12)' : 'rgba(124,58,237,0.12)', color: sourceConfigType === 'Backup' ? '#155DFC' : '#7C3AED' }}>
                                {sourceConfigType}
                              </span>
                            )}
                          </div>
                          {sourceConfigType !== 'Archival' && sourceDataset && (
                            <div className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px]'>
                              <span className='text-gray-400 font-medium'>Dataset</span>
                              <span className='font-bold text-gray-800'>{sourceDataset}</span>
                            </div>
                          )}
                          {sourceConfigType !== 'Archival' && sourceSchedule && (
                            <div className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px]'>
                              <span className='text-gray-400 font-medium'>Schedule</span>
                              <span className='font-bold text-gray-800'>{sourceSchedule}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Row 1: Source & Scope ── */}
                {(srcType || scopeType) && (
                  <div className='px-5 py-3 flex flex-wrap items-center gap-2'>
                    <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-24 flex-shrink-0'>Source & Scope</span>
                    <div className='flex flex-wrap gap-2 flex-1'>
                      {srcType && (
                        <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100'>
                          <span className='text-[10px] text-gray-400 font-medium'>Type</span>
                          <span className='text-[10px] font-bold text-gray-800'>{SOURCE_TYPE_LABELS[srcType] ?? srcType}</span>
                        </div>
                      )}
                      {srcType === 'CHANGED_BETWEEN' && job.source?.startDate && (
                        <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100'>
                          <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                          </svg>
                          <span className='text-[10px] font-bold text-blue-800'>
                            {fmtDate(job.source.startDate)}
                            <span className='mx-1 font-normal text-blue-400'>→</span>
                            {job.source.endDate ? fmtDate(job.source.endDate) : '—'}
                          </span>
                        </div>
                      )}
                      {scopeType && (
                        <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100'>
                          <span className='text-[10px] text-gray-400 font-medium'>Scope</span>
                          <span className='text-[10px] font-bold text-gray-800'>{SCOPE_LABELS[scopeType] ?? scopeType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Row 2: Restore Mode ── */}
                {restoreMode && (
                  <div className='px-5 py-3 flex flex-wrap items-center gap-2'>
                    <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-24 flex-shrink-0'>Restore Mode</span>
                    <div className='flex flex-wrap gap-2 flex-1'>
                      {(() => {
                        const s = valueStyle(restoreMode);
                        return (
                          <span className='inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold'
                            style={{ background: s.bg, color: s.color }}>
                            {VALUE_LABELS[restoreMode] ?? restoreMode}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ── Row 3: Edge Cases ── */}
                {edgeCases && Object.keys(edgeCases).length > 0 && (
                  <div className='px-5 py-3 flex flex-wrap items-start gap-2'>
                    <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-24 flex-shrink-0 pt-1'>Edge Cases</span>
                    <div className='flex flex-wrap gap-1.5 flex-1'>
                      {Object.entries(edgeCases).map(([key, val]) => {
                        const rawVal = typeof val === 'object' && val !== null ? (val as any).type : String(val);
                        const s = valueStyle(rawVal);
                        return (
                          <div key={key} className='inline-flex items-center rounded-lg border border-gray-100 overflow-hidden text-[10px]'>
                            <span className='px-2 py-1 bg-gray-50 text-gray-500 font-medium border-r border-gray-100'>
                              {EDGE_CASE_LABELS[key] ?? key}
                            </span>
                            <span className='px-2 py-1 font-bold' style={{ background: s.bg, color: s.color }}>
                              {VALUE_LABELS[rawVal] ?? rawVal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })()}

        {/* Summary Stats */}
        {isExportJob ? (
          <div className='grid grid-cols-3 gap-3 flex-shrink-0'>
            <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-6 h-6 rounded-md flex items-center justify-center' style={{ background: 'rgba(21,93,252,0.08)' }}>
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14 2 14 8 20 8'/>
                  </svg>
                </div>
                <p className='text-xs text-gray-600 font-semibold'>Total CSV Files</p>
              </div>
              <p className='text-lg font-bold text-blue-600'>{totalCsvFiles.toLocaleString()}</p>
            </div>
            <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-6 h-6 rounded-md flex items-center justify-center' style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#059669' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                  </svg>
                </div>
                <p className='text-xs text-gray-600 font-semibold'>Total Size</p>
              </div>
              <p className='text-lg font-bold text-gray-900'>{formatBytes(totalSizeBytes)}</p>
            </div>
            <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-6 h-6 rounded-md flex items-center justify-center' style={{ background: 'rgba(107,114,128,0.08)' }}>
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#6B7280' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/>
                  </svg>
                </div>
                <p className='text-xs text-gray-600 font-semibold'>Objects Exported</p>
              </div>
              <p className='text-lg font-bold text-gray-900'>{objects.length}</p>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-4 gap-3 flex-shrink-0'>
            <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
              <p className='text-xs text-gray-600 font-semibold'>Records Restored</p>
              <p className='mt-2 text-lg font-bold text-green-600'>{totalSuccess.toLocaleString()}</p>
            </div>
            <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
              <p className='text-xs text-gray-600 font-semibold'>Failed</p>
              <p className='mt-2 text-lg font-bold text-red-600'>{totalFailed.toLocaleString()}</p>
            </div>
            <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
              <p className='text-xs text-gray-600 font-semibold'>Total Processed</p>
              <p className='mt-2 text-lg font-bold text-gray-900'>{totalProcessed.toLocaleString()}</p>
            </div>
            <div className='rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm'>
              <p className='text-xs text-gray-600 font-semibold'>Objects</p>
              <p className='mt-2 text-lg font-bold text-gray-900'>{objects.length}</p>
            </div>
          </div>
        )}

        {/* Per-Object Breakdown */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm flex-shrink-0 overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
            <h3 className='font-semibold text-gray-900'>{isExportJob ? 'Exported Objects' : 'Per-Object Breakdown'}</h3>
            {isExportJob && (
              <span className='inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full' style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC' }}>
                <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>
                </svg>
                CSV Export
              </span>
            )}
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
