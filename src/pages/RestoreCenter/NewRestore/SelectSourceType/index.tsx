import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../../components/Typography';
import type { TableColumn } from '../../../../components/Table';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { useRestoreService } from '../../../../services/restore/restore.service';
import { formatBytes, formatDateTime } from '../../../../utils';
import type { Destination } from '../../../../services/destination/destination.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'backup' | 'archive';
type BackupMode = 'list' | 'pit';

interface BackupSnapshot {
  id: string;
  name: string;
  source: string;
  backupType: 'Schedule' | 'Realtime';
  scheduleFrequency: string;
  configStatus: string;
  backupStatus: string;
  lastRun: string;
  dataSize: string;
  destinationId: string;
  scheduleType: 'REALTIME' | 'SCHEDULE';
}

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='flex items-center gap-0'>
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isDone   = num < active;
        const isActive = num === active;
        return (
          <div key={label} className='flex items-center flex-1 min-w-0'>
            <div className={`flex items-center gap-1.5 flex-shrink-0 text-[11px] font-semibold whitespace-nowrap ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 flex-shrink-0 ${
                isDone   ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-blue-600 border-blue-600 text-white' :
                           'bg-white border-gray-300 text-gray-400'
              }`}>
                {isDone ? '✓' : num}
              </div>
              <span className='hidden lg:inline'>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className='flex-1 h-0.5 mx-1' style={{ background: isDone ? '#22C55E' : '#E5E7EB' }} />
            )}
          </div>
        );
      })}
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

interface Props {
  onNext: () => void;
  onBack: () => void;
  selectedConnection: Destination | null;
}

