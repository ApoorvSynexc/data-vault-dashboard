import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Typography from '../../../components/Typography';
import PermissionGate from '../../../components/PermissionGate';
import Table from '../../../components/Table';
import type { TableColumn } from '../../../components/Table';
import { useQuery } from '@tanstack/react-query';
import { useRestoreService } from '../../../services/restore/restore.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className='rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center gap-3 min-w-0'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(21,93,252,0.08)' }}>
        {icon}
      </div>
      <div className='min-w-0'>
        <p className='text-xl font-bold leading-tight text-gray-900'>{value}</p>
        <p className='mt-0.5 text-xs text-gray-500 leading-tight'>{label}</p>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onNewRestore: () => void;
  onViewHistory?: (jobId?: string) => void;
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isFiltered = value !== 'All';
  const activeLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setOpen((v) => !v);
  }

  return (
    <div>
      <button
        ref={btnRef}
        type='button'
        onClick={handleOpen}
        className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
          isFiltered
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
        }`}
      >
        <span className='text-[10px] font-semibold uppercase tracking-wide opacity-60'>{label}:</span>
        <span>{isFiltered ? activeLabel : 'All'}</span>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' className='h-2.5 w-2.5 opacity-50'>
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 9999 }}
          className='min-w-[130px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type='button'
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium transition hover:bg-gray-50 ${
                value === opt.value ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {opt.label}
              {value === opt.value && (
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' className='h-3 w-3 text-blue-600'>
                  <polyline points='20 6 9 17 4 12' />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function SourceBadge({ type }: { type: 'Backup' | 'Archive' }) {
  return type === 'Backup'
    ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>Backup</span>
    : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700'>Archive</span>;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DONE:        { label: '✓ Done',        cls: 'bg-green-100 text-green-700' },
  PARTIAL:     { label: '⚠ Partial',     cls: 'bg-yellow-100 text-yellow-700' },
  FAILED:      { label: '✗ Failed',      cls: 'bg-red-100 text-red-700' },
  DRAFT:       { label: '📝 Draft',      cls: 'bg-orange-100 text-orange-700' },
  PENDING:     { label: '⏳ Pending',    cls: 'bg-blue-100 text-blue-700' },
};

// ── Component ─────────────────────────────────────────────────────────────────

type FilterChip = 'All' | 'Success' | 'Failed' | 'Partial' | 'Drafts' | 'Pending';

const CHIPS: FilterChip[] = ['All', 'Pending', 'Success', 'Failed', 'Partial', 'Drafts'];
  
type RestoreRow = {
  id: string;
  name: string;
  tags: string;
  source: 'Backup' | 'Archive';
  destination: string;
  records: string;
  status: string;
  started: string;
};

export default function RestoreCenterHomePage({ onNewRestore, onViewHistory }: Props) {
  const restoreService = useRestoreService();
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<FilterChip>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['restore-jobs-list-home', search, activeChip, currentCursor],
    queryFn: () => restoreService.listRestoreJobs(search || undefined, activeChip),
  });

  const { data: statsData } = useQuery({
    queryKey: ['restore-job-stats'],
    queryFn: () => restoreService.getJobStats(),
  });

  const stats = (statsData as any)?.data ?? {};
  const totalRestoreJobs  = stats.totalRestoreJobs  ?? '—';
  const pendingRestore    = stats.pendingRestore     ?? '—';
  const failedRestore     = stats.failedRestore      ?? '—';
  const successRecordCount = stats.successRecordCount != null
    ? stats.successRecordCount >= 1_000_000
      ? `${(stats.successRecordCount / 1_000_000).toFixed(1)}M`
      : stats.successRecordCount >= 1_000
        ? `${(stats.successRecordCount / 1_000).toFixed(1)}K`
        : String(stats.successRecordCount)
    : '—';

  const apiMeta = (jobsData as any)?.meta ?? {};
  const nextCursor: string | null = apiMeta?.nextCursor ?? null;
  const totalRecords: number = apiMeta?.totalRecords ?? 0;
  const pageSize: number = apiMeta?.limit ?? 25;

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorHistory((h) => [...h, nextCursor]);
    setCurrentCursor(nextCursor);
    setCurrentPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (currentPage <= 1) return;
    const newHistory = cursorHistory.slice(0, -1);
    setCursorHistory(newHistory);
    setCurrentCursor(newHistory[newHistory.length - 1] ?? null);
    setCurrentPage((p) => p - 1);
  };

  const restoreColumns: TableColumn<RestoreRow>[] = [
    {
      key: 'name',
      header: 'Job Name',
      render: (row) => (
        <div>
          <p className='font-semibold text-gray-900'>{row.name}</p>
          {row.tags && <p className='text-xs text-gray-400 mt-0.5'>{row.tags}</p>}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => <SourceBadge type={row.source} />,
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (row) => <span className='text-gray-600'>{row.destination}</span>,
    },
    {
      key: 'records',
      header: 'Records',
      render: (row) => <span className='tabular-nums text-gray-700'>{row.records}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const cfg = STATUS_CONFIG[row.status] ?? { label: row.status, cls: 'bg-gray-100 text-gray-600' };
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>{cfg.label}</span>;
      },
    },
    {
      key: 'started',
      header: 'Started',
      render: (row) => <span className='text-gray-500 whitespace-nowrap'>{row.started}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        onViewHistory ? (
          <button
            onClick={() => onViewHistory(row.id)}
            className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'
          >
            View
          </button>
        ) : null
      ),
    },
  ];

  function formatDate(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayOnly = new Date(todayOnly);
    yesterdayOnly.setDate(yesterdayOnly.getDate() - 1);

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const allRestoresRaw = !isLoading && jobsData
    ? ((jobsData as any)?.data ?? []).map((item: any) => ({
        id: item.restoreId,
        name: item.jobDetail?.name || 'Untitled Restore',
        tags: item.jobDetail?.tags?.join(', ') || '',
        source: item.source?.backupConfigId ? 'Backup' : 'Archive',
        destination: item.destination?.type === 'SAME' ? 'Same Org' : item.destination?.crmId || 'Unknown',
        records: '—',
        status: item.status,
        started: formatDate(item.createdAt),
      }))
    : [];

  const allRestores: RestoreRow[] = allRestoresRaw;

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0'>

        {/* ── Header card ── */}
        <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm flex-shrink-0'>
          <div>
            <Typography as='h2' variant='pageTitle'>Restore Center</Typography>
            <Typography variant='bodySm' color='muted' className='mt-0.5'>Recover data from backups and archives</Typography>
          </div>
          <PermissionGate permission='restore.write'>
            <button
              onClick={onNewRestore}
              className='inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap bg-blue-600'
            >
              + New Restore
            </button>
          </PermissionGate>
        </div>

        <div className='flex-shrink-0 flex items-start gap-3 rounded-xl px-4 py-3 text-sm' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <svg width='16' height='16' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
            <circle cx='12' cy='12' r='10' /><line x1='12' y1='16' x2='12' y2='12' /><line x1='12' y1='8' x2='12.01' y2='8' />
          </svg>
          <p className='text-blue-800 text-xs leading-relaxed'>
            <span className='font-semibold'>Recovery Readiness: </span>
            Last successful backup <strong>Today, 06:00 AM</strong> · Last verified snapshot <strong>Yesterday, 11:59 PM</strong> · Last successful restore <strong>3 days ago</strong>
          </p>
        </div>
        <div className='flex-shrink-0 flex gap-3'>
          <button
            onClick={onNewRestore}
            className='flex-1 flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-opacity hover:opacity-90'
            style={{ background: '#155DFC' }}
          >
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg width='20' height='20' fill='none' stroke='white' strokeWidth='2.5' viewBox='0 0 24 24'>
                <polyline points='23 4 23 10 17 10' /><path d='M20.49 15a9 9 0 1 1-.29-4.36' />
              </svg>
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-white'>⚡ Quick Recover Yesterday</p>
              <p className='text-xs text-blue-100 mt-0.5 leading-relaxed'>Opens the wizard pre-filled with yesterday's snapshot → same org → overwrite mode · You'll review before running.</p>
            </div>
            <svg width='16' height='16' fill='none' stroke='rgba(255,255,255,0.7)' strokeWidth='2' viewBox='0 0 24 24' className='ml-auto flex-shrink-0'>
              <polyline points='9 18 15 12 9 6' />
            </svg>
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm flex-shrink-0'>
          <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-2.5'>Restore Status</Typography>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <MetricCard label='Total Restores' value={totalRestoreJobs}
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='23 4 23 10 17 10' /><path d='M20.49 15a9 9 0 1 1-.29-4.36' /></svg>}
            />
            <MetricCard label='Pending' value={pendingRestore}
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></svg>}
            />
            <MetricCard label='Failed' value={failedRestore}
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><circle cx='12' cy='12' r='10' /><line x1='15' y1='9' x2='9' y2='15' /><line x1='9' y1='9' x2='15' y2='15' /></svg>}
            />
            <MetricCard label='Records Restored' value={successRecordCount}
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='20 6 9 17 4 12' /></svg>}
            />
          </div>
        </div>

        {/* ── All Restores ── */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col' style={{ height: 'calc(100vh - 420px)', minHeight: 300 }}>
          <div className='flex items-center justify-between px-5 py-3 border-b border-gray-100'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>All Restores</Typography>
          </div>

          {/* Filter Bar */}
          <div className='flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-100'>
            <div className='relative flex-1'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400'>
                <circle cx='11' cy='11' r='8' /><path d='M21 21l-4.35-4.35' strokeLinecap='round' />
              </svg>
              <input
                type='text'
                placeholder='Search jobs...'
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                className='pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full max-w-xs'
              />
            </div>

            <div className='flex items-center gap-2 ml-auto'>
              <Dropdown
                label='Status'
                value={activeChip}
                options={CHIPS.map((chip) => ({ value: chip, label: chip }))}
                onChange={(value) => { setActiveChip(value as FilterChip); }}
              />
            </div>
          </div>

          <Table<RestoreRow>
            columns={restoreColumns}
            rows={allRestores}
            getRowKey={(row) => row.id}
            loading={isLoading}
            rowClassName='border-t border-gray-100 hover:bg-gray-50'
            borderless
            cellPaddingClassName='px-5 py-3'
            paginationClassName='px-5 py-2'
            emptyState='No restores yet.'
            serialNumberStart={(currentPage - 1) * pageSize + 1}
            paginationConfig={{
              type: 'cursor',
              hasPrev: currentPage > 1,
              hasNext: !!nextCursor,
              onPrev: handlePrev,
              onNext: handleNext,
              label: `Showing ${(currentPage - 1) * pageSize + 1}–${(currentPage - 1) * pageSize + allRestores.length} of ${totalRecords}`,
            }}
          />
        </div>

      </div>
    </div>
  );
}
