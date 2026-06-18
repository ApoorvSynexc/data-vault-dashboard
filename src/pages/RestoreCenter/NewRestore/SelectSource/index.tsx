// SelectSource — Step 1 of 7 in the New Restore wizard.
//
// Lets the user:
//   1. Name the restore job and add optional tags (auto-saves as draft)
//   2. Pick a source type: Backup Snapshot | Archive Vault Entry | Unified Search | Multi-Snapshot Merge
//   3. Select the exact snapshot / archive entry from the sub-picker that matches the chosen type

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../../components/Typography';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';
import { useDestinationService } from '../../../../services/destination/destination.service';
import type { Destination } from '../../../../services/destination/destination.service';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { useRestoreService } from '../../../../services/restore/restore.service';
import { formatBytes, formatDateTime } from '../../../../utils';
import awsLogo from '../../../../assets/icons/aws_logo.svg';

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'backup' | 'archive' | 'unified' | 'merge';
type BackupMode = 'list' | 'pit';
type UnifiedTab = 'backup' | 'archive' | 'all';

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

interface ArchiveEntry {
  id: string;
  name: string;
  object: string;
  records: string;
  size: string;
  tier: 'Cold' | 'Warm';
  lastRefreshed: string;
}

interface UnifiedResult {
  id: string;
  name: string;
  policy: string;
  kind: 'Backup' | 'Archive';
  records: string;
  date: string;
}

// BACKUPS now loaded from API in the component

const ARCHIVES: ArchiveEntry[] = [
  { id: '1', name: 'Closed Cases — 18 months',   object: 'Case',        records: '1.24M', size: '62.1 GB', tier: 'Cold', lastRefreshed: 'Yesterday' },
  { id: '2', name: 'Cold Leads — 90 days',        object: 'Lead',        records: '2.89M', size: '74.2 GB', tier: 'Warm', lastRefreshed: 'Today, 04:00 AM' },
  { id: '3', name: 'Closed-Lost Opportunities',   object: 'Opportunity', records: '418K',  size: '22.4 GB', tier: 'Cold', lastRefreshed: '04 May, 03:00 AM' },
  { id: '4', name: 'Completed Tasks — 24 months', object: 'Task',        records: '268K',  size: '23.7 GB', tier: 'Cold', lastRefreshed: '15 Apr, 11:00 PM' },
];

const UNIFIED: UnifiedResult[] = [
  { id: '1', name: 'May 27, 2026 · 06:00 AM', policy: 'Full Production Backup', kind: 'Backup', records: '123,213', date: 'Today' },
  { id: '2', name: 'May 26, 2026 · 06:00 AM', policy: 'Full Production Backup', kind: 'Backup', records: '123,108', date: 'Yesterday' },
  { id: '3', name: 'May 25, 2026 · 06:00 AM', policy: 'Full Production Backup', kind: 'Backup', records: '122,990', date: '2 days ago' },
  { id: '4', name: 'May 24, 2026 · 06:00 AM', policy: 'Full Production Backup', kind: 'Backup', records: '122,810', date: '3 days ago' },
  { id: '5', name: 'May 23, 2026 · 06:00 AM', policy: 'Full Production Backup', kind: 'Backup', records: '122,640', date: '4 days ago' },
];

// ── Small helpers ─────────────────────────────────────────────────────────────


// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Scope', 'Destination', 'Policy', 'Conflict', 'Preview', 'Review'];

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

// ── Available storage providers ───────────────────────────────────────────────

const STORAGE_PROVIDERS = [
  { id: 'AWS', label: 'AWS S3', description: 'Amazon Web Services', logo: awsLogo },
];

// ── Cloud source picker (storage destination as restore source) ───────────────

