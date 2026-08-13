import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from '../../../../../components/Table';
import type { TableColumn } from '../../../../../components/Table';
import Typography from '../../../../../components/Typography';
import { useBackupConfigService } from '../../../../../services/backup-config/backup-config.service';
import { formatBytes, formatDateTime } from '../../../../../utils';

type BackupMode = 'list' | 'pit';

export type ScopeType = 'ENTIRE' | 'CHANGED_BETWEEN';

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

export default function BackupPicker({ onConfigSelected, onSelectionChange, showJobsPhase, initialSelectedConfigId = '', onSelectedRowChange, onSelectedConfigIdChange }: Props) {
  const backupConfigService = useBackupConfigService();

  // ── Phase 1: config list ──────────────────────────────────────────────────
  const [backupMode, setBackupMode] = useState<BackupMode>('list');
  const [selectedBackup, setSelectedBackup] = useState<Set<string>>(initialSelectedConfigId ? new Set([initialSelectedConfigId]) : new Set());
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

  // ── Phase 2: restore type + date range ───────────────────────────────────
  const [type, setScopeType] = useState<ScopeType>('ENTIRE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reset type/dates when config changes
  const prevConfigIdRef = useRef(selectedBackupConfigId);
  useEffect(() => {
    if (prevConfigIdRef.current !== selectedBackupConfigId) {
      prevConfigIdRef.current = selectedBackupConfigId;
      setScopeType('ENTIRE');
      setStartDate('');
      setEndDate('');
    }
  }, [selectedBackupConfigId]);

  // Emit selection whenever type/dates are valid — backend resolves jobs
  useEffect(() => {
    if (!selectedBackupConfigId) return;
    if (type === 'CHANGED_BETWEEN' && (!startDate || !endDate)) {
      onSelectionChange(null);
      return;
    }
    onSelectionChange({
      backupConfigId: selectedBackupConfigId,
      backupJobIds: [],
      type,
      ...(type === 'CHANGED_BETWEEN' ? { startDate, endDate } : {}),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, startDate, endDate, selectedBackupConfigId]);

  // ── Config table columns ──────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Phase 1 — config picker */}
      {!showJobsPhase && (
        <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
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

      {/* Phase 2 — restore type picker (no jobs table) */}
      {showJobsPhase && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-5'>
          <p className='text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1'>Restore Type</p>
          <p className='text-xs text-gray-400 mb-4'>Backup jobs are resolved automatically — no manual selection needed.</p>
          <div className='grid gap-3 grid-cols-2'>
            {([
              {
                id: 'ENTIRE' as ScopeType,
                icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/><path d='M12 8v4l3 3'/></svg>,
                title: 'Entire',
                desc: 'Restore all records from the selected backup policy. No time filtering applied.',
              },
              {
                id: 'CHANGED_BETWEEN' as ScopeType,
                icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>,
                title: 'Changed Between',
                desc: 'Restore only records that changed within a specific date and time range.',
              },
            ]).map(({ id, icon, title, desc }) => {
              const active = type === id;
              return (
                <button
                  key={id}
                  onClick={() => setScopeType(id)}
                  className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {icon}
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${active ? 'border-blue-600' : 'border-gray-300'}`}>
                      {active && <div className='w-2 h-2 rounded-full bg-blue-600' />}
                    </div>
                  </div>
                  <p className={`mt-3 text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-800'}`}>{title}</p>
                  <p className='mt-1 text-xs text-gray-500 leading-relaxed'>{desc}</p>
                </button>
              );
            })}
          </div>

          {/* Date range — only for Changed Between */}
          {type === 'CHANGED_BETWEEN' && (
            <div className='mt-4 rounded-xl border border-blue-200 bg-blue-50 px-6 py-5'>
              <div className='flex items-center gap-2 mb-4'>
                <svg width='16' height='16' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24'>
                  <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                </svg>
                <p className='text-sm font-semibold text-blue-700'>Select time range</p>
              </div>
              <div className='grid grid-cols-2 gap-5'>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>Start Time</label>
                  <input
                    type='datetime-local'
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      if (endDate && newStart && endDate < newStart) setEndDate('');
                    }}
                    className='h-10 text-sm border-2 border-gray-200 rounded-lg px-3 bg-white text-gray-800 outline-none focus:border-blue-500 transition-colors'
                  />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>End Time</label>
                  <input
                    type='datetime-local'
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      if (startDate && newEnd < startDate) return;
                      setEndDate(newEnd);
                    }}
                    className='h-10 text-sm border-2 border-gray-200 rounded-lg px-3 bg-white text-gray-800 outline-none focus:border-blue-500 transition-colors'
                  />
                </div>
              </div>
              {(!startDate || !endDate) && (
                <div className='mt-3 flex items-center gap-2'>
                  <div className='w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse' />
                  <p className='text-xs text-blue-600 font-medium'>Fill both dates to proceed</p>
                </div>
              )}
              {startDate && endDate && (
                <div className='mt-3 flex items-center gap-2'>
                  <svg width='13' height='13' fill='none' stroke='#16a34a' strokeWidth='2.5' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7'/>
                  </svg>
                  <p className='text-xs text-green-700 font-medium'>Time range set — ready to proceed</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
