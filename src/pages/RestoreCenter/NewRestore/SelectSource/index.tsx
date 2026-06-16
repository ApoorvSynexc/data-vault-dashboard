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
import awsLogo from '../../../../assets/icons/aws_logo.svg';

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'backup' | 'archive' | 'unified' | 'merge';
type BackupMode = 'list' | 'pit';
type UnifiedTab = 'backup' | 'archive' | 'all';

interface BackupSnapshot {
  id: string;
  datetime: string;
  relative: string;
  source: string;
  size: string;
  integrity: 'Verified' | 'Failed';
  tier: 'Hot' | 'Cold';
  type: 'Scheduled' | 'On-Demand';
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

// ── Stub data ─────────────────────────────────────────────────────────────────

const BACKUPS: BackupSnapshot[] = [
  { id: '1', datetime: 'May 27, 2026 · 06:00 AM', relative: 'Today',       source: 'Production', size: '5.2 GB', integrity: 'Verified', tier: 'Hot',  type: 'Scheduled' },
  { id: '2', datetime: 'May 26, 2026 · 06:00 AM', relative: 'Yesterday',   source: 'Production', size: '5.1 GB', integrity: 'Verified', tier: 'Hot',  type: 'Scheduled' },
  { id: '3', datetime: 'May 25, 2026 · 06:00 AM', relative: '2 days ago',  source: 'Production', size: '5.1 GB', integrity: 'Verified', tier: 'Hot',  type: 'Scheduled' },
  { id: '4', datetime: 'May 24, 2026 · 06:00 AM', relative: '3 days ago',  source: 'Production', size: '5.1 GB', integrity: 'Verified', tier: 'Hot',  type: 'On-Demand' },
  { id: '5', datetime: 'May 23, 2026 · 06:00 AM', relative: '4 days ago',  source: 'Production', size: '5.0 GB', integrity: 'Verified', tier: 'Hot',  type: 'Scheduled' },
  { id: '6', datetime: 'May 22, 2026 · 06:00 AM', relative: '5 days ago',  source: 'Production', size: '5.0 GB', integrity: 'Verified', tier: 'Hot',  type: 'Scheduled' },
  { id: '7', datetime: 'May 18, 2026 · 06:00 AM', relative: '9 days ago',  source: 'Production', size: '4.9 GB', integrity: 'Verified', tier: 'Cold', type: 'Scheduled' },
  { id: '8', datetime: 'May 14, 2026 · 06:00 AM', relative: '13 days ago', source: 'Production', size: '4.8 GB', integrity: 'Verified', tier: 'Cold', type: 'Scheduled' },
  { id: '9', datetime: 'May 10, 2026 · 06:00 AM', relative: '17 days ago', source: 'Production', size: '4.7 GB', integrity: 'Verified', tier: 'Cold', type: 'Scheduled' },
  { id: '10', datetime: 'May 06, 2026 · 06:00 AM', relative: '21 days ago', source: 'Production', size: '4.7 GB', integrity: 'Verified', tier: 'Cold', type: 'Scheduled' },
];

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

function TierBadge({ tier }: { tier: 'Hot' | 'Cold' | 'Warm' }) {
  if (tier === 'Hot')  return <span className='flex items-center gap-1 text-xs text-orange-600 font-medium'>🔥 Hot</span>;
  if (tier === 'Warm') return <span className='flex items-center gap-1 text-xs text-orange-400 font-medium'>🔥 Warm</span>;
  return <span className='flex items-center gap-1 text-xs text-blue-500 font-medium'>❄ Cold</span>;
}

function IntegrityBadge({ v }: { v: 'Verified' | 'Failed' }) {
  return v === 'Verified'
    ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700'>✓ Verified</span>
    : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700'>✗ Failed</span>;
}

function TypeBadge({ type }: { type: string }) {
  return type === 'On-Demand'
    ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>On-Demand</span>
    : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600'>Scheduled</span>;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Selection', 'Destination', 'Conflict', 'Automation', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='flex items-center gap-0 overflow-x-auto'>
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
              <span className='hidden sm:inline'>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className='flex-1 h-0.5 mx-2' style={{ background: isDone ? '#22C55E' : '#E5E7EB' }} />
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
  const [jobName, setJobName]         = useState('');
  const [tags, setTags]               = useState('');
  const [selectedProvider, setSelectedProvider]         = useState('AWS');
  const [selectedConnection, setSelectedConnection]     = useState<Destination | null>(null);
  const [sourceType, setSourceType]   = useState<SourceType>('backup');
  const [backupMode, setBackupMode]   = useState<BackupMode>('list');
  const [selectedBackup, setSelectedBackup] = useState<string>('1');
  const [selectedArchive, setSelectedArchive] = useState<string>('1');
  const [selectedMerge, setSelectedMerge] = useState<Set<string>>(new Set());
  const [unifiedTab, setUnifiedTab]   = useState<UnifiedTab>('backup');
  const [unifiedSearch, setUnifiedSearch] = useState('');
  const [dateFilter, setDateFilter]   = useState('All dates');
  const [tierFilter, setTierFilter]   = useState('All tiers');
  const [srcFilter, setSrcFilter]     = useState('All sources');
  const [pitDate, setPitDate]         = useState('2026-05-23');
  const [pitTime, setPitTime]         = useState('14:23');

  // ── Backup table columns ──────────────────────────────────────────────────
  const backupColumns: TableColumn<BackupSnapshot>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: (row) => (
        <input
          type='radio' name='snap' checked={selectedBackup === row.id}
          onChange={() => setSelectedBackup(row.id)}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'datetime',
      header: 'Date & Time',
      render: (row) => (
        <div>
          <p className='text-sm font-semibold text-gray-900'>{row.datetime}</p>
          <p className='text-xs text-gray-400 mt-0.5'>{row.relative}</p>
        </div>
      ),
    },
    { key: 'source', header: 'Source', render: (row) => <span className='text-sm text-gray-700'>{row.source}</span> },
    { key: 'size',   header: 'Size',   render: (row) => <span className='text-sm text-gray-700'>{row.size}</span> },
    { key: 'integrity', header: 'Integrity', render: (row) => <IntegrityBadge v={row.integrity} /> },
    { key: 'tier',   header: 'Tier',   render: (row) => <TierBadge tier={row.tier} /> },
    { key: 'type',   header: 'Type',   render: (row) => <TypeBadge type={row.type} /> },
    {
      key: 'action',
      header: '',
      render: (row) => (
        <button
          onClick={() => setSelectedBackup(row.id)}
          className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
            selectedBackup === row.id
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-blue-600 text-blue-600 hover:bg-blue-50'
          }`}
        >
          {selectedBackup === row.id ? 'Selected' : 'Select'}
        </button>
      ),
    },
  ];

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
    { key: 'tier',         header: 'Tier',           render: (row) => <TierBadge tier={row.tier} /> },
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
      key: 'datetime',
      header: 'Date & Time',
      render: (row) => (
        <div>
          <p className='text-sm font-semibold text-gray-900'>{row.datetime}</p>
          <p className='text-xs text-gray-400 mt-0.5'>{row.relative}</p>
        </div>
      ),
    },
    { key: 'source',    header: 'Source',    render: (row) => <span className='text-sm text-gray-700'>{row.source}</span> },
    { key: 'size',      header: 'Size',      render: (row) => <span className='text-sm text-gray-700'>{row.size}</span> },
    { key: 'integrity', header: 'Integrity', render: (row) => <IntegrityBadge v={row.integrity} /> },
    { key: 'tier',      header: 'Tier',      render: (row) => <TierBadge tier={row.tier} /> },
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

        {/* Job name + tags + draft bar */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100'>
            {/* Job name */}
            <div className='px-4 pt-3 pb-2'>
              <label className='text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1'>
                Restore Job Name
                <span className='relative group'>
                  <span className='w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center cursor-help'>i</span>
                </span>
              </label>
              <input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder='Give this restore a name (optional)'
                className='mt-1.5 w-full text-sm text-gray-800 bg-transparent border-0 outline-none placeholder:text-gray-400 font-medium'
              />
            </div>
            {/* Tags */}
            <div className='px-4 pt-3 pb-2'>
              <label className='text-[11px] font-bold text-gray-600 uppercase tracking-wider'>Tags (optional)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder='e.g. INC-4711, compliance'
                className='mt-1.5 w-full text-sm text-gray-800 bg-transparent border-0 outline-none placeholder:text-gray-400'
              />
            </div>
          </div>
          {/* Draft status row */}
          <div className='flex items-center justify-end gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50'>
            <span className='flex items-center gap-1.5 text-[11px] font-medium text-green-600'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-500 inline-block' />
              Draft saved · just now
            </span>
            <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors'>
              💾 Save as Draft
            </button>
          </div>
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
          <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            {/* Header */}
            <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 flex-wrap gap-y-2'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>📸 Choose a Backup Snapshot</Typography>
              {/* Mode toggle */}
              <div className='flex items-center bg-gray-100 rounded-lg p-1 gap-1 flex-shrink-0'>
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
                {/* Filters */}
                <div className='flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
                  <span className='text-xs font-bold text-gray-600'>Filter:</span>
                  {[
                    { value: dateFilter, onChange: setDateFilter, options: ['All dates', 'Last 7 days', 'Last 30 days', 'Last quarter'] },
                    { value: tierFilter, onChange: setTierFilter, options: ['All tiers', 'Hot only', 'Cold only'] },
                    { value: srcFilter,  onChange: setSrcFilter,  options: ['All sources', 'Production', 'Sandbox Dev1'] },
                  ].map((f, i) => (
                    <select
                      key={i}
                      value={f.value}
                      onChange={(e) => f.onChange(e.target.value)}
                      className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 outline-none focus:border-blue-400'
                    >
                      {f.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ))}
                  <input
                    placeholder='Search by name or ID'
                    className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none focus:border-blue-400 min-w-0 flex-1 sm:flex-none sm:w-44'
                  />
                  <span className='ml-auto text-xs text-gray-400 whitespace-nowrap hidden sm:inline'>Showing 1–10 of 30 backups</span>
                </div>
                {/* Table */}
                <Table
                  columns={backupColumns}
                  rows={BACKUPS}
                  getRowKey={(r) => r.id}
                  borderless
                  headerVariant='uppercase'
                  cellPaddingClassName='px-4 py-3'
                  rowClassName={(row) =>
                    `border-b border-gray-50 transition-colors cursor-pointer ${selectedBackup === row.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`
                  }
                  onRowClick={(row) => setSelectedBackup(row.id)}
                />
                {/* Pagination */}
                <div className='flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500'>
                  <button className='text-blue-600 hover:underline'>‹ Newer</button>
                  <button className='text-blue-600 hover:underline'>Older ›</button>
                  <span className='ml-auto'>10 per page</span>
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
                  BACKUPS.filter((b) => selectedMerge.has(b.id)).map((b) => (
                    <span key={b.id} className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-blue-300 text-xs font-semibold text-blue-700'>
                      {b.relative}
                      <button onClick={() => setSelectedMerge((p) => { const n = new Set(p); n.delete(b.id); return n; })} className='text-blue-400 hover:text-blue-600 leading-none'>×</button>
                    </span>
                  ))
                )}
              </div>
              <Table
                columns={mergeColumns}
                rows={BACKUPS.slice(0, 6)}
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
          <button className='inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
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