function CloudSourcePicker({
  selectedProvider,
  setSelectedProvider,
  selectedConnection,
  setSelectedConnection,
}: {
  selectedProvider: string;
  setSelectedProvider: (p: string) => void;
  selectedConnection: Destination | null;
  setSelectedConnection: (c: Destination | null) => void;
}) {
  const destinationService = useDestinationService();

  const { data: destData, isLoading } = useQuery({
    queryKey: ['restore-source-destinations'],
    queryFn: () => destinationService.listDestinations(),
    staleTime: 0,
  });

  const allDest: Destination[] = (destData as any)?.data ?? destData ?? [];
  const connections = allDest.filter(
    (d) => d.provider === selectedProvider && d.status === 'ACTIVE',
  );

  useEffect(() => { setSelectedConnection(null); }, [selectedProvider]);

  return (
    <div className='flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0'>
      <div className='flex items-center gap-3 border-b border-gray-100 px-5 py-3 flex-shrink-0'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>Cloud Source</Typography>
        <span className='text-xs text-gray-400'>Select the storage platform and connection to restore from</span>
      </div>
      <div className='flex-1 min-h-0 p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>

        {/* Left — Available Storage Platforms */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 flex flex-col min-h-0'>
          <p className='text-sm font-semibold text-gray-800 mb-3 flex-shrink-0'>Available Source Platform</p>
          <div className='flex-1 overflow-y-auto space-y-2 pr-1'>
            {STORAGE_PROVIDERS.map((p) => {
              const isSelected = selectedProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      )}
                    </div>
                    <img src={p.logo} alt={p.label} className='w-10 h-10 rounded-lg object-contain flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <p className={`font-semibold truncate ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{p.label}</p>
                      <p className='text-xs text-gray-400'>{p.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — Available Connections */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 flex flex-col min-h-0'>
          <p className='text-sm font-semibold text-gray-800 mb-3 flex-shrink-0'>
            Available {selectedProvider} Connections
          </p>
          {isLoading ? (
            <div className='flex-1 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
            </div>
          ) : (
            <div className='flex-1 overflow-y-auto space-y-3 pr-1'>
              {connections.length === 0 ? (
                <p className='text-center text-sm text-gray-400 py-8'>No active connections for this platform.</p>
              ) : (
                connections.map((conn) => {
                  const isSelected = selectedConnection?.destinationId === conn.destinationId;
                  return (
                    <div
                      key={conn.destinationId}
                      onClick={() => setSelectedConnection(conn)}
                      className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && (
                            <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                            </svg>
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className={`font-semibold truncate ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{conn.name}</p>
                          <p className='text-xs text-gray-400 truncate'>Provider: {conn.provider}</p>
                          <p className='text-xs text-gray-400 truncate'>Status: {conn.status}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

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
  {
    id: 'unified',
    icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>,
    title: 'Unified Search',
    desc: 'Search across both Backup & Archive',
  },
  {
    id: 'merge',
    icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><rect x='2' y='3' width='20' height='14' rx='2'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/></svg>,
    title: 'Multi-Snapshot Merge',
    desc: 'Combine records from 2+ snapshots',
  },
];

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onNext: () => void; onBack: () => void; }

export default function SelectSource({ onNext, onBack }: Props) {
  const [phase, setPhase]             = useState<'cloud' | 'source'>('cloud');
  const [selectedProvider, setSelectedProvider]         = useState('AWS');
  const [selectedConnection, setSelectedConnection]     = useState<Destination | null>(null);
  const [sourceType, setSourceType]   = useState<SourceType>('backup');
  const [backupMode, setBackupMode]   = useState<BackupMode>('list');
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [selectedArchive, setSelectedArchive] = useState<string>('1');

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
  const restoreService = useRestoreService();

  // ── Snapshot logs state (shown inline in the backup table) ────────────────
  const [jobsFilterName, setJobsFilterName] = useState('');
  const [jobsFilterType, setJobsFilterType] = useState<'REALTIME' | 'SCHEDULE'>('SCHEDULE');
  const [jobsFilterSource, setJobsFilterSource] = useState('ALL');
  const [jobsCursorStack, setJobsCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [jobsPageIndex, setJobsPageIndex] = useState(0);
  const [jobsPageLogs, setJobsPageLogs] = useState<any[]>([]);
  const [jobsNextCursor, setJobsNextCursor] = useState<string | undefined>(undefined);

  const jobsCurrentCursor = jobsCursorStack[jobsPageIndex];

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
    enabled: !!selectedConnection && sourceType === 'backup' && phase === 'source',
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

  const [selectedMerge, setSelectedMerge] = useState<Set<string>>(new Set());
  const [unifiedTab, setUnifiedTab]   = useState<UnifiedTab>('backup');
  const [unifiedSearch, setUnifiedSearch] = useState('');
  const [pitDate, setPitDate]         = useState('2026-05-23');
  const [pitTime, setPitTime]         = useState('14:23');

  // ── Archive table columns ─────────────────────────────────────────────────
  const archiveColumns: TableColumn<ArchiveEntry>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: (row) => (
        <input
          type='radio' name='arch' checked={selectedArchive === row.id}
          onChange={() => setSelectedArchive(row.id)}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    { key: 'name',         header: 'Archive Set',    render: (row) => <span className='text-sm font-semibold text-gray-900'>{row.name}</span> },
    { key: 'object',       header: 'Source Object',  render: (row) => <span className='text-sm text-gray-700'>{row.object}</span> },
    { key: 'records',      header: 'Records',        render: (row) => <span className='text-sm tabular-nums text-gray-700'>{row.records}</span> },
    { key: 'size',         header: 'Size',           render: (row) => <span className='text-sm text-gray-700'>{row.size}</span> },
    { key: 'tier', header: 'Tier', render: (row) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${row.tier === 'Cold' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{row.tier}</span> },
    { key: 'lastRefreshed',header: 'Last Refreshed', render: (row) => <span className='text-xs text-gray-500'>{row.lastRefreshed}</span> },
    {
      key: 'action',
      header: '',
      render: (row) => (
        <button
          onClick={() => setSelectedArchive(row.id)}
          className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
            selectedArchive === row.id
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-blue-600 text-blue-600 hover:bg-blue-50'
          }`}
        >
          {selectedArchive === row.id ? 'Selected' : 'Select'}
        </button>
      ),
    },
  ];

  // ── Unified table columns ─────────────────────────────────────────────────
  const unifiedColumns: TableColumn<UnifiedResult>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: () => <input type='radio' name='uni' className='w-4 h-4 accent-blue-600 cursor-pointer' />,
    },
    {
      key: 'name',
      header: 'Snapshot / Archive',
      render: (row) => (
        <div>
          <p className='text-sm font-semibold text-gray-900'>{row.name}</p>
          <p className='text-xs text-gray-400 mt-0.5'>{row.policy}</p>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'Source / Policy',
      render: (row) => (
        row.kind === 'Backup'
          ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>📸 Backup</span>
          : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700'>▤ Archive</span>
      ),
    },
    { key: 'records', header: 'Records', render: (row) => <span className='text-sm tabular-nums text-gray-700'>{row.records}</span> },
    { key: 'date',    header: 'Date',    render: (row) => <span className='text-xs text-gray-500'>{row.date}</span> },
  ];

  // ── Merge table columns ───────────────────────────────────────────────────
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

  const canProceed =
    sourceType === 'backup'  ? !!selectedBackup :
    sourceType === 'archive' ? !!selectedArchive :
    sourceType === 'unified' ? true :
    selectedMerge.size >= 2;

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
          <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 1 of 7</p>
          <Typography as='h1' variant='pageTitle' color='primary'>Discover &amp; Select Source</Typography>
          <Typography variant='bodySm' color='muted' className='mt-1'>
            First pick where the data lives. Then choose the exact snapshot or entry below.
          </Typography>
          <div className='mt-4'>
            <ProgressBar active={1} />
          </div>
        </div>

        {/* Phase 1 — Cloud Source picker */}
        {phase === 'cloud' && (
          <CloudSourcePicker
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            selectedConnection={selectedConnection}
            setSelectedConnection={setSelectedConnection}
          />
        )}

        {/* Phase 2 — Source Type cards + sub-pickers */}
        {phase === 'source' && <div className='contents'>

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
                    onClick={() => { setJobsFilterType(t); resetJobsPagination(); }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                      jobsFilterType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'SCHEDULE' ? 'Schedule' : 'Realtime'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter bar — always visible */}
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
                    <table className='w-full' style={{ minWidth: '860px' }}>
                      <thead>
                        <tr className='border-b border-gray-200 bg-gray-50'>
                          <th className='px-4 py-3 w-10'></th>
                          {['#', 'Backup Name', 'Date & Time', 'Source', 'Backup Type', 'Status', 'Data Size', 'Actions'].map((h) => (
                            <th key={h} className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log: any, i: number) => {
                          const rowKey = `${log.dateTime ?? i}__${log.configName ?? i}`;
                          const isSelected = selectedBackup === rowKey;
                          return (
                            <tr
                              key={i}
                              onClick={() => setSelectedBackup(isSelected ? '' : rowKey)}
                              className={`border-b border-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                              <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                                <input
                                  type='checkbox'
                                  checked={isSelected}
                                  onChange={() => setSelectedBackup(isSelected ? '' : rowKey)}
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
                                {log.backupType ? (() => {
                                  const isRealtime = log.backupType === 'RealTime';
                                  return (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isRealtime ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {isRealtime
                                        ? <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'><circle cx='12' cy='12' r='10'/><circle cx='12' cy='12' r='3' fill='currentColor' stroke='none'/></svg>
                                        : <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>
                                      }
                                      {isRealtime ? 'Realtime' : 'Schedule'}
                                    </span>
                                  );
                                })() : <span className='text-gray-400 text-xs'>—</span>}
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
          <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>▤ Choose an Archive Vault Entry</Typography>
              <span className='text-xs text-gray-400'>4 archive sets available</span>
            </div>
            <div className='px-4 py-3 border-b border-gray-100'>
              <div className='flex items-start gap-3 rounded-lg px-4 py-3 text-xs' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <svg width='14' height='14' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
                  <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' />
                </svg>
                <p className='text-blue-800 leading-relaxed'>Cold-tier archives require 1–5 min hydration before restore. Warm-tier is immediate.</p>
              </div>
            </div>
            {/* Filters */}
            <div className='flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
              <span className='text-xs font-bold text-gray-600'>Filter:</span>
              <select className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 outline-none'>
                <option>All tiers</option><option>Cold only</option><option>Warm only</option>
              </select>
              <input placeholder='Search archive sets' className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none flex-1 sm:flex-none sm:w-44' />
              <span className='ml-auto text-xs text-gray-400 hidden sm:inline'>Showing 4 of 4 sets</span>
            </div>
            <Table
              columns={archiveColumns}
              rows={ARCHIVES}
              getRowKey={(r) => r.id}
              borderless
              headerVariant='uppercase'
              cellPaddingClassName='px-4 py-3'
              rowClassName={(row) =>
                `border-b border-gray-50 transition-colors cursor-pointer ${selectedArchive === row.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`
              }
              onRowClick={(row) => setSelectedArchive(row.id)}
            />
          </div>
        )}

        {/* ── Unified Search sub-picker ── */}
        {sourceType === 'unified' && (
          <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='flex items-center gap-3 border-b border-gray-100 px-5 py-3'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>🔎 Search across Backups + Archives</Typography>
            </div>
            <div className='p-4 flex flex-col gap-3'>
              {/* Search input */}
              <div className='flex items-center gap-2 border border-gray-300 rounded-lg px-3 h-10 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'>
                <svg width='14' height='14' fill='none' stroke='#94a3b8' strokeWidth='2' viewBox='0 0 24 24'>
                  <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                <input
                  value={unifiedSearch}
                  onChange={(e) => setUnifiedSearch(e.target.value)}
                  placeholder='Search snapshots and archives by date, policy name, or source'
                  className='flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400'
                />
              </div>
              {/* Tabs */}
              <div className='flex gap-4 border-b border-gray-200'>
                {(['backup', 'archive', 'all'] as UnifiedTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setUnifiedTab(t)}
                    className={`pb-2 text-sm font-semibold border-b-2 transition-colors capitalize ${
                      unifiedTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'backup' ? 'From Backups' : t === 'archive' ? 'From Archives' : 'All'}
                    <span className='ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600'>
                      {t === 'backup' ? '128' : t === 'archive' ? '42' : '170'}
                    </span>
                  </button>
                ))}
              </div>
              <Table
                columns={unifiedColumns}
                rows={UNIFIED}
                getRowKey={(r) => r.id}
                borderless
                headerVariant='uppercase'
                cellPaddingClassName='px-4 py-3'
                rowClassName='border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer'
              />
              <p className='text-xs text-gray-400 leading-relaxed'>
                Searching snapshot and archive metadata. Showing 5 of 128 backups.{' '}
                <button className='text-blue-600 hover:underline'>Load more</button>
              </p>
            </div>
          </div>
        )}

        {/* ── Multi-Snapshot Merge sub-picker ── */}
        {sourceType === 'merge' && (
          <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
              <div className='flex items-center gap-2'>
                <Typography as='h3' variant='sectionTitle' color='secondary'>🧩 Multi-Snapshot Merge</Typography>
                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>Backup snapshots only</span>
              </div>
              <span className='text-xs text-gray-400 flex-shrink-0'>Pick 2 or more snapshots</span>
            </div>
            <div className='p-4 flex flex-col gap-3'>
              {/* Info */}
              <div className='flex items-start gap-3 rounded-lg px-4 py-3 text-xs' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <svg width='14' height='14' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
                  <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' />
                </svg>
                <p className='text-blue-800 leading-relaxed'>When a record exists in more than one selected snapshot, the merge rule below decides which version wins.</p>
              </div>
              {/* Selected chips */}
              <div className='flex items-center gap-2 flex-wrap rounded-lg px-4 py-2.5 border border-blue-200 bg-blue-50'>
                <span className='text-xs font-bold text-blue-600'>Selected ({selectedMerge.size}):</span>
                {selectedMerge.size === 0 ? (
                  <span className='text-xs text-gray-400 italic'>No snapshots selected — pick from the table below.</span>
                ) : (
                  apiBackups.filter((b) => selectedMerge.has(b.id)).map((b) => (
                    <span key={b.id} className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-blue-300 text-xs font-semibold text-blue-700'>
                      {b.name}
                      <button onClick={() => setSelectedMerge((p) => { const n = new Set(p); n.delete(b.id); return n; })} className='text-blue-400 hover:text-blue-600 leading-none'>×</button>
                    </span>
                  ))
                )}
              </div>
              <Table
                columns={mergeColumns}
                rows={apiBackups.slice(0, 6)}
                getRowKey={(r) => r.id}
                borderless
                headerVariant='uppercase'
                cellPaddingClassName='px-4 py-3'
                rowClassName={(row) =>
                  `border-b border-gray-50 transition-colors cursor-pointer ${selectedMerge.has(row.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`
                }
                onRowClick={(row) => setSelectedMerge((p) => { const n = new Set(p); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; })}
              />
              {selectedMerge.size >= 2 && (
                <div className='flex items-start gap-3 rounded-lg px-4 py-3 text-xs border border-yellow-300 bg-yellow-50'>
                  <span className='text-yellow-700'>⚠</span>
                  <span className='text-yellow-800 flex-1'>When records exist in multiple snapshots —</span>
                  <select className='h-7 text-xs border border-gray-300 rounded-lg px-2 bg-white text-gray-700 outline-none ml-2'>
                    <option>Newest LastModifiedDate wins</option>
                    <option>Oldest snapshot wins</option>
                    <option>Latest selected snapshot wins</option>
                    <option>Per-field rule (set on Conflict step)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        </div>}
        {/* end phase === 'source' */}

      </div>

      {/* ── Footer ── */}
      <div className='flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white'>
        <button
          onClick={phase === 'source' ? () => setPhase('cloud') : onBack}
          className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          {phase === 'source' ? '← Back' : '← Cancel'}
        </button>
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
            💾 Save as Draft
          </button>
          {phase === 'cloud' ? (
            <button
              onClick={() => setPhase('source')}
              disabled={!selectedConnection}
              className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              style={{ background: '#155DFC' }}
            >
              Next: Select Source Type →
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canProceed}
              className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              style={{ background: '#155DFC' }}
            >
              Next: Choose Selection Scope →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