export default function SelectSourceType({ onNext, onBack, selectedConnection }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>('backup');
  const [backupMode, setBackupMode] = useState<BackupMode>('list');
  const [selectedBackup, setSelectedBackup] = useState<Set<string>>(new Set());
  const [mergeRule, setMergeRule] = useState('');

  const backupConfigService = useBackupConfigService();
  const { data: backupConfigData } = useQuery({
    queryKey: ['backup-config-list'],
    queryFn: () => backupConfigService.listBackupConfigs(true),
  });

  const getScheduleFrequency = (frequency?: string): string => {
    if (!frequency) return '--';
    const freqMap: Record<string, string> = { 'HOURLY': 'Hourly', 'DAILY': 'Daily', 'WEEKLY': 'Weekly', 'MONTHLY': 'Monthly', 'CUSTOM': 'Custom', 'ONCE': 'Once' };
    return freqMap[frequency] || frequency;
  };

  // Reserved for future use — kept for feat/restore merge
  const apiBackups: BackupSnapshot[] = ((backupConfigData as any)?.data ?? []).map((item: any): BackupSnapshot => ({
    id: item.backupConfigId,
    name: item.name ?? item.slug ?? '—',
    source: item.crm?.name ?? item.crm?.crmName ?? item.platform ?? '—',
    backupType: item.schedule === 'REALTIME' ? 'Realtime' : 'Schedule',
    scheduleFrequency: getScheduleFrequency(item.scheduleConfig?.scheduling?.frequency),
    configStatus: item.status ?? 'INACTIVE',
    backupStatus: item.backupStatus ?? '',
    lastRun: formatDateTime(item.lastBackupAt),
    dataSize: formatBytes(item.sizeInBytes),
    destinationId: item.destinationId ?? '',
    scheduleType: item.schedule === 'REALTIME' ? 'REALTIME' : 'SCHEDULE',
  }));
  void apiBackups;

  const restoreService = useRestoreService();

  // ── Snapshot logs state ───────────────────────────────────────────────────
  const [jobsFilterName, setJobsFilterName] = useState('');
  const [jobsFilterType, setJobsFilterType] = useState<'REALTIME' | 'SCHEDULE'>('SCHEDULE');
  const [jobsFilterSource, setJobsFilterSource] = useState('ALL');
  const [jobsCursorStack, setJobsCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [jobsPageIndex, setJobsPageIndex] = useState(0);
  const [jobsPageLogs, setJobsPageLogs] = useState<any[]>([]);
  const [jobsNextCursor, setJobsNextCursor] = useState<string | undefined>(undefined);

  const jobsCurrentCursor = jobsCursorStack[jobsPageIndex];

  useEffect(() => {
    setSelectedBackup(new Set());
    setMergeRule('');
  }, [jobsFilterType]);

  const { isLoading: isLoadingJobs, isFetching: isFetchingJobs } = useQuery<unknown>({
    queryKey: ['snapshot-logs-inline', selectedConnection?.destinationId, jobsFilterType, jobsCurrentCursor],
    queryFn: async () => {
      const res = await restoreService.getSnapshotLogs({
        snapshotType: 'BACKUP',
        destinationId: selectedConnection!.destinationId,
        scheduleType: jobsFilterType,
        limit: 10,
        cursor: jobsCurrentCursor,
      });
      setJobsPageLogs((res as any)?.data ?? []);
      setJobsNextCursor((res as any)?.meta?.nextCursor);
      return res;
    },
    enabled: !!selectedConnection && sourceType === 'backup',
  });

  const goJobsNextPage = () => {
    if (!jobsNextCursor) return;
    setJobsCursorStack((prev) => {
      const next = [...prev];
      if (next[jobsPageIndex + 1] !== jobsNextCursor) next[jobsPageIndex + 1] = jobsNextCursor;
      return next;
    });
    setJobsPageIndex((p) => p + 1);
  };

  const goJobsPrevPage = () => {
    if (jobsPageIndex === 0) return;
    setJobsPageIndex((p) => p - 1);
  };

  const resetJobsPagination = () => {
    setJobsCursorStack([undefined]);
    setJobsPageIndex(0);
    setJobsPageLogs([]);
    setJobsNextCursor(undefined);
  };

  const jobsSourceOptions = ['ALL', ...Array.from(new Set(jobsPageLogs.map((l: any) => l.sourceName).filter(Boolean)))];

  const filteredLogs = jobsPageLogs.filter((log: any) => {
    if (jobsFilterName.trim()) {
      const q = jobsFilterName.trim().toLowerCase();
      if (!(log.configName ?? '').toLowerCase().includes(q)) return false;
    }
    if (jobsFilterSource !== 'ALL' && log.sourceName !== jobsFilterSource) return false;
    return true;
  });

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

  // ── Merge state ───────────────────────────────────────────────────────────
  const [selectedMerge, setSelectedMerge] = useState<Set<string>>(new Set());

  // ── Point-in-time state ───────────────────────────────────────────────────
  const [pitDate, setPitDate] = useState('2026-05-23');
  const [pitTime, setPitTime] = useState('14:23');

  // ── Merge table columns (reserved for feat/restore) ──────────────────────
  const mergeColumns: TableColumn<BackupSnapshot>[] = [
    {
      key: 'check',
      header: '',
      width: '40px',
      render: (row) => (
        <input
          type='checkbox'
          checked={selectedMerge.has(row.id)}
          onChange={() => {
            setSelectedMerge((prev) => {
              const next = new Set(prev);
              next.has(row.id) ? next.delete(row.id) : next.add(row.id);
              return next;
            });
          }}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'name',
      header: 'Backup Name',
      render: (row) => (
        <div className='flex items-center gap-2'>
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 border border-gray-100'>
            <span className='text-[10px] font-bold text-sky-500'>S</span>
          </div>
          <span className='text-sm font-semibold text-gray-900'>{row.name}</span>
        </div>
      ),
    },
    { key: 'source',   header: 'Source',    render: (row) => <span className='text-sm text-gray-700'>{row.source}</span> },
    { key: 'dataSize', header: 'Data Size', render: (row) => <span className='text-sm text-gray-700'>{row.dataSize}</span> },
    { key: 'lastRun',  header: 'Last Run',  render: (row) => <span className='text-xs text-gray-600 whitespace-nowrap'>{row.lastRun}</span> },
    {
      key: 'configStatus',
      header: 'Status',
      render: (row) => {
        const styles: Record<string, string> = { 'ACTIVE': 'bg-green-100 text-green-700', 'INACTIVE': 'bg-gray-100 text-gray-600', 'ERROR': 'bg-red-100 text-red-700' };
        const labels: Record<string, string> = { 'ACTIVE': 'Active', 'INACTIVE': 'Inactive', 'ERROR': 'Error' };
        const k = row.configStatus?.toUpperCase() ?? '';
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[k] ?? 'bg-gray-100 text-gray-600'}`}>{labels[k] ?? row.configStatus}</span>;
      },
    },
  ];
  void mergeColumns;

  const canProceed =
    sourceType === 'backup'  ? selectedBackup.size > 0 && (selectedBackup.size < 2 || !!mergeRule) :
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
        {sourceType === 'backup' && (
          <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
            {/* Header */}
            <div className='flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>📸 Choose a Backup Snapshot</Typography>
              <div className='flex items-center bg-gray-100 rounded-lg p-1 gap-1 flex-shrink-0'>
                {(['SCHEDULE', 'REALTIME'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setJobsFilterType(t); resetJobsPagination(); setSelectedBackup(new Set()); setMergeRule(''); }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                      jobsFilterType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'SCHEDULE' ? 'Schedule' : 'Realtime'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter bar */}
            <div className='flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
              {backupMode === 'list' && <>
                <span className='text-xs font-bold text-gray-600'>Filter:</span>
                <input
                  value={jobsFilterName}
                  onChange={(e) => { setJobsFilterName(e.target.value); }}
                  placeholder='Backup name'
                  className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none focus:border-blue-400 min-w-0 w-44'
                />
                <select
                  value={jobsFilterSource}
                  onChange={(e) => setJobsFilterSource(e.target.value)}
                  className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 outline-none focus:border-blue-400'
                >
                  {jobsSourceOptions.map((s) => (
                    <option key={s} value={s}>{s === 'ALL' ? 'All sources' : s}</option>
                  ))}
                </select>
              </>}
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

            {backupMode === 'list' ? (
              <>
                {/* Table */}
                <div className='flex-1 overflow-x-auto'>
                  {isLoadingJobs || isFetchingJobs ? (
                    <div className='flex items-center justify-center py-12'>
                      <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600' />
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <p className='text-sm text-gray-500'>No snapshot jobs found.</p>
                    </div>
                  ) : (
                    <table className='w-full' style={{ minWidth: jobsFilterType === 'REALTIME' ? '1060px' : '860px' }}>
                      <thead>
                        <tr className='border-b border-gray-200 bg-gray-50'>
                          <th className='px-4 py-3 w-10'></th>
                          {['#', 'Backup Name', 'Date & Time', 'Source', 'Backup Type', 'Status', 'Data Size',
                            ...(jobsFilterType === 'REALTIME' ? ['Object', 'Operation', 'Records'] : []),
                            'Actions'].map((h) => (
                            <th key={h} className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log: any, i: number) => {
                          const rowKey = `${log.dateTime ?? i}__${log.configName ?? i}`;
                          const isSelected = selectedBackup.has(rowKey);
                          const isRealtime = log.backupType === 'RealTime' || log.backupType === 'REALTIME';
                          const toggleRow = () => setSelectedBackup((prev) => {
                            const next = new Set(prev);
                            isSelected ? next.delete(rowKey) : next.add(rowKey);
                            return next;
                          });
                          return (
                            <tr
                              key={i}
                              onClick={toggleRow}
                              className={`border-b border-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                              <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                                <input
                                  type='checkbox'
                                  checked={isSelected}
                                  onChange={toggleRow}
                                  className='w-4 h-4 accent-blue-600 cursor-pointer'
                                />
                              </td>
                              <td className='px-4 py-3 text-xs text-gray-400 tabular-nums'>{jobsPageIndex * 10 + i + 1}</td>
                              <td className='px-4 py-3'>
                                <div className='flex items-center gap-2'>
                                  <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 border border-gray-100'>
                                    <span className='text-[10px] font-bold text-sky-500'>S</span>
                                  </div>
                                  <span className='text-sm font-semibold text-gray-900'>{log.configName ?? '—'}</span>
                                </div>
                              </td>
                              <td className='px-4 py-3 text-xs text-gray-600 whitespace-nowrap'>{log.dateTime ? formatDateTime(log.dateTime) : '—'}</td>
                              <td className='px-4 py-3 text-xs text-gray-600'>{log.sourceName ?? '—'}</td>
                              <td className='px-4 py-3'>
                                {log.backupType ? (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isRealtime ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {isRealtime
                                      ? <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'><circle cx='12' cy='12' r='10'/><circle cx='12' cy='12' r='3' fill='currentColor' stroke='none'/></svg>
                                      : <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>
                                    }
                                    {isRealtime ? 'Realtime' : 'Schedule'}
                                  </span>
                                ) : <span className='text-gray-400 text-xs'>—</span>}
                              </td>
                              <td className='px-4 py-3'>
                                {log.status ? (() => {
                                  const s = log.status.toUpperCase();
                                  const styles: Record<string, string> = { SUCCESS: 'bg-green-100 text-green-700', FAILED: 'bg-red-100 text-red-700', RUNNING: 'bg-blue-100 text-blue-700', PENDING: 'bg-indigo-100 text-indigo-700', PARTIAL: 'bg-yellow-100 text-yellow-700' };
                                  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[s] ?? 'bg-gray-100 text-gray-600'}`}>{log.status}</span>;
                                })() : <span className='text-gray-400 text-xs'>—</span>}
                              </td>
                              <td className='px-4 py-3 text-xs text-gray-600 tabular-nums'>
                                {log.dataSize != null ? `${(log.dataSize / (1024 * 1024)).toFixed(2)} MB` : '—'}
                              </td>
                              {isRealtime && <>
                                <td className='px-4 py-3 text-xs text-gray-600'>{log.objectApiName ?? '—'}</td>
                                <td className='px-4 py-3'>
                                  {log.operation ? (() => {
                                    const opStyles: Record<string, string> = { INSERT: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-700', UPSERT: 'bg-orange-100 text-orange-700' };
                                    return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${opStyles[log.operation.toUpperCase()] ?? 'bg-gray-100 text-gray-600'}`}>{log.operation}</span>;
                                  })() : <span className='text-gray-400 text-xs'>—</span>}
                                </td>
                                <td className='px-4 py-3 text-xs text-gray-600 tabular-nums'>{log.recordCount ?? '—'}</td>
                              </>}
                              <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                                <button className='text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50'>
                                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='w-4 h-4'>
                                    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/>
                                    <circle cx='12' cy='12' r='3'/>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Footer */}
                <div className='flex-shrink-0 mt-auto flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500'>
                  <button
                    onClick={goJobsPrevPage}
                    disabled={jobsPageIndex === 0 || isFetchingJobs}
                    className='inline-flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={goJobsNextPage}
                    disabled={!jobsNextCursor || isFetchingJobs}
                    className='inline-flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    Next →
                  </button>
                  <span className='ml-auto text-xs text-gray-400'>Page {jobsPageIndex + 1} · {filteredLogs.length} entries</span>
                </div>
                {selectedBackup.size >= 2 && (
                  <div className='flex-shrink-0 mx-4 mb-3 rounded-xl border border-yellow-200 bg-yellow-50 overflow-hidden'>
                    <div className='flex items-center gap-2 px-4 py-2.5 border-b border-yellow-200 bg-yellow-100/60'>
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4 text-yellow-600 flex-shrink-0'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/>
                      </svg>
                      <span className='text-xs font-semibold text-yellow-800'>Multiple snapshots selected ({selectedBackup.size})</span>
                      <span className='text-xs text-yellow-600 ml-1'>— conflict resolution required</span>
                    </div>
                    <div className='flex items-center justify-between gap-4 px-4 py-3'>
                      <p className='text-xs text-yellow-800 leading-relaxed'>When the same record exists in more than one selected snapshot, choose which version wins during restore.</p>
                      <select
                        value={mergeRule}
                        onChange={(e) => setMergeRule(e.target.value)}
                        className={`h-8 text-xs border rounded-lg px-3 bg-white text-gray-700 outline-none focus:border-yellow-500 flex-shrink-0 min-w-[220px] ${!mergeRule ? 'border-red-300' : 'border-yellow-300'}`}
                      >
                        <option value=''>— Select a rule —</option>
                        <option value='newest'>Newest LastModifiedDate wins</option>
                        <option value='oldest'>Oldest snapshot wins</option>
                        <option value='latest'>Latest selected snapshot wins</option>
                        <option value='perfield'>Per-field rule (set on Conflict step)</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
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
            {/* Table */}
            <div className='flex-1 overflow-x-auto'>
              {isLoadingArchive || isFetchingArchive ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600' />
                </div>
              ) : filteredArchiveLogs.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <p className='text-sm text-gray-500'>No archive entries found.</p>
                </div>
              ) : (
                <table className='w-full' style={{ minWidth: '700px' }}>
                  <thead>
                    <tr className='border-b border-gray-200 bg-gray-50'>
                      <th className='px-4 py-3 w-10'></th>
                      {['#', 'Config Name', 'Source', 'Date & Time', 'Data Size', 'Status'].map((h) => (
                        <th key={h} className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArchiveLogs.map((log: any, i: number) => {
                      const rowKey = `${log.dateTime ?? i}__${log.configName ?? i}`;
                      const isSelected = selectedArchiveKey === rowKey;
                      return (
                        <tr
                          key={i}
                          onClick={() => setSelectedArchiveKey(rowKey)}
                          className={`border-b border-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                            <input
                              type='radio'
                              name='archive-row'
                              checked={isSelected}
                              onChange={() => setSelectedArchiveKey(rowKey)}
                              className='w-4 h-4 accent-blue-600 cursor-pointer'
                            />
                          </td>
                          <td className='px-4 py-3 text-xs text-gray-400 tabular-nums'>{archivePageIndex * 10 + i + 1}</td>
                          <td className='px-4 py-3'>
                            <div className='flex items-center gap-2'>
                              <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 border border-gray-100'>
                                <span className='text-[10px] font-bold text-purple-500'>A</span>
                              </div>
                              <span className='text-sm font-semibold text-gray-900'>{log.configName ?? '—'}</span>
                            </div>
                          </td>
                          <td className='px-4 py-3 text-xs text-gray-600'>{log.sourceName ?? '—'}</td>
                          <td className='px-4 py-3 text-xs text-gray-600 whitespace-nowrap'>{log.dateTime ? formatDateTime(log.dateTime) : '—'}</td>
                          <td className='px-4 py-3 text-xs text-gray-600 tabular-nums'>
                            {log.dataSize != null ? `${(log.dataSize / (1024 * 1024)).toFixed(2)} MB` : '—'}
                          </td>
                          <td className='px-4 py-3'>
                            {log.status ? (() => {
                              const s = log.status.toUpperCase();
                              const styles: Record<string, string> = { SUCCESS: 'bg-green-100 text-green-700', FAILED: 'bg-red-100 text-red-700', RUNNING: 'bg-blue-100 text-blue-700', PENDING: 'bg-indigo-100 text-indigo-700', PARTIAL: 'bg-yellow-100 text-yellow-700' };
                              return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[s] ?? 'bg-gray-100 text-gray-600'}`}>{log.status}</span>;
                            })() : <span className='text-gray-400 text-xs'>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Footer */}
            <div className='flex-shrink-0 mt-auto flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500'>
              <button
                onClick={goArchivePrevPage}
                disabled={archivePageIndex === 0 || isFetchingArchive}
                className='inline-flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed'
              >
                ← Prev
              </button>
              <button
                onClick={goArchiveNextPage}
                disabled={!archiveNextCursor || isFetchingArchive}
                className='inline-flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed'
              >
                Next →
              </button>
              <span className='ml-auto text-xs text-gray-400'>Page {archivePageIndex + 1} · {filteredArchiveLogs.length} entries</span>
            </div>
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
            onClick={onNext}
            disabled={!canProceed}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            style={{ background: '#155DFC' }}
          >
            Next: Choose Selection Scope →
          </button>
        </div>
      </div>
    </div>
  );
}
