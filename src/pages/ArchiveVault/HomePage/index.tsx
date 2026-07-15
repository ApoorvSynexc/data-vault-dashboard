// Archive Vault HomePage — list view of all archive policies with actions.
//
// Data sources:
//   GET /v1/archival-config/list   → all archive policies (queryKey: archival-config-list)
//   GET /v1/archival-config/stats  → aggregate stats for the metric cards
//   GET /v1/connected-platforms    → platform names resolved by crmId
//
// Actions per row (dropdown):
//   Activate  → PUT /v1/archival-config?backupConfigId= { backupStatus: "ACTIVE" }
//   Run Now   → PUT /v1/archival-config?backupConfigId= { backupStatus: "RUNNING" }
//   Pause     → PUT /v1/archival-config?backupConfigId= { backupStatus: "PAUSED" }
//   Resume    → PUT /v1/archival-config?backupConfigId= { backupStatus: "ACTIVE" }
//   Edit Policy → navigates to /archive-vault/:slug/edit
//   Delete    → DELETE /v1/archival-config?backupConfigId= (requires confirmation dialog)
//
// Filtering: status filter buttons (All / Active / Running / Paused / Draft / etc.)
// are applied client-side on the full list. Search is also client-side with debounce.
// Pagination: 10 items per page, client-side slice.
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useArchivalService } from '../../../services/archival/archival.service';
import { usePlatformService } from '../../../services/platform/platform.service';
import Typography from '../../../components/Typography';
import Table from '../../../components/Table';
import type { TableColumn } from '../../../components/Table';
import { formatBytes } from '../../../utils';

// ── API types ─────────────────────────────────────────────────────────────────

type ArchivalConfigItem = {
  backupConfigId: string;
  name: string;
  slug: string;
  crmId: string;
  destinationId: string;
  backupStatus: string;
  status: string;
  schedule: string;
  objectNames: string[];
  createdAt: string;
  updatedAt: string;
  sizeInBytes?: number;
  archivedRecordsCount?: number;
  archivedSizeInBytes?: number;
  lastBackupAt?: string;
  scheduleConfig?: {
    type: string;
    timeZone: string;
    scheduling: { frequency: string; interval: number; startTime?: string; startDate?: string };
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function normalizeStatus(raw: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'ACTIVE', RUNNING: 'RUNNING', SCHEDULED: 'SCHEDULED',
    DRAFT: 'DRAFT', PAUSED: 'PAUSED', FAILED: 'FAILED',
    ONE_TIME: 'ONE_TIME', PENDING: 'PENDING', SUCCESS: 'SUCCESS',
    PARTIAL_FAILURE: 'PARTIAL_FAILURE', INACTIVE: 'INACTIVE', RESUMED: 'ACTIVE',
  };
  return map[raw?.toUpperCase()] ?? raw ?? 'DRAFT';
}

function crmNameToPlatform(name: string): string {
  const l = name?.toLowerCase() ?? '';
  if (l.includes('salesforce')) return 'Salesforce';
  if (l.includes('hubspot')) return 'HubSpot';
  if (l.includes('zoho')) return 'Zoho';
  return name ?? 'Unknown';
}

// ── Panel ─────────────────────────────────────────────────────────────────────

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className='flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='flex items-center gap-3 border-b border-gray-100 px-5 py-2.5 flex-shrink-0 overflow-x-auto'>
        <Typography as='h3' variant='sectionTitle' color='secondary' className='flex-shrink-0'>{title}</Typography>
        {action && <div className='flex items-center gap-2 flex-shrink-0 ml-auto'>{action}</div>}
      </div>
      {children}
    </section>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, loading, icon }: { label: string; value: string; loading?: boolean; icon: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center gap-3 min-w-0'>
      {/* Icon bubble */}
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(21,93,252,0.08)' }}>
        {icon}
      </div>
      {loading ? (
        <div>
          <div className='h-5 w-14 rounded bg-gray-100 animate-pulse' />
          <div className='mt-1.5 h-2.5 w-24 rounded bg-gray-100 animate-pulse' />
        </div>
      ) : (
        <div className='min-w-0'>
          <p className='text-xl font-bold leading-tight text-gray-900'>{value}</p>
          <p className='mt-0.5 text-xs text-gray-500 leading-tight'>{label}</p>
        </div>
      )}
    </div>
  );
}

