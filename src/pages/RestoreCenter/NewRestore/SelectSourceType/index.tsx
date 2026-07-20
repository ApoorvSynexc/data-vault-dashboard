import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../../components/Typography';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';
import { useRestoreService } from '../../../../services/restore/restore.service';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { formatBytes, formatDateTime } from '../../../../utils';
import type { Destination } from '../../../../services/destination/destination.service';
import dayjs from 'dayjs';

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'backup' | 'archive';
type BackupMode = 'list' | 'pit';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='w-full'>
      {/* Row 1: circles + connector lines */}
      <div className='flex items-center'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold border-2 ${
                isDone   ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-blue-600 border-blue-600 text-white' :
                           'bg-white border-gray-300 text-gray-400'
              }`}>
                {isDone ? (
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='w-3.5 h-3.5'>
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                ) : num}
              </div>
              {!isLast && <div className='flex-1 h-0.5' style={{ background: isDone ? '#22C55E' : '#E5E7EB' }} />}
            </div>
          );
        })}
      </div>
      {/* Row 2: labels — same flex structure mirrors row 1 so each label is under its circle */}
      <div className='flex items-start mt-2'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'
              }`}>
                {label}
              </span>
              {!isLast && <div className='flex-1' />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Source type cards ─────────────────────────────────────────────────────────

const SOURCE_TYPES: { id: SourceType; icon: React.ReactNode; title: string; desc: string }[] = [
  {
    id: 'backup',
    icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-.29-4.36'/></svg>,
    title: 'Backup Snapshot',
    desc: 'Point-in-time backup with change history',
  },
  {
    id: 'archive',
    icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M5 8l4 4 4-4'/><rect x='3' y='3' width='18' height='18' rx='2'/></svg>,
    title: 'Archive Vault Entry',
    desc: 'Cold/warm archived records',
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export interface SourceSelection {
  configType: 'BACKUP' | 'ARCHIVAL';
  backupConfigId: string;       // for ARCHIVAL
  backupJobIds: string[];       // for BACKUP (selected snapshot job IDs)
}

interface Props {
  onNext: (selection: SourceSelection) => void;
  onBack: () => void;
  selectedConnection: Destination | null;
}

export default function SelectSourceType({ onNext, onBack, selectedConnection }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>('backup');
  const [backupMode, setBackupMode] = useState<BackupMode>('list');
  const [selectedBackup, setSelectedBackup] = useState<Set<string>>(new Set());
  const [selectedBackupRows, setSelectedBackupRows] = useState<any[]>([]);
  const [selectedBackupConfigId, setSelectedBackupConfigId] = useState<string>('');

  // ── Jobs phase ────────────────────────────────────────────────────────────
  const [showJobsPhase, setShowJobsPhase] = useState(false);
  const [selectedBackupSlug, setSelectedBackupSlug] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jobsCursor, setJobsCursor] = useState<string | null>(null);
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1);
  const [jobsCursorStack, setJobsCursorStack] = useState<{ page: number; cursor: string }[]>([]);

  const restoreService = useRestoreService();
  const backupConfigService = useBackupConfigService();

  // ── Backup config list state (cursor pagination) ──────────────────────────
  const [backupSearch, setBackupSearch] = useState('');
  const [backupCurrentPage, setBackupCurrentPage] = useState(1);
  const [backupCurrentCursor, setBackupCurrentCursor] = useState<string | null>(null);
  const [backupCursorStack, setBackupCursorStack] = useState<{ page: number; cursor: string }[]>([]);

  const backupQueryFn = useCallback(
    () => backupConfigService.listBackupConfigs(true, backupCurrentCursor ?? undefined, backupSearch || undefined),
    [backupCurrentCursor, backupSearch]
  );

  const { data: backupListData, isLoading: isLoadingJobs, isFetching: isFetchingJobs } = useQuery({
    queryKey: ['restore-backup-config-list', backupCurrentCursor, backupSearch],
    queryFn: backupQueryFn,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const backupListRows: any[] = Array.isArray((backupListData as any)?.data) ? (backupListData as any).data : [];
  const backupMeta = (backupListData as any)?.meta ?? { limit: 25, nextCursor: null, totalRecords: backupListRows.length };

  const goToBackupPage = useCallback((page: number, cursor: string | null) => {
    setBackupCurrentPage(page);
    setBackupCurrentCursor(cursor);
  }, []);

  const goBackupNext = () => {
    if (!backupMeta.nextCursor) return;
    setBackupCursorStack((prev) => [...prev, { page: backupCurrentPage, cursor: backupCurrentCursor ?? '' }]);
    goToBackupPage(backupCurrentPage + 1, backupMeta.nextCursor);
  };

  const goBackupPrev = () => {
    const stack = [...backupCursorStack];
    const prev = stack.pop();
    setBackupCursorStack(stack);
    if (prev) goToBackupPage(prev.page, prev.cursor);
    else goToBackupPage(1, null);
  };

  const goBackupToPage1 = () => {
    setBackupCursorStack([]);
    goToBackupPage(1, null);
  };

  // ── Backup jobs query (phase 2) ───────────────────────────────────────────
  const JOBS_PAGE_SIZE = 20;

  const { data: jobsData, isLoading: isLoadingJobsList, isFetching: isFetchingJobsList } = useQuery({
    queryKey: ['restore-backup-jobs', selectedBackupSlug, jobsCursor],
    queryFn: () => backupConfigService.listBackupJobs(selectedBackupSlug, true, jobsCursor ?? undefined, JOBS_PAGE_SIZE),
    enabled: showJobsPhase && !!selectedBackupSlug,
    staleTime: 30_000,
  });

  const jobsRows: any[] = (jobsData as any)?.data ?? [];
  const jobsMeta = (jobsData as any)?.meta ?? { nextCursor: null, totalRecords: 0 };

  const goJobsNext = () => {
    if (!jobsMeta.nextCursor) return;
    setJobsCursorStack((prev) => [...prev, { page: jobsCurrentPage, cursor: jobsCursor ?? '' }]);
    setJobsCurrentPage((p) => p + 1);
    setJobsCursor(jobsMeta.nextCursor);
  };

  const goJobsPrev = () => {
    const stack = [...jobsCursorStack];
    const prev = stack.pop();
    setJobsCursorStack(stack);
    setJobsCurrentPage(prev ? prev.page : 1);
    setJobsCursor(prev ? (prev.cursor || null) : null);
  };

  const goJobsToPage1 = () => {
    setJobsCursorStack([]);
    setJobsCurrentPage(1);
    setJobsCursor(null);
  };

  // ── Archive sub-picker state ──────────────────────────────────────────────
  const [archiveFilterName, setArchiveFilterName] = useState('');
  const [archiveCursorStack, setArchiveCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [archivePageIndex, setArchivePageIndex] = useState(0);
  const [archivePageLogs, setArchivePageLogs] = useState<any[]>([]);
  const [archiveNextCursor, setArchiveNextCursor] = useState<string | undefined>(undefined);
  const [selectedArchiveKey, setSelectedArchiveKey] = useState<string>('');

  const archiveCurrentCursor = archiveCursorStack[archivePageIndex];

  const { isLoading: isLoadingArchive, isFetching: isFetchingArchive } = useQuery<unknown>({
    queryKey: ['snapshot-logs-archive', selectedConnection?.destinationId, archiveCurrentCursor],
    queryFn: async () => {
      const res = await restoreService.getSnapshotLogs({
        snapshotType: 'ARCHIVAL',
        destinationId: selectedConnection!.destinationId,
        limit: 10,
        cursor: archiveCurrentCursor,
      });
      setArchivePageLogs((res as any)?.data ?? []);
      setArchiveNextCursor((res as any)?.meta?.nextCursor);
      return res;
    },
    enabled: !!selectedConnection && sourceType === 'archive',
  });

  const goArchiveNextPage = () => {
    if (!archiveNextCursor) return;
    setArchiveCursorStack((prev) => {
      const next = [...prev];
      if (next[archivePageIndex + 1] !== archiveNextCursor) next[archivePageIndex + 1] = archiveNextCursor;
      return next;
    });
    setArchivePageIndex((p) => p + 1);
  };

  const goArchivePrevPage = () => {
    if (archivePageIndex === 0) return;
    setArchivePageIndex((p) => p - 1);
  };

  const filteredArchiveLogs = archivePageLogs.filter((log: any) => {
    if (archiveFilterName.trim()) {
      const q = archiveFilterName.trim().toLowerCase();
      if (!(log.configName ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });



  // ── Backup table columns ──────────────────────────────────────────────────
  const backupColumns: TableColumn<any>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '40px',
      render: (row) => (
        <input
          type='radio'
          name='backup-select'
          checked={selectedBackup.has(row.backupConfigId)}
          onChange={() => {
            const next = new Set([row.backupConfigId]);
            setSelectedBackup(next);
            setSelectedBackupRows([row]);
            setSelectedBackupConfigId(row.backupConfigId);
          }}
          onClick={(e) => e.stopPropagation()}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'slNo',
      header: 'SL No.',
      width: '60px',
      render: (_row, index) => <span className='text-sm text-gray-600'>{(backupCurrentPage - 1) * (backupMeta.limit ?? 25) + index + 1}</span>,
    },
    {
      key: 'name',
      header: 'Backup Name',
      render: (row) => (
        <div className='flex items-center gap-2'>
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 border border-gray-100'>
            <span className='text-[10px] font-bold text-sky-500'>B</span>
          </div>
          <span className='text-sm font-semibold text-gray-900'>{row.name ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => <span className='text-xs text-gray-600'>{row.crm?.name ?? row.crm?.crmName ?? '—'}</span>,
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (row) => <span className='text-xs text-gray-600'>{row.destination?.name ?? row.destination?.type ?? '—'}</span>,
    },
    {
      key: 'schedule',
      header: 'Type',
      render: (row) => {
        const isRealtime = row.schedule === 'REALTIME';
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isRealtime ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
            {isRealtime ? 'Realtime' : 'Schedule'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (!row.status) return <span className='text-gray-400 text-xs'>—</span>;
        const s = (row.status as string).toUpperCase();
        const styles: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-600', ERROR: 'bg-red-100 text-red-700' };
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[s] ?? 'bg-gray-100 text-gray-600'}`}>{row.status}</span>;
      },
    },
    {
      key: 'lastBackupAt',
      header: 'Last Run',
      render: (row) => <span className='text-xs text-gray-600 whitespace-nowrap'>{row.lastBackupAt ? formatDateTime(row.lastBackupAt) : '—'}</span>,
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      render: (row) => <span className='text-xs text-gray-600 tabular-nums'>{row.sizeInBytes != null ? formatBytes(row.sizeInBytes) : '—'}</span>,
    },
  ];

  // ── Jobs table columns (phase 2) ─────────────────────────────────────────
  const jobsColumns: TableColumn<any>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: (job) => (
        <input
          type='radio'
          name='job-select'
          checked={selectedJobId === job.backupJobId}
          onChange={() => setSelectedJobId(job.backupJobId)}
          onClick={(e) => e.stopPropagation()}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'slNo',
      header: 'SL No.',
      width: '60px',
      render: (_row, index) => <span className='text-sm text-gray-600'>{(jobsCurrentPage - 1) * JOBS_PAGE_SIZE + index + 1}</span>,
    },
    {
      key: 'startedAt',
      header: 'Start Time',
      render: (job) => <span className='text-xs text-gray-700 whitespace-nowrap'>{job.startedAt ? dayjs(job.startedAt).format('MMM D, YYYY h:mm A') : '--'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => {
        const upper = (job.status ?? '').toUpperCase();
        const isPartial = upper === 'SUCCESS' && (job.object ?? []).some((o: any) => o.status?.toUpperCase() === 'FAILED');
        const styles: Record<string, string> = {
          SUCCESS: isPartial ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700',
          FAILED: 'bg-red-100 text-red-700',
          RUNNING: 'bg-yellow-100 text-yellow-700',
          PENDING: 'bg-blue-100 text-blue-700',
        };
        const label = isPartial ? 'Partially Failed' : upper === 'SUCCESS' ? 'Completed' : upper === 'FAILED' ? 'Failed' : upper === 'RUNNING' ? 'In Progress' : upper === 'PENDING' ? 'Pending' : job.status ?? '';
        return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${styles[upper] ?? 'bg-gray-100 text-gray-700'}`}>{label}</span>;
      },
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (job) => {
        const end = job.completedAt ?? job.lastCompletedAt;
        if (!job.startedAt || !end) return <span className='text-xs text-gray-500'>--</span>;
        const ms = dayjs(end).diff(dayjs(job.startedAt), 'ms');
        if (ms < 0) return <span className='text-xs text-gray-500'>--</span>;
        const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
        return <span className='text-xs text-gray-700'>{m > 0 ? `${m}m ${s}s` : `${s}s`}</span>;
      },
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      render: (job) => {
        const bytes = Array.isArray(job.object)
          ? job.object.reduce((sum: number, o: any) => sum + (o.sizeInBytes ?? 0), 0)
          : (job.sizeInBytes ?? 0);
        return <span className='text-xs text-gray-700 tabular-nums'>{formatBytes(bytes)}</span>;
      },
    },
    {
      key: 'objects',
      header: 'Objects',
      render: (job) => <span className='text-xs text-gray-700 tabular-nums'>{job.object?.length ?? 0}</span>,
    },
    {
      key: 'jobType',
      header: 'Backup Type',
      render: (job) => {
        if (job.jobType === 'BULK') return <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700'>Scheduled</span>;
        return <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700'>Realtime</span>;
      },
    },
    {
      key: 'errorMessage',
      header: 'Error',
      render: (job) => job.errorMessage
        ? <span className='text-xs text-red-600 truncate max-w-[160px] block' title={job.errorMessage}>{job.errorMessage.length > 50 ? job.errorMessage.slice(0, 50) + '…' : job.errorMessage}</span>
        : <span className='text-xs text-gray-400'>--</span>,
    },
  ];

  // ── Archive table columns ─────────────────────────────────────────────────
  const archiveColumns: TableColumn<any>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: (log) => (
        <input
          type='radio'
          name='archive-row'
          checked={selectedArchiveKey === (log.backupConfigId ?? '')}
          onChange={() => setSelectedArchiveKey(log.backupConfigId ?? '')}
          onClick={(e) => e.stopPropagation()}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'configName',
      header: 'Config Name',
      render: (log) => (
        <div className='flex items-center gap-2'>
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 border border-gray-100'>
            <span className='text-[10px] font-bold text-purple-500'>A</span>
          </div>
          <span className='text-sm font-semibold text-gray-900'>{log.configName ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'sourceName',
      header: 'Source',
      render: (log) => <span className='text-xs text-gray-600'>{log.sourceName ?? '—'}</span>,
    },
    {
      key: 'lastJobRunTime',
      header: 'Last Job Run',
      render: (log) => <span className='text-xs text-gray-600 whitespace-nowrap'>{log.lastJobRunTime ? formatDateTime(log.lastJobRunTime) : '—'}</span>,
    },
    {
      key: 'selectedObjectCount',
      header: 'Objects',
      render: (log) => <span className='text-xs text-gray-600 tabular-nums'>{log.selectedObjectCount != null ? log.selectedObjectCount : '—'}</span>,
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      render: (log) => <span className='text-xs text-gray-600 tabular-nums'>{log.dataSize != null ? formatBytes(log.dataSize) : '—'}</span>,
    },
  ];

  // ── Point-in-time state ───────────────────────────────────────────────────
  const [pitDate, setPitDate] = useState('2026-05-23');
  const [pitTime, setPitTime] = useState('14:23');

  const canProceed =
    sourceType === 'backup'  ? (showJobsPhase ? !!selectedJobId : selectedBackup.size > 0) :
    sourceType === 'archive' ? !!selectedArchiveKey :
    false;

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0 h-full'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/restore-center' className='text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors'>
            Restore Center
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Restore</span>
        </div>

        {/* Step header + progress */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 2 of 8</p>
          <Typography as='h1' variant='pageTitle' color='primary'>Select Source Type</Typography>
          <Typography variant='bodySm' color='muted' className='mt-1'>
            Choose the type of source to restore from, then select the exact snapshot or archive entry.
          </Typography>
          <div className='mt-4'>
            <ProgressBar active={2} />
          </div>
        </div>

        {/* Source Type cards */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center gap-3 border-b border-gray-100 px-5 py-3'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Source Type</Typography>
          </div>
          <div className='p-4 grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {SOURCE_TYPES.map((s) => {
              const active = sourceType === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSourceType(s.id)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span className={active ? 'text-blue-600' : 'text-gray-500'}>{s.icon}</span>
                    <span className={`text-sm font-semibold ${active ? 'text-blue-600' : 'text-gray-800'}`}>{s.title}</span>
                  </div>
                  <p className='mt-1 text-xs text-gray-500'>{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Backup sub-picker ── */}
        {sourceType === 'backup' && !showJobsPhase && (
          <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
            {/* Header */}
            <div className='flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>Choose a Backup</Typography>
              <div className='ml-auto flex items-center bg-gray-100 rounded-lg p-1 gap-1 flex-shrink-0'>
                {(['list', 'pit'] as BackupMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBackupMode(m)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                      backupMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m === 'list' ? 'List of backups' : 'Point-in-time'}
                  </button>
                ))}
              </div>
            </div>

            {/* Search bar */}
            {backupMode === 'list' && (
              <div className='flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50'>
                <input
                  value={backupSearch}
                  onChange={(e) => { setBackupSearch(e.target.value); goBackupToPage1(); }}
                  placeholder='Search backup name…'
                  className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none focus:border-blue-400 min-w-0 w-56'
                />
              </div>
            )}

            {backupMode === 'list' ? (
              <Table
                columns={backupColumns}
                rows={backupListRows}
                getRowKey={(row: any) => row.backupConfigId ?? row.name}
                loading={isLoadingJobs || isFetchingJobs}
                skeletonConfig={{ rows: 5, colWidths: ['w-40', 'w-28', 'w-24', 'w-20', 'w-20', 'w-20'] }}
                headerVariant='uppercase'
                borderless
                getRowClassName={(row: any) => `border-b border-gray-50 transition-colors ${selectedBackup.has(row.backupConfigId) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                emptyState='No backup configs found.'
                cursorMode={true}
                cursorFirstPageFn={goBackupToPage1}
                cursorOnPrev={goBackupPrev}
                pagination={{
                  currentPage: 1,
                  displayPage: backupCurrentPage,
                  pageSize: backupMeta.limit ?? 25,
                  totalRecords: backupMeta.totalRecords ?? backupListRows.length,
                  onPageChange: (nextPage) => {
                    if (nextPage === backupCurrentPage + 1 && backupMeta.nextCursor) {
                      setBackupCursorStack((prev) => [...prev, { page: backupCurrentPage, cursor: backupCurrentCursor ?? '' }]);
                      goToBackupPage(nextPage, backupMeta.nextCursor);
                    }
                  },
                }}
              />
            ) : (
              /* Point-in-time mode */
              <div className='p-5'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1.5'>Date</label>
                    <input
                      type='date' value={pitDate} onChange={(e) => setPitDate(e.target.value)}
                      className='w-full h-9 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1.5'>Time</label>
                    <input
                      type='time' value={pitTime} onChange={(e) => setPitTime(e.target.value)}
                      className='w-full h-9 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    />
                  </div>
                </div>
                <div className='mt-4 flex items-start gap-3 rounded-lg px-4 py-3 text-sm' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <svg width='16' height='16' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
                    <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' />
                  </svg>
                  <p className='text-blue-800 text-xs leading-relaxed'>
                    Closest snapshot: <strong>May 23, 06:00 AM</strong> (8h 23m before requested time). System will apply 8h 23m of change-log deltas to reconstruct state at the requested timestamp.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Backup jobs phase (phase 2) ── */}
        {sourceType === 'backup' && showJobsPhase && (
          <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
            <div className='flex-shrink-0 flex items-center gap-3 border-b border-gray-100 px-5 py-3'>
              <button
                onClick={() => { setShowJobsPhase(false); setSelectedJobId(''); goJobsToPage1(); }}
                className='inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors'
              >
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='15 18 9 12 15 6' />
                </svg>
                Back to Backups
              </button>
              <span className='text-gray-300 select-none'>|</span>
              <Typography as='h3' variant='sectionTitle' color='secondary'>
                Select a Backup Job
              </Typography>
              {selectedBackupRows[0]?.name && (
                <span className='ml-1 text-xs font-medium text-gray-500'>
                  — {selectedBackupRows[0].name}
                </span>
              )}
            </div>
            <Table
              columns={jobsColumns}
              rows={jobsRows}
              getRowKey={(job: any) => job.backupJobId}
              loading={isLoadingJobsList || isFetchingJobsList}
              skeletonConfig={{ rows: 8, colWidths: ['w-8', 'w-12', 'w-36', 'w-24', 'w-16', 'w-20', 'w-12', 'w-20', 'w-32'] }}
              headerVariant='uppercase'
              borderless
              getRowClassName={(job: any) => `border-b border-gray-50 transition-colors cursor-pointer ${selectedJobId === job.backupJobId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              onRowClick={(job: any) => setSelectedJobId(job.backupJobId)}
              emptyState='No backup jobs found for this backup config.'
              cursorMode={true}
              cursorFirstPageFn={goJobsToPage1}
              cursorOnPrev={goJobsPrev}
              pagination={{
                currentPage: 1,
                displayPage: jobsCurrentPage,
                pageSize: JOBS_PAGE_SIZE,
                totalRecords: jobsMeta.totalRecords ?? jobsRows.length,
                onPageChange: (nextPage) => {
                  if (nextPage === jobsCurrentPage + 1 && jobsMeta.nextCursor) {
                    goJobsNext();
                  }
                },
              }}
            />
          </div>
        )}

        {/* ── Archive sub-picker ── */}
        {sourceType === 'archive' && (
          <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '500px' }}>
            {/* Header */}
            <div className='flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>▤ Choose an Archive Vault Entry</Typography>
            </div>
            {/* Filter bar */}
            <div className='flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
              <span className='text-xs font-bold text-gray-600'>Filter:</span>
              <input
                value={archiveFilterName}
                onChange={(e) => setArchiveFilterName(e.target.value)}
                placeholder='Config name'
                className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none focus:border-blue-400 min-w-0 w-44'
              />
            </div>
            <Table
              columns={archiveColumns}
              rows={filteredArchiveLogs}
              getRowKey={(log: any, i: number) => log.backupConfigId ?? `${i}`}
              loading={isLoadingArchive || isFetchingArchive}
              skeletonConfig={{ rows: 5, colWidths: ['w-40', 'w-28', 'w-28', 'w-16', 'w-20'] }}
              headerVariant='uppercase'
              borderless
              showSerialNumber
              serialNumberStart={archivePageIndex * 10 + 1}
              onRowClick={(log: any) => setSelectedArchiveKey(log.backupConfigId ?? '')}
              getRowClassName={(log: any) => {
                const isSelected = selectedArchiveKey === (log.backupConfigId ?? '');
                return `border-b border-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`;
              }}
              emptyState='No archive entries found.'
              paginationConfig={{
                type: 'cursor',
                hasPrev: archivePageIndex > 0,
                hasNext: !!archiveNextCursor,
                onPrev: goArchivePrevPage,
                onNext: goArchiveNextPage,
                label: `Page ${archivePageIndex + 1} · ${filteredArchiveLogs.length} entries`,
              }}
            />
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <div className='flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white'>
        <button
          onClick={onBack}
          className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          ← Back
        </button>
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
            💾 Save as Draft
          </button>
          <button
            onClick={() => {
              if (sourceType === 'archive') {
                onNext({ configType: 'ARCHIVAL', backupConfigId: selectedArchiveKey, backupJobIds: [] });
              } else if (showJobsPhase) {
                onNext({ configType: 'BACKUP', backupConfigId: selectedBackupConfigId, backupJobIds: [selectedJobId].filter(Boolean) });
              } else {
                // Phase 1 → Phase 2: load jobs for selected backup config
                const slug = selectedBackupRows[0]?.slug ?? selectedBackupRows[0]?.backupConfigId ?? '';
                setSelectedBackupSlug(slug);
                setShowJobsPhase(true);
                setSelectedJobId('');
                goJobsToPage1();
              }
            }}
            disabled={!canProceed}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            style={{ background: '#155DFC' }}
          >
            {sourceType === 'backup' && !showJobsPhase ? 'Select Backup Jobs To Restore →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
