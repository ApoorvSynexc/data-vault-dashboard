import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import { useRestoreService } from '../../../services/restore/restore.service';

type JobStatus = string;

type RestoreJob = {
  id: string;
  name: string;
  tags?: string;
  source: 'Backup' | 'Archive';
  destination: string;
  records: string;
  status: JobStatus;
  runtime: string;
  started: string;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DONE:        { label: '✓ Done',        cls: 'bg-green-100 text-green-700' },
  PARTIAL:     { label: '⚠ Partial',     cls: 'bg-yellow-100 text-yellow-700' },
  FAILED:      { label: '✗ Failed',      cls: 'bg-red-100 text-red-700' },
  ROLLED_BACK: { label: '↩ Rolled Back', cls: 'bg-gray-100 text-gray-600' },
  DRAFT:       { label: '📝 Draft',      cls: 'bg-orange-100 text-orange-700' },
  PENDING:     { label: '⏳ Pending',    cls: 'bg-blue-100 text-blue-700' },
};

type FilterChip = 'All' | 'Success' | 'Failed' | 'Rolled Back' | 'Partial' | 'Drafts' | 'Pending';

const CHIPS: FilterChip[] = ['All', 'Pending', 'Success', 'Failed', 'Rolled Back', 'Partial', 'Drafts'];

// ── Helper functions ──────────────────────────────────────────────────────────

function calculateRuntime(createdAt: string, updatedAt: string): string {
  if (!createdAt || !updatedAt) return '—';
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  const diffMs = Math.abs(updated - created);

  if (diffMs < 1000) return '< 1s';

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s`;

  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  if (mins < 60) return `${mins}m ${secs}s`;

  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatDate(dateString: string): string {
  if (!dateString) return '—';

  const date = new Date(dateString);
  const now = new Date();

  // Normalize to midnight for date comparison
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

function SourceBadge({ type }: { type: 'Backup' | 'Archive' }) {
  return type === 'Backup'
    ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>Backup</span>
    : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700'>Archive</span>;
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

interface Props {
  onBack?: () => void;
  onNewRestore?: () => void;
  initialFilter?: FilterChip;
  embedded?: boolean;
}

export default function RestoreHistory({ onBack, onNewRestore, initialFilter = 'All', embedded = false }: Props) {
  const restoreService = useRestoreService();
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<FilterChip>(initialFilter);
  const [dateRange, setDateRange] = useState('This Month');
  const [page, setPage] = useState(1);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['restore-jobs-list', search, activeChip],
    queryFn: () => restoreService.listRestoreJobs(search || undefined, activeChip),
  });

  const JOBS: RestoreJob[] = !isLoading && jobsData
    ? ((jobsData as any)?.data ?? []).map((item: any) => ({
        id: item.restoreId,
        name: item.jobDetail?.name || 'Untitled Restore',
        tags: item.jobDetail?.tags?.join(', ') || '',
        source: item.source?.backupConfigId ? 'Backup' : 'Archive',
        destination: item.destination?.type === 'SAME' ? 'Same Org' : item.destination?.crmId || 'Unknown',
        records: '—',
        status: item.status,
        runtime: calculateRuntime(item.createdAt, item.updatedAt),
        started: formatDate(item.createdAt),
      }))
    : [];

  const filtered = JOBS;

  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const tableCard = (
    <div className='flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className='pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full max-w-xs'
          />
        </div>

        <div className='flex items-center gap-2 ml-auto'>
          <Dropdown
            label='Status'
            value={activeChip}
            options={CHIPS.map((chip) => ({ value: chip, label: chip === 'Drafts' ? `📝 ${chip}` : chip }))}
            onChange={(value) => { setActiveChip(value as FilterChip); setPage(1); }}
          />

          <Dropdown
            label='Duration'
            value={dateRange}
            options={[
              { value: 'This Month', label: 'This Month' },
              { value: 'Last 7 Days', label: 'Last 7 Days' },
              { value: 'Last 30 Days', label: 'Last 30 Days' },
              { value: 'All Time', label: 'All Time' },
            ]}
            onChange={(value) => setDateRange(value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className='flex-1 overflow-y-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-gray-100'>
              {['Job Name', 'Source', 'Destination', 'Records', 'Status', 'Runtime', 'Started', 'Actions'].map((col) => (
                <th key={col} className='px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap'>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className='px-5 py-12 text-center text-sm text-gray-400'>Loading jobs...</td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className='px-5 py-12 text-center text-sm text-gray-400'>No jobs found.</td>
              </tr>
            ) : paginated.map((job) => {
              const { label, cls } = STATUS_CONFIG[job.status];
              return (
                <tr key={job.id} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                  <td className='px-5 py-3'>
                    <p className='font-semibold text-gray-900'>{job.name}</p>
                    {job.tags && <p className='text-xs text-gray-400 mt-0.5'>{job.tags}</p>}
                  </td>
                  <td className='px-5 py-3'><SourceBadge type={job.source} /></td>
                  <td className='px-5 py-3 text-gray-600'>{job.destination}</td>
                  <td className='px-5 py-3 tabular-nums text-gray-700'>{job.records}</td>
                  <td className='px-5 py-3'>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>
                  </td>
                  <td className='px-5 py-3 text-gray-600 whitespace-nowrap'>{job.runtime}</td>
                  <td className='px-5 py-3 text-gray-500 whitespace-nowrap'>{job.started}</td>
                  <td className='px-5 py-3'>
                    <div className='flex items-center gap-2 whitespace-nowrap'>
                      {job.status === 'DRAFT' && (
                        <>
                          <button className='text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition'>Resume →</button>
                          <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>Discard</button>
                        </>
                      )}
                      {job.status === 'DONE' && (
                        <>
                          <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>View</button>
                          <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>Re-run</button>
                          <button className='text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition'>Rollback</button>
                        </>
                      )}
                      {job.status === 'PARTIAL' && (
                        <>
                          <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>View</button>
                          <button className='text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition'>Re-run Failed</button>
                        </>
                      )}
                      {job.status === 'FAILED' && (
                        <>
                          <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>View</button>
                          <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>Re-run</button>
                        </>
                      )}
                      {job.status === 'ROLLED_BACK' && (
                        <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>View</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className='flex-shrink-0 flex items-center justify-between border-t border-gray-100 px-5 py-3'>
        <p className='text-xs text-gray-500'>Showing {paginated.length} of {filtered.length} jobs</p>
        <div className='flex items-center gap-1'>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={[
                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition',
                page === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (embedded) return tableCard;

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
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
              <Typography as='h2' variant='pageTitle'>Restore History</Typography>
              <Typography variant='bodySm' color='muted' className='mt-0.5'>All past restore jobs with drill-down and rollback</Typography>
            </div>
          </div>
          {onNewRestore && (
            <button
              onClick={onNewRestore}
              className='inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition whitespace-nowrap'
            >
              + New Restore
            </button>
          )}
        </div>

        {tableCard}

      </div>
    </div>
  );
}
