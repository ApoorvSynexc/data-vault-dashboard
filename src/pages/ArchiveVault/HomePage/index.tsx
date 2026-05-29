import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../../services/archival/archival.service';
import { usePlatformService } from '../../../services/platform/platform.service';
import Typography from '../../../components/Typography';

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
      <div className='flex items-center justify-between border-b border-gray-100 px-5 py-4 flex-shrink-0'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>{title}</Typography>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, loading, icon }: { label: string; value: string; loading?: boolean; icon: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center gap-3'>
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
        <div>
          <p className='text-xl font-bold leading-tight text-gray-900'>{value}</p>
          <p className='mt-0.5 text-xs text-gray-500'>{label}</p>
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
    ACTIVE:    'bg-blue-100 text-blue-700',
    RUNNING:   'bg-green-100 text-green-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    SUCCESS:   'bg-green-100 text-green-700',
    PENDING:   'bg-blue-100 text-blue-700',
    DRAFT:     'bg-yellow-100 text-yellow-700',
    PAUSED:    'bg-gray-100 text-gray-700',
    FAILED:    'bg-red-100 text-red-700',
    ONE_TIME:  'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active', RUNNING: 'Running', SCHEDULED: 'Scheduled',
    SUCCESS: 'Success', PENDING: 'Pending', DRAFT: 'Draft',
    PAUSED: 'Paused', FAILED: 'Failed', ONE_TIME: 'One Time',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Action Dropdown ───────────────────────────────────────────────────────────

function ActionDropdown() {
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
        className='flex items-center justify-center rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
          <circle cx='12' cy='5' r='1' fill='currentColor' />
          <circle cx='12' cy='12' r='1' fill='currentColor' />
          <circle cx='12' cy='19' r='1' fill='currentColor' />
        </svg>
      </button>
      {open && (
        <div className='absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'>
          {(['View Details', 'Edit Policy', 'Pause', 'Delete'] as const).map((label) => (
            <button key={label} type='button' onClick={() => setOpen(false)}
              className={`flex w-full items-center px-3 py-2 text-left text-xs font-medium transition ${label === 'Delete' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

export default function ArchiveVaultHomePage() {
  const navigate = useNavigate();
  const archivalService = useArchivalService();
  const platformService = usePlatformService();

  const [search, setSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: rawListData, isLoading: isLoadingList } = useQuery({
    queryKey: ['archival-config-list'],
    queryFn: () => archivalService.getList(),
    staleTime: 30_000,
  });

  const { data: platformsData, isLoading: isLoadingPlatforms } = useQuery({
    queryKey: ['connected-platforms'],
    queryFn: () => platformService.getConnectedPlatforms(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isLoadingList || isLoadingPlatforms;

  const rawList: ArchivalConfigItem[] = Array.isArray(rawListData)
    ? rawListData
    : ((rawListData as any)?.data ?? []);

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
    displayStatus: normalizeStatus(item.backupStatus ?? item.status),
    displayDate: formatDate(item.createdAt),
  }));

  // Stats
  const total = rawList.length;

  const uniquePlatforms = new Set(rawList.map((i) => i.crmId)).size;

  // Filters
  const filtered = enriched.filter((r) => {
    if (search && !r.displayName.toLowerCase().includes(search.toLowerCase())) return false;
    if (scheduleFilter !== 'All' && r.platform !== scheduleFilter) return false;
    if (statusFilter !== 'All' && r.displayStatus !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className='flex flex-col gap-5 flex-1 min-h-0'>

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
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
          <MetricCard loading={isLoading} label='Total archives across all platform' value={pad(total)}
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='21 8 21 21 3 21 3 8'/><rect x='1' y='3' width='22' height='5'/><line x1='10' y1='12' x2='14' y2='12'/></svg>}
          />
          <MetricCard loading={isLoading} label='Total records' value={total > 0 ? '356,142' : '--'}
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg>}
          />
          <MetricCard loading={isLoading} label={`Across ${uniquePlatforms} platform${uniquePlatforms !== 1 ? 's' : ''}`} value='2.6 TB'
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'/><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'/></svg>}
          />
          <MetricCard loading={isLoading} label='Platform connections' value={pad(uniquePlatforms)}
            icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><rect x='2' y='2' width='8' height='8' rx='1.5'/><rect x='14' y='2' width='8' height='8' rx='1.5'/><rect x='2' y='14' width='8' height='8' rx='1.5'/><rect x='14' y='14' width='8' height='8' rx='1.5'/></svg>}
          />
        </div>
      </div>

      {/* Table Panel */}
      <Panel title='All Archives'>

        {/* Filter Bar */}
        <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3 flex-shrink-0'>
          {/* Search */}
          <div className='relative flex-1 min-w-0'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400'>
              <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
            <input type='text' value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder='Search Archive'
              className='h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
            />
          </div>

          {/* All Platform */}
          <div className='relative flex-shrink-0'>
            <select value={scheduleFilter} onChange={(e) => { setScheduleFilter(e.target.value); setCurrentPage(1); }}
              className='h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-7 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer'
              style={{ minWidth: 120 }}>
              <option value='All'>All Platform</option>
              <option value='Schedule'>Salesforce</option>
              <option value='Realtime'>HubSpot</option>
              <option value='One Time'>Zoho</option>
            </select>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400'>
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </div>

          {/* All Objects */}
          <div className='relative flex-shrink-0'>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className='h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-7 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer'
              style={{ minWidth: 120 }}>
              <option value='All'>All Objects</option>
              <option value='ACTIVE'>Active</option>
              <option value='SUCCESS'>Success</option>
              <option value='PENDING'>Pending</option>
              <option value='DRAFT'>Draft</option>
              <option value='PAUSED'>Paused</option>
              <option value='FAILED'>Failed</option>
            </select>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400'>
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </div>

          {/* More Filter */}
          <button type='button'
            className='flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 transition hover:border-gray-300'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-3.5 w-3.5'>
              <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
            </svg>
            More Filter
          </button>

          {/* Clear Filter */}
          <button type='button'
            onClick={() => { setSearch(''); setScheduleFilter('All'); setStatusFilter('All'); setCurrentPage(1); }}
            className='flex h-9 flex-shrink-0 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 transition hover:border-gray-300'>
            Clear Filter
          </button>
        </div>

        {/* Table */}
        <div className='flex-1 min-h-0 overflow-auto'>
          {isLoading ? (
            <div className='space-y-0'>
              <div className='flex gap-4 border-b border-gray-100 px-5 py-3'>
                {['w-40', 'w-24', 'w-20', 'w-28', 'w-20', 'w-20', 'w-10'].map((w, i) => (
                  <div key={i} className={`h-3 ${w} rounded bg-gray-100 animate-pulse`} />
                ))}
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className='flex items-center gap-4 border-b border-gray-100 px-5 py-4'>
                  <div className='h-9 w-9 rounded-lg bg-gray-100 animate-pulse' />
                  <div className='h-3 w-28 rounded bg-gray-100 animate-pulse' />
                  <div className='h-3 w-20 rounded bg-gray-100 animate-pulse' />
                  <div className='h-5 w-16 rounded-full bg-gray-100 animate-pulse' />
                  <div className='h-3 w-28 rounded bg-gray-100 animate-pulse' />
                  <div className='h-3 w-16 rounded bg-gray-100 animate-pulse' />
                  <div className='h-3 w-16 rounded bg-gray-100 animate-pulse' />
                </div>
              ))}
            </div>
          ) : (
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50/50'>
                  {['Archive Policy', 'Platform', 'Status', 'Created On', 'Records', 'Data Size', 'Action'].map((col) => (
                    <th key={col} className='px-5 py-3 text-left text-xs font-semibold text-gray-500'>
                      <span className='flex items-center gap-1'>
                        {col}
                        {col !== 'Action' && (
                          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3 w-3 text-gray-300 flex-shrink-0'>
                            <polyline points='6 9 12 15 18 9' />
                          </svg>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-5 py-12 text-center text-sm text-gray-400'>
                      No archive policies match your filters.
                    </td>
                  </tr>
                ) : (
                  paginated.map((policy) => (
                    <tr key={policy.backupConfigId} className='transition-colors hover:bg-gray-50/60'>
                      {/* Archive Policy */}
                      <td className='px-5 py-3.5'>
                        <div className='flex items-center gap-2.5'>
                          <PlatformBadge platform={policy.platform} />
                          <span className='text-xs font-semibold text-blue-600 hover:underline cursor-pointer'>
                            {policy.displayName}
                          </span>
                        </div>
                      </td>
                      {/* Platform */}
                      <td className='px-5 py-3.5 text-xs text-gray-600'>{policy.platform}</td>
                      {/* Status */}
                      <td className='px-5 py-3.5'><StatusBadge status={policy.displayStatus} /></td>
                      {/* Created On */}
                      <td className='px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap'>{policy.displayDate}</td>
                      {/* Records */}
                      <td className='px-5 py-3.5 text-xs text-gray-600'>--</td>
                      {/* Data Size */}
                      <td className='px-5 py-3.5 text-xs text-gray-600'>--</td>
                      {/* Action */}
                      <td className='px-5 py-3.5'>
                        <div className='flex items-center gap-1'>
                          <button type='button' title='View'
                            onClick={() => navigate(`/archive-vault/${policy.slug ?? policy.backupConfigId}`)}
                            className='flex items-center justify-center rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'>
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
                              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' /><circle cx='12' cy='12' r='3' />
                            </svg>
                          </button>
                          <ActionDropdown />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && (
          <div className='flex items-center justify-between border-t border-gray-100 px-5 py-3 flex-shrink-0'>
            <Typography variant='bodySm' color='muted'>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </Typography>
            <div className='flex items-center gap-1'>
              <button type='button' onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className='flex h-7 w-7 items-center justify-center rounded text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&lt;</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map((page) => (
                <button key={page} type='button' onClick={() => setCurrentPage(page)}
                  className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {page}
                </button>
              ))}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className='px-1 text-xs text-gray-400'>...</span>
              )}
              <button type='button' onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className='flex h-7 w-7 items-center justify-center rounded text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&gt;</button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
