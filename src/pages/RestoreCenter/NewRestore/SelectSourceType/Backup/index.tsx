import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from '../../../../../components/Table';
import type { TableColumn } from '../../../../../components/Table';
import Typography from '../../../../../components/Typography';
import { useBackupConfigService } from '../../../../../services/backup-config/backup-config.service';
import { formatBytes, formatDateTime } from '../../../../../utils';
import dayjs from 'dayjs';

type BackupMode = 'list' | 'pit';

const JOBS_PAGE_SIZE = 20;

export type ScopeType = 'ENTIRE' | 'PARTIAL' | 'CHANGED_BETWEEN';

export interface BackupSelection {
  backupConfigId: string;
  backupJobIds: string[];
  type: ScopeType;
  startDate?: string;
  endDate?: string;
}

interface Props {
  onConfigSelected: (selected: boolean) => void;
  onSelectionChange: (selection: BackupSelection | null) => void;
  showJobsPhase: boolean;
  initialSelectedRow?: any;
  initialSelectedConfigId?: string;
  initialSelectedJobIds?: string[];
  onSelectedRowChange?: (row: any) => void;
  onSelectedConfigIdChange?: (id: string) => void;
  onSelectedJobIdsChange?: (ids: string[]) => void;
}

export default function BackupPicker({ onConfigSelected, onSelectionChange, showJobsPhase, initialSelectedRow = null, initialSelectedConfigId = '', initialSelectedJobIds = [], onSelectedRowChange, onSelectedConfigIdChange, onSelectedJobIdsChange }: Props) {
  const backupConfigService = useBackupConfigService();

  // ── Config list (phase 1) ────────────────────────────────────────────────
  // DEMO_HIDDEN: point-in-time feature hidden; hardcoded to 'list'
  const [backupMode, _setBackupMode] = useState<BackupMode>('list');
  const [selectedBackup, setSelectedBackup] = useState<Set<string>>(initialSelectedConfigId ? new Set([initialSelectedConfigId]) : new Set());
  const [selectedBackupRow, setSelectedBackupRow] = useState<any>(initialSelectedRow);
  const [selectedBackupConfigId, setSelectedBackupConfigId] = useState<string>(initialSelectedConfigId);

  const [backupSearch, setBackupSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Schedule' | 'Realtime'>('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [backupCurrentPage, setBackupCurrentPage] = useState(1);
  const [backupCurrentCursor, setBackupCurrentCursor] = useState<string | null>(null);
  const [backupCursorStack, setBackupCursorStack] = useState<{ page: number; cursor: string }[]>([]);

  const [pitDate, setPitDate] = useState('2026-05-23');
  const [pitTime, setPitTime] = useState('14:23');

  // Debounce: fire query only after user stops typing for 400ms, and reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(backupSearch);
      setBackupCursorStack([]);
      setBackupCurrentPage(1);
      setBackupCurrentCursor(null);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [backupSearch]);

  // Reset pagination when type filter changes
  useEffect(() => {
    setBackupCursorStack([]);
    setBackupCurrentPage(1);
    setBackupCurrentCursor(null);
  }, [typeFilter]);

  const apiSchedule = typeFilter === 'Realtime' ? 'REALTIME' : typeFilter === 'Schedule' ? 'SCHEDULE' : undefined;

  const backupQueryFn = useCallback(
    () => backupConfigService.listBackupConfigs(true, backupCurrentCursor ?? undefined, debouncedSearch || undefined, undefined, apiSchedule),
    [backupCurrentCursor, debouncedSearch, apiSchedule]
  );

  const { data: backupListData, isLoading: isLoadingConfigs, isFetching: isFetchingConfigs } = useQuery({
    queryKey: ['restore-backup-config-list', backupCurrentCursor, debouncedSearch, typeFilter],
    queryFn: backupQueryFn,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const backupListRows: any[] = Array.isArray((backupListData as any)?.data) ? (backupListData as any).data : [];
  const backupMeta = (backupListData as any)?.meta ?? { limit: 25, nextCursor: null, totalRecords: backupListRows.length };

  const goToBackupPage = useCallback((page: number, cursor: string | null) => {
    setBackupCurrentPage(page);
    setBackupCurrentCursor(cursor);
  }, []);

  const goBackupPrev = () => {
    const stack = [...backupCursorStack];
    const prev = stack.pop();
    setBackupCursorStack(stack);
    if (prev) goToBackupPage(prev.page, prev.cursor);
    else goToBackupPage(1, null);
  };


  // ── Jobs list (phase 2) ──────────────────────────────────────────────────
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set(initialSelectedJobIds));
  const [jobsCursor, setJobsCursor] = useState<string | null>(null);
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1);
  const [jobsCursorStack, setJobsCursorStack] = useState<{ page: number; cursor: string }[]>([]);

  // Scope selection state
  const isRealtime = selectedBackupRow?.schedule === 'REALTIME';
  const [type, setScopeType] = useState<ScopeType>('ENTIRE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reset jobs selection + scope when the backup config changes
  const prevConfigIdRef = useRef(selectedBackupConfigId);
  useEffect(() => {
    if (prevConfigIdRef.current !== selectedBackupConfigId) {
      prevConfigIdRef.current = selectedBackupConfigId;
      setSelectedJobIds(new Set());
      setJobsCursor(null);
      setJobsCurrentPage(1);
      setJobsCursorStack([]);
      setScopeType('ENTIRE');
      setStartDate('');
      setEndDate('');
    }
  }, [selectedBackupConfigId]);

  const selectedBackupSlug = selectedBackupRow?.slug ?? selectedBackupRow?.backupConfigId ?? '';

  const { data: jobsData, isLoading: isLoadingJobs, isFetching: isFetchingJobs } = useQuery({
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


  const buildSelection = (ids: string[]): BackupSelection => ({
    backupConfigId: selectedBackupConfigId,
    backupJobIds: ids,
    type,
    ...(type === 'CHANGED_BETWEEN' ? { startDate, endDate } : {}),
  });

  const toggleJob = (id: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const ids = Array.from(next);
      onSelectedJobIdsChange?.(ids);
      onSelectionChange(next.size > 0 ? buildSelection(ids) : null);
      return next;
    });
  };

  // Re-emit selection whenever scope/dates change so parent always has latest
  const emitScopeChange = (newScope: ScopeType, newStart = startDate, newEnd = endDate) => {
    const ids = Array.from(selectedJobIds);
    if (ids.length > 0) {
      onSelectionChange({
        backupConfigId: selectedBackupConfigId,
        backupJobIds: ids,
        type: newScope,
        ...(newScope === 'CHANGED_BETWEEN' ? { startDate: newStart, endDate: newEnd } : {}),
      });
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const configColumns: TableColumn<any>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: (row) => (
        <input
          type='radio'
          name='backup-select'
          checked={selectedBackup.has(row.backupConfigId)}
          onChange={() => {
            setSelectedBackup(new Set([row.backupConfigId]));
            setSelectedBackupRow(row);
            setSelectedBackupConfigId(row.backupConfigId);
            onSelectedRowChange?.(row);
            onSelectedConfigIdChange?.(row.backupConfigId);
            onSelectionChange(null);
            onConfigSelected(true);
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

  const jobsColumns: TableColumn<any>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '40px',
      render: (job) => (
        <input
          type='checkbox'
          checked={selectedJobIds.has(job.backupJobId)}
          onChange={() => toggleJob(job.backupJobId)}
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
        const label = isPartial ? 'Partially Failed'
          : upper === 'SUCCESS' ? 'Completed'
          : upper === 'FAILED' ? 'Failed'
          : upper === 'RUNNING' ? 'In Progress'
          : upper === 'PENDING' ? 'Pending'
          : job.status ?? '';
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
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
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
      render: (job) => job.jobType === 'BULK'
        ? <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700'>Scheduled</span>
        : <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700'>Realtime</span>,
    },
    {
      key: 'errorMessage',
      header: 'Error',
      render: (job) => job.errorMessage
        ? <span className='text-xs text-red-600 truncate max-w-[160px] block' title={job.errorMessage}>{job.errorMessage.length > 50 ? job.errorMessage.slice(0, 50) + '…' : job.errorMessage}</span>
        : <span className='text-xs text-gray-400'>--</span>,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Phase 1 — config list */}
      {!showJobsPhase && (
        <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
          <div className='flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Choose a Backup</Typography>
            {/* DEMO_HIDDEN: point-in-time toggle — uncomment to restore
            <div className='ml-auto flex items-center bg-gray-100 rounded-lg p-1 gap-1 flex-shrink-0'>
              {(['list', 'pit'] as BackupMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => _setBackupMode(m)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                    backupMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m === 'list' ? 'List of backups' : 'Point-in-time'}
                </button>
              ))}
            </div>
            END DEMO_HIDDEN */}
          </div>

          {backupMode === 'list' && (
            <div className='flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50'>
              <input
                value={backupSearch}
                onChange={(e) => setBackupSearch(e.target.value)}
                placeholder='Search backup name…'
                className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none focus:border-blue-400 min-w-0 w-56'
              />
              <div className='flex items-center gap-1 ml-auto'>
                {(['All', 'Schedule', 'Realtime'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className='px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors'
                    style={typeFilter === t
                      ? { background: '#155DFC', color: '#fff' }
                      : { background: '#F3F4F6', color: '#374151' }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {backupMode === 'list' ? (
            <Table
              columns={configColumns}
              rows={backupListRows}
              getRowKey={(row: any) => row.backupConfigId ?? row.name}
              loading={isLoadingConfigs || isFetchingConfigs}
              skeletonConfig={{ rows: 5, colWidths: ['w-8', 'w-12', 'w-40', 'w-28', 'w-24', 'w-20', 'w-20', 'w-20'] }}
              headerVariant='uppercase'
              borderless
              getRowClassName={(row: any) => `border-b border-gray-50 transition-colors ${selectedBackup.has(row.backupConfigId) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              emptyState='No backup configs found.'
              height='auto'
              paginationConfig={{
                type: 'cursor',
                hasPrev: backupCurrentPage > 1,
                hasNext: !!backupMeta.nextCursor,
                onPrev: goBackupPrev,
                onNext: () => {
                  if (backupMeta.nextCursor) {
                    setBackupCursorStack((prev) => [...prev, { page: backupCurrentPage, cursor: backupCurrentCursor ?? '' }]);
                    goToBackupPage(backupCurrentPage + 1, backupMeta.nextCursor);
                  }
                },
                label: `Showing ${backupListRows.length > 0 ? (backupCurrentPage - 1) * (backupMeta.limit ?? 25) + 1 : 0} to ${(backupCurrentPage - 1) * (backupMeta.limit ?? 25) + backupListRows.length} of ${backupMeta.totalRecords ?? backupListRows.length}`,
              }}
            />
          ) : (
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

      {/* Phase 2 — jobs list */}
      {showJobsPhase && (
        <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
          <div className='flex-shrink-0 flex items-center gap-3 border-b border-gray-100 px-5 py-3'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Select a Backup Job</Typography>
            {selectedBackupRow?.name && (
              <span className='ml-1 text-xs font-medium text-gray-500'>— {selectedBackupRow.name}</span>
            )}
          </div>

          {/* Scope selector */}
          <div className='flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-gray-50 flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-semibold text-gray-600'>Restore Scope:</span>
              <div className='flex items-center gap-1.5'>
                {(isRealtime
                  ? [{ id: 'ENTIRE', label: 'Entire' }, { id: 'CHANGED_BETWEEN', label: 'Changed Between' }]
                  : [{ id: 'ENTIRE', label: 'Entire' }, { id: 'PARTIAL', label: 'Partial' }]
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setScopeType(id as ScopeType);
                      emitScopeChange(id as ScopeType);
                    }}
                    className='px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors'
                    style={type === id
                      ? { background: '#155DFC', color: '#fff' }
                      : { background: '#E5E7EB', color: '#374151' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range — only for Changed Between */}
            {type === 'CHANGED_BETWEEN' && (
              <div className='flex items-center gap-4 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <label className='text-xs font-semibold text-gray-600 whitespace-nowrap'>Start Time</label>
                  <input
                    type='datetime-local'
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      emitScopeChange(type, e.target.value, endDate);
                    }}
                    className='h-8 text-xs border border-gray-200 rounded-lg px-2.5 bg-white text-gray-700 outline-none focus:border-blue-400'
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <label className='text-xs font-semibold text-gray-600 whitespace-nowrap'>End Time</label>
                  <input
                    type='datetime-local'
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      emitScopeChange(type, startDate, e.target.value);
                    }}
                    className='h-8 text-xs border border-gray-200 rounded-lg px-2.5 bg-white text-gray-700 outline-none focus:border-blue-400'
                  />
                </div>
              </div>
            )}
          </div>

          <Table
            columns={jobsColumns}
            rows={jobsRows}
            getRowKey={(job: any) => job.backupJobId}
            loading={isLoadingJobs || isFetchingJobs}
            skeletonConfig={{ rows: 8, colWidths: ['w-8', 'w-12', 'w-36', 'w-24', 'w-16', 'w-20', 'w-12', 'w-20', 'w-32'] }}
            headerVariant='uppercase'
            borderless
            getRowClassName={(job: any) => `border-b border-gray-50 transition-colors cursor-pointer ${selectedJobIds.has(job.backupJobId) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            onRowClick={(job: any) => toggleJob(job.backupJobId)}
            emptyState='No backup jobs found for this backup config.'
            height='auto'
            paginationConfig={{
              type: 'cursor',
              hasPrev: jobsCurrentPage > 1,
              hasNext: !!jobsMeta.nextCursor,
              onPrev: goJobsPrev,
              onNext: goJobsNext,
              label: `Showing ${jobsRows.length > 0 ? (jobsCurrentPage - 1) * JOBS_PAGE_SIZE + 1 : 0} to ${(jobsCurrentPage - 1) * JOBS_PAGE_SIZE + jobsRows.length} of ${jobsMeta.totalRecords ?? jobsRows.length}`,
            }}
          />
        </div>
      )}
    </>
  );
}