// ── Platform Badge ────────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<string, { letter: string; fill: string }> = {
    Salesforce: { letter: 'S', fill: '#0ea5e9' },
    HubSpot:    { letter: 'H', fill: '#f97316' },
    Zoho:       { letter: 'Z', fill: '#10b981' },
  };
  const c = config[platform] ?? { letter: platform?.charAt(0)?.toUpperCase() ?? '?', fill: '#6b7280' };
  return (
    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50'>
      <svg viewBox='0 0 40 40' className='h-9 w-9' aria-hidden='true'>
        <rect x='5' y='5' width='30' height='30' rx='9' fill={c.fill} fillOpacity='0.16' />
        <text x='20' y='23' textAnchor='middle' fontSize='14' fontWeight='700' fill={c.fill}>{c.letter}</text>
      </svg>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE:           'bg-blue-100 text-blue-700',
    RUNNING:          'bg-green-100 text-green-700',
    SCHEDULED:        'bg-blue-100 text-blue-700',
    SUCCESS:          'bg-green-100 text-green-700',
    PENDING:          'bg-indigo-100 text-indigo-700',
    DRAFT:            'bg-yellow-100 text-yellow-700',
    PAUSED:           'bg-gray-100 text-gray-700',
    INACTIVE:         'bg-gray-100 text-gray-500',
    FAILED:           'bg-red-100 text-red-700',
    PARTIAL_FAILURE:  'bg-orange-100 text-orange-700',
    ONE_TIME:         'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active', RUNNING: 'Running', SCHEDULED: 'Scheduled',
    SUCCESS: 'Success', PENDING: 'Pending', DRAFT: 'Draft',
    PAUSED: 'Paused', INACTIVE: 'Inactive', FAILED: 'Failed',
    PARTIAL_FAILURE: 'Partial Failure', ONE_TIME: 'One Time',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, confirmLabel, danger, loading, error, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  loading?: boolean; error?: string | null; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className='w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6'>
        <h3 className='text-sm font-bold text-gray-900 mb-2'>{title}</h3>
        <p className='text-xs text-gray-500 mb-4'>{message}</p>
        {error && (
          <div className='mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600'>
            {error}
          </div>
        )}
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={onCancel} disabled={loading}
            className='rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50'>
            Cancel
          </button>
          <button type='button' onClick={onConfirm} disabled={loading}
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action Dropdown ───────────────────────────────────────────────────────────

type PolicyRow = { backupConfigId: string; name: string; slug: string; displayStatus: string };

type DropdownMenuItem = { label: string; danger?: boolean; disabled?: boolean; title?: string; onClick?: () => void };

function ActionDropdown({ items }: { items: DropdownMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className='relative' ref={ref}>
      <button type='button' onClick={() => setOpen((v) => !v)}
        className='flex items-center justify-center rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
        aria-label='Row actions'>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
          <circle cx='12' cy='5' r='1' fill='currentColor' />
          <circle cx='12' cy='12' r='1' fill='currentColor' />
          <circle cx='12' cy='19' r='1' fill='currentColor' />
        </svg>
      </button>
      {open && (
        <div className='absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'>
          {items.map((item) => (
            <button key={item.label} type='button'
              disabled={item.disabled}
              title={item.title}
              onClick={() => { if (!item.disabled) { setOpen(false); item.onClick?.(); } }}
              className={`flex w-full items-center px-3 py-2 text-left text-xs font-medium transition ${item.disabled ? 'cursor-not-allowed opacity-40' : item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter Dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
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
          className='min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ArchiveVaultHomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const archivalService = useArchivalService();
  const platformService = usePlatformService();
  const queryClient = useQueryClient();

  const currentPage = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const currentCursor = searchParams.get('cursor') ?? null;

  const goToPage = useCallback((page: number, cursor: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (page <= 1) {
        next.delete('page');
        next.delete('cursor');
      } else {
        next.set('page', String(page));
        if (cursor) next.set('cursor', cursor);
        else next.delete('cursor');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmPause, setConfirmPause] = useState<PolicyRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PolicyRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<PolicyRow | null>(null);
  const [confirmRunNow, setConfirmRunNow] = useState<PolicyRow | null>(null);

  const activateMutation = useMutation({
    mutationFn: (backupConfigId: string) =>
      archivalService.updateConfig(backupConfigId, { status: 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archival-config-list'] });
      setConfirmActivate(null);
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (backupConfigId: string) =>
      archivalService.updateConfig(backupConfigId, { status: 'RUNNING' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archival-config-list'] });
      setConfirmRunNow(null);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: ({ backupConfigId, isPaused }: { backupConfigId: string; isPaused: boolean }) =>
      archivalService.updateConfig(backupConfigId, { status: isPaused ? 'RESUMED' : 'PAUSED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archival-config-list'] });
      setConfirmPause(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (backupConfigId: string) => archivalService.deleteConfig(backupConfigId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archival-config-list'] });
      setConfirmDelete(null);
      setDeleteError(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? 'Failed to delete archive. Please try again.';
      setDeleteError(msg);
    },
  });

  // Debounce search — only reset page when actively typing
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      if (search) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('page');
          next.delete('cursor');
          return next;
        }, { replace: true });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filter changes
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) { isFirstFilterRender.current = false; return; }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('page');
      next.delete('cursor');
      return next;
    }, { replace: true });
  }, [statusFilter]);

  const { data: rawListData, isLoading: isLoadingList } = useQuery({
    queryKey: ['archival-config-list', currentCursor, debouncedSearch, statusFilter],
    queryFn: () => {
      const JOB_STATUS_SET = new Set(['SUCCESS', 'FAILED', 'PARTIAL_FAILURE', 'PENDING']);
      const isJobStatus = JOB_STATUS_SET.has(statusFilter);
      const apiStatus = !isJobStatus && statusFilter !== 'All' ? statusFilter : undefined;
      const apiBackupStatus = isJobStatus ? statusFilter : undefined;
      return archivalService.getList(currentCursor ?? undefined, debouncedSearch || undefined, apiStatus, apiBackupStatus);
    },
    staleTime: 0,
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['archival-config-stats'],
    queryFn: () => archivalService.getStats(),
    staleTime: 0,
  });

  const stats = (statsData as any)?.data ?? statsData ?? null;

  const { data: platformsData, isLoading: isLoadingPlatforms } = useQuery({
    queryKey: ['connected-platforms'],
    queryFn: () => platformService.getConnectedPlatforms(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isLoadingList || isLoadingPlatforms || isLoadingStats;

  const rawList: ArchivalConfigItem[] = Array.isArray((rawListData as any)?.data)
    ? (rawListData as any).data
    : Array.isArray(rawListData)
    ? rawListData
    : ((rawListData as any)?.data ?? []);

  const apiMeta = (rawListData as any)?.meta ?? { limit: 25, nextCursor: null, totalRecords: rawList.length, totalPages: 1 };

  const platforms: any[] = Array.isArray(platformsData) ? platformsData : ((platformsData as any)?.data ?? []);

  const crmPlatformMap: Record<string, string> = {};
  platforms.forEach((p: any) => {
    const id = p.crmId ?? p.id;
    if (id) crmPlatformMap[id] = crmNameToPlatform(p.crmName ?? p.name ?? '');
  });

  const enriched = rawList.map((item) => ({
    ...item,
    displayName: item.name ?? item.slug ?? '--',
    platform: crmPlatformMap[item.crmId] ?? 'Salesforce',
    displayStatus: normalizeStatus(item.status),
    lastJobStatus: item.backupStatus ? normalizeStatus(item.backupStatus) : '',
    displayDate: formatDate(item.lastBackupAt ?? item.createdAt),
  }));

  const JOB_STATUS_VALUES = new Set(['SUCCESS', 'FAILED', 'PARTIAL_FAILURE', 'PENDING']);

  // All filters are server-side — no client-side filtering needed
  const filtered = enriched;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-5 min-h-0'>

      {/* Page Header */}
      <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm'>
        <div>
          <Typography as='h2' variant='pageTitle'>Archive Vault</Typography>
          <Typography variant='bodySm' color='muted' className='mt-0.5'>
            Track schedules, status, and archived records across every connected platform.
          </Typography>
        </div>
        <button type='button' onClick={() => navigate('/archive-vault/new')}
          className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap'>
          + New Archive
        </button>
      </div>

      {/* Stats Section */}
      <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm'>
        <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-2.5'>
          Archive Status
        </Typography>
        <div className='grid grid-cols-4 gap-3'>
          <MetricCard loading={isLoading} label='Total archives' value={stats?.totalArchival != null ? pad(stats.totalArchival) : '--'}
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='21 8 21 21 3 21 3 8'/><rect x='1' y='3' width='22' height='5'/><line x1='10' y1='12' x2='14' y2='12'/></svg>}
          />
          <MetricCard loading={isLoading} label='Completed archives' value={stats?.completedArchival != null ? pad(stats.completedArchival) : '--'}
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>}
          />
          <MetricCard loading={isLoading} label='Total data archived' value={stats?.totalSize != null ? formatBytes(stats.totalSize) : '--'}
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'/><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'/></svg>}
          />
          <MetricCard loading={isLoading} label='Total records' value={stats?.totalRecords != null ? Number(stats.totalRecords).toLocaleString() : '--'}
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg>}
          />
        </div>
      </div>

      {/* Table Panel */}
      <Panel
        title='All Archives'
        action={
          <div className='flex items-center gap-2 flex-shrink-0'>
            {/* Search */}
            <div className='relative'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400'>
                <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search Archive'
                className='h-7 w-44 rounded-full border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
              />
            </div>
            <div className='h-5 w-px bg-gray-200' />
            <FilterDropdown
              label='Status'
              value={JOB_STATUS_VALUES.has(statusFilter) ? 'All' : statusFilter}
              options={[
                { label: 'All',      value: 'All'      },
                { label: 'Active',   value: 'ACTIVE'   },
                { label: 'Paused',   value: 'PAUSED'   },
                { label: 'Draft',    value: 'DRAFT'    },
                { label: 'Inactive', value: 'INACTIVE' },
              ]}
              onChange={(v) => setStatusFilter(v)}
            />
            <FilterDropdown
              label='Last Job'
              value={JOB_STATUS_VALUES.has(statusFilter) ? statusFilter : 'All'}
              options={[
                { label: 'All',             value: 'All'             },
                { label: 'Success',         value: 'SUCCESS'         },
                { label: 'Failed',          value: 'FAILED'          },
                { label: 'Partial Failure', value: 'PARTIAL_FAILURE' },
                { label: 'Pending',         value: 'PENDING'         },
              ]}
              onChange={(v) => setStatusFilter(v)}
            />
          </div>
        }
      >

        {/* Table */}
        {(() => {
          type EnrichedPolicy = typeof enriched[number];
          const columns: TableColumn<EnrichedPolicy>[] = [
            {
              key: 'displayName',
              header: 'Archive Policy',
              render: (policy) => (
                <div className='flex items-center gap-2.5'>
                  <PlatformBadge platform={policy.platform} />
                  <span
                    className='text-xs font-semibold text-blue-600 hover:underline cursor-pointer'
                    onClick={(e) => { e.stopPropagation(); navigate(`/archive-vault/${policy.slug ?? policy.backupConfigId}`); }}
                  >
                    {policy.displayName}
                  </span>
                </div>
              ),
            },
            {
              key: 'platform',
              header: 'Platform',
              render: (policy) => <span className='text-xs text-gray-600'>{policy.platform}</span>,
            },
            {
              key: 'displayStatus',
              header: 'Status',
              render: (policy) => <StatusBadge status={policy.displayStatus} />,
            },
            {
              key: 'lastJobStatus',
              header: 'Last Job Status',
              render: (policy) => policy.lastJobStatus
                ? <StatusBadge status={policy.lastJobStatus} />
                : <span className='text-xs text-gray-400'>--</span>,
            },
            {
              key: 'displayDate',
              header: 'Last Run',
              render: (policy) => <span className='text-xs text-gray-500 whitespace-nowrap'>{policy.displayDate}</span>,
            },
            {
              key: 'archivedRecordsCount',
              header: 'Records',
              render: (policy) => (
                <span className='text-xs text-gray-600'>
                  {policy.archivedRecordsCount != null ? Number(policy.archivedRecordsCount).toLocaleString() : '--'}
                </span>
              ),
            },
            {
              key: 'archivedSizeInBytes',
              header: 'Data Size',
              render: (policy) => (
                <span className='text-xs text-gray-600'>
                  {policy.archivedSizeInBytes ? formatBytes(policy.archivedSizeInBytes) : '--'}
                </span>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              render: (policy) => (
                <div className='flex items-center gap-1'>
                  <button type='button' title='View'
                    onClick={() => navigate(`/archive-vault/${policy.slug ?? policy.backupConfigId}`)}
                    className='flex items-center justify-center rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' /><circle cx='12' cy='12' r='3' />
                    </svg>
                  </button>
                  <ActionDropdown
                    items={[
                      ...(policy.displayStatus === 'DRAFT' ? [{ label: 'Activate', onClick: () => setConfirmActivate(policy) }] : []),
                      ...(policy.displayStatus !== 'DRAFT' ? [{ label: 'Run Now', onClick: () => setConfirmRunNow(policy) }] : []),
                      ...(policy.displayStatus !== 'DRAFT' ? [{ label: policy.displayStatus === 'PAUSED' ? 'Resume' : 'Pause', onClick: () => setConfirmPause(policy) }] : []),
                      {
                        label: 'Edit Policy',
                        disabled: policy.scheduleConfig?.scheduling?.frequency === 'ONCE',
                        title: policy.scheduleConfig?.scheduling?.frequency === 'ONCE' ? 'One-time archives cannot be edited' : undefined,
                        onClick: policy.scheduleConfig?.scheduling?.frequency === 'ONCE'
                          ? undefined
                          : () => navigate(`/archive-vault/edit/${policy.slug ?? policy.backupConfigId}`),
                      },
                      { label: 'Delete', danger: true, onClick: () => setConfirmDelete(policy) },
                    ]}
                  />
                </div>
              ),
            },
          ];

          return (
            <Table<EnrichedPolicy>
              columns={columns}
              rows={filtered}
              getRowKey={(p) => p.backupConfigId}
              loading={isLoading}
              skeletonConfig={{ rows: 4, colWidths: ['w-40', 'w-24', 'w-20', 'w-20', 'w-28', 'w-20', 'w-20', 'w-10'] }}
              headerVariant='uppercase'
              rowClassName='hover:bg-gray-50/60 transition-colors'
              cellPaddingClassName='px-5 py-3.5'
              emptyState='No archive policies match your filters.'
              showSerialNumber
              serialNumberStart={(currentPage - 1) * (apiMeta.limit ?? 25) + 1}
              pagination={{
                currentPage: 1,
                displayPage: currentPage,
                pageSize: apiMeta.limit ?? 25,
                totalRecords: apiMeta.totalRecords ?? filtered.length,
                onPageChange: (nextPage) => {
                  if (nextPage <= 0 || nextPage === currentPage) return;
                  if (nextPage === 1) { goToPage(1, null); return; }
                  if (nextPage === currentPage + 1 && apiMeta.nextCursor) {
                    goToPage(nextPage, apiMeta.nextCursor);
                  }
                },
              }}
            />
          );
        })()}
      </Panel>

      {/* Pause / Resume confirm */}
      {confirmPause && (
        <ConfirmDialog
          title={confirmPause.displayStatus === 'PAUSED' ? `Resume "${confirmPause.name}"?` : `Pause "${confirmPause.name}"?`}
          message={confirmPause.displayStatus === 'PAUSED'
            ? 'The archive will resume running on its scheduled frequency.'
            : 'The archive will stop running until you resume it.'}
          confirmLabel={confirmPause.displayStatus === 'PAUSED' ? 'Resume' : 'Pause'}
          loading={pauseMutation.isPending}
          onConfirm={() => pauseMutation.mutate({ backupConfigId: confirmPause.backupConfigId, isPaused: confirmPause.displayStatus === 'PAUSED' })}
          onCancel={() => setConfirmPause(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${confirmDelete.name}"?`}
          message='This action cannot be undone. All associated job history will be permanently removed.'
          confirmLabel='Delete'
          danger
          loading={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => { setDeleteError(null); deleteMutation.mutate(confirmDelete.backupConfigId); }}
          onCancel={() => { setConfirmDelete(null); setDeleteError(null); deleteMutation.reset(); }}
        />
      )}

      {/* Activate confirm */}
      {confirmActivate && (
        <ConfirmDialog
          title={`Activate "${confirmActivate.name}"?`}
          message='The archive will become active and run on its scheduled frequency.'
          confirmLabel='Activate'
          loading={activateMutation.isPending}
          onConfirm={() => activateMutation.mutate(confirmActivate.backupConfigId)}
          onCancel={() => setConfirmActivate(null)}
        />
      )}

      {/* Run Now confirm */}
      {confirmRunNow && (
        <ConfirmDialog
          title={`Run "${confirmRunNow.name}" now?`}
          message='This will trigger an immediate archive run outside the regular schedule.'
          confirmLabel='Run Now'
          loading={runNowMutation.isPending}
          onConfirm={() => runNowMutation.mutate(confirmRunNow.backupConfigId)}
          onCancel={() => setConfirmRunNow(null)}
        />
      )}
      </div>
    </div>
  );
}
