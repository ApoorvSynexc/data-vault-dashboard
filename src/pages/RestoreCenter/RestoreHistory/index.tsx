import { useState } from 'react';
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

type FilterChip = 'All' | 'Succeeded' | 'Failed' | 'Rolled Back' | 'Partial' | 'Drafts' | 'Pending';

const CHIPS: FilterChip[] = ['All', 'Pending', 'Succeeded', 'Failed', 'Rolled Back', 'Partial', 'Drafts'];

// ── Helper functions ──────────────────────────────────────────────────────────

function mapStatus(apiStatus: string): JobStatus {
  return apiStatus;
}

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

function chipMatchesJob(chip: FilterChip, job: RestoreJob) {
  if (chip === 'All') return true;
  if (chip === 'Pending') return job.status === 'PENDING';
  if (chip === 'Succeeded') return job.status === 'DONE';
  if (chip === 'Failed') return job.status === 'FAILED';
  if (chip === 'Rolled Back') return job.status === 'ROLLED_BACK';
  if (chip === 'Partial') return job.status === 'PARTIAL';
  if (chip === 'Drafts') return job.status === 'DRAFT';
  return false;
}

function SourceBadge({ type }: { type: 'Backup' | 'Archive' }) {
  return type === 'Backup'
    ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>Backup</span>
    : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700'>Archive</span>;
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
    queryKey: ['restore-jobs-list'],
    queryFn: () => restoreService.listRestoreJobs(),
  });

  const JOBS: RestoreJob[] = !isLoading && jobsData
    ? ((jobsData as any)?.data ?? []).map((item: any) => ({
        id: item.restoreId,
        name: item.jobDetail?.name || 'Untitled Restore',
        tags: item.jobDetail?.tags?.join(', ') || '',
        source: item.source?.backupConfigId ? 'Backup' : 'Archive',
        destination: item.destination?.type === 'SAME' ? 'Same Org' : item.destination?.crmId || 'Unknown',
        records: '—',
        status: mapStatus(item.status),
        runtime: calculateRuntime(item.createdAt, item.updatedAt),
        started: formatDate(item.createdAt),
      }))
    : [];

  const draftsCount = JOBS.filter((j) => j?.status === 'DRAFT').length;

  const filtered = JOBS.filter((job) => {
    if (!job) return false;
    const matchesChip = chipMatchesJob(activeChip, job);
    const matchesSearch = (job.name ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesChip && matchesSearch;
  });

  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const tableCard = (
    <div className='flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      {/* Filter Bar */}
      <div className='flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-wrap'>
        <div className='relative'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400'>
            <circle cx='11' cy='11' r='8' /><path d='M21 21l-4.35-4.35' strokeLinecap='round' />
          </svg>
          <input
            type='text'
            placeholder='Search jobs...'
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className='pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-44'
          />
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => { setActiveChip(chip); setPage(1); }}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition',
                activeChip === chip
                  ? chip === 'Drafts'
                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                    : 'bg-blue-600 border-blue-600 text-white'
                  : chip === 'Drafts'
                    ? 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {chip === 'Drafts' && '📝 '}
              {chip}
              {chip === 'Drafts' && draftsCount > 0 && (
                <span className='ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white'>{draftsCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className='ml-auto'>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className='text-sm rounded-lg border border-gray-200 px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white text-gray-700'
          >
            <option>This Month</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>All Time</option>
          </select>
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
