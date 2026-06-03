import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { formatBytes, computeArchiveJobStats } from '../../../utils';
import { useBackupConfigService } from '../../../services';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ArchiveJobObject {
  name: string;
  id: string;
  type?: string;
  status?: string;
  sizeInBytes?: number;
  salesforceApiCount?: number;
  completedRecordCount?: number;
  totalRecordCount?: number;
  insertCount?: number;
  deletedSuccessRecordCount?: number;
  deletedfailedRecordCount?: number;
  errorMessage?: string;
  bulkJobId?: string;
  condition?: { type: string };
  field?: { name: string; filter: { value: string; operator: string } }[];
  children?: ArchiveJobObject[];
}

interface ArchiveJobDetail {
  backupJobId: string;
  backupConfigId?: string;
  status: string;
  jobType?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  object?: ArchiveJobObject[];
  destination?: { type: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStatusStyle(status: string) {
  const s = status?.toUpperCase();
  if (s === 'COMPLETED' || s === 'SUCCESS') return { bg: 'rgba(0,128,32,0.1)', color: '#008020' };
  if (s === 'FAILED') return { bg: 'rgba(242,68,0,0.1)', color: '#F24400' };
  if (s === 'RUNNING') return { bg: 'rgba(21,93,252,0.1)', color: '#155DFC' };
  if (s === 'CREATED' || s === 'PENDING') return { bg: 'rgba(234,179,8,0.1)', color: '#A16207' };
  return { bg: '#F3F4F6', color: '#374151' };
}

function getStatusLabel(status: string) {
  const s = status?.toUpperCase();
  if (s === 'COMPLETED' || s === 'SUCCESS') return 'Completed';
  if (s === 'FAILED') return 'Failed';
  if (s === 'RUNNING') return 'In Progress';
  if (s === 'CREATED' || s === 'PENDING') return 'Pending';
  return status || 'Unknown';
}



// ── Main Modal ────────────────────────────────────────────────────────────────

type Props = {
  backupJobId: string;
  configSlug: string;
  onClose: () => void;
};

type FilterType = 'All' | 'Completed' | 'Failed' | 'Pending';

export default function ArchiveJobDetailsModal({ backupJobId, configSlug, onClose }: Props) {
  const archivalService = useBackupConfigService();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 10;

  const queryKey = ['archival-job-detail', backupJobId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await archivalService.listBackupJobs(configSlug, true, undefined, 20);
      const jobs: ArchiveJobDetail[] = (res as any)?.data ?? [];
      return jobs.find((j) => j.backupJobId === backupJobId) ?? null;
    },
    staleTime: 0,
  });

  const job: ArchiveJobDetail | null = data ?? null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await queryClient.invalidateQueries({ queryKey }); }
    finally { setIsRefreshing(false); }
  };

  const { flatRows, totalInserted, totalApiCalls, completedObjects, failedObjects } = computeArchiveJobStats(job?.object ?? []);
  const startedAt = job?.startedAt ? new Date(job.startedAt) : null;

  const statCards = [
    { value: flatRows.length,   label: 'Objects Archived',    color: '#008020', icon: <IconBox color='#008020' /> },
    { value: totalInserted,     label: 'Total Records',    color: '#008020', icon: <IconFile color='#008020' /> },
    { value: totalApiCalls,     label: 'API Calls',           color: '#155DFC', icon: <IconSync color='#155DFC' /> },
    { value: failedObjects,     label: 'Failed Objects',      color: '#F24400', icon: <IconTrash color='#F24400' /> },
    { value: completedObjects,  label: 'Objects Synced',      color: '#155DFC', icon: <IconDone color='#155DFC' /> },
  ];

  // Filter + search
  let filtered = flatRows.filter(({ obj }) =>
    obj.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (activeFilter === 'Completed') filtered = filtered.filter(({ obj }) => ['COMPLETED', 'SUCCESS'].includes(obj.status?.toUpperCase() ?? ''));
  if (activeFilter === 'Failed')    filtered = filtered.filter(({ obj }) => obj.status?.toUpperCase() === 'FAILED');
  if (activeFilter === 'Pending')   filtered = filtered.filter(({ obj }) => ['CREATED', 'PENDING', 'RUNNING'].includes(obj.status?.toUpperCase() ?? ''));

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIdx, startIdx + itemsPerPage);

  const pageNums: number[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else if (currentPage <= 3) {
    pageNums.push(1, 2, 3, 4, 5);
  } else if (currentPage >= totalPages - 2) {
    for (let i = totalPages - 4; i <= totalPages; i++) pageNums.push(i);
  } else {
    for (let i = currentPage - 2; i <= currentPage + 2; i++) pageNums.push(i);
  }

  const levelColorMap: Record<number, string> = { 0: '#155DFC', 1: '#7C3AED', 2: '#A16207', 3: '#008020', 4: '#0891B2' };

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center p-4'
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className='bg-white rounded-2xl w-full flex flex-col'
        style={{ maxWidth: '1024px', height: '86vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* ── Header ── */}
        <div className='flex items-start justify-between px-7 pt-6 pb-4 flex-shrink-0'>
          <div>
            <h2 className='font-bold' style={{ fontSize: '20px', color: '#111827' }}>
              Archive Details{startedAt ? ` - ${dayjs(startedAt).format('MMMM D, YYYY | hh:mm A')}` : ''}
            </h2>
            <p className='text-sm mt-1' style={{ color: '#64748B' }}>Archive job details →</p>
          </div>
          <div className='flex items-center gap-2 mt-0.5'>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className='flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50'
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}>
                <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
              </svg>
              Refresh
            </button>
            <button
              onClick={onClose}
              className='p-1.5 rounded-lg hover:bg-gray-100 transition'
              style={{ color: '#6B7280' }}
            >
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M18 6L6 18M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className='px-7 pb-4 flex-shrink-0'>
          <div className='grid grid-cols-5 gap-3'>
            {statCards.map(({ value, label, color, icon }) => (
              <div
                key={label}
                className='rounded-xl px-4 pt-3 pb-3 flex flex-col gap-0.5'
                style={{ border: '1.5px solid #E8EDF5', background: '#fff' }}
              >
                <div className='flex items-start justify-between'>
                  <div>
                    <span className='text-2xl font-bold leading-tight block' style={{ color }}>
                      {typeof value === 'number' && value > 9999 ? value.toLocaleString() : value}
                    </span>
                    <span className='text-xs mt-0.5 block' style={{ color: '#64748B' }}>{label}</span>
                  </div>
                  <div className='mt-0.5'>{icon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search + Filter ── */}
        <div className='px-7 pb-3 flex items-center gap-2 flex-shrink-0'>
          <div className='relative'>
            <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#9CA3AF' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='11' cy='11' r='8' /><path d='M21 21l-4.35-4.35' />
              </svg>
            </div>
            <input
              type='text'
              placeholder='Search Object'
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className='pl-8 pr-4 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              style={{ border: '1.5px solid #E5E7EB', color: '#33363F', width: '200px' }}
            />
          </div>

          {(['All', 'Completed', 'Failed', 'Pending'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => { setActiveFilter(f); setCurrentPage(1); }}
              className='px-4 py-1.5 rounded-full text-sm font-medium transition'
              style={activeFilter === f
                ? { background: '#155DFC', color: '#fff' }
                : { background: '#F3F4F6', color: '#374151' }
              }
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className='flex-1 overflow-auto mx-7 rounded-xl relative' style={{ border: '1.5px solid #E8EDF5', minHeight: 0 }}>
          {(isLoading || isRefreshing) && (
            <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm'>
              <svg className='w-8 h-8 animate-spin text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
              </svg>
              <p className='text-sm font-medium text-gray-500'>Loading data...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className='flex flex-col items-center justify-center h-full gap-3 text-center'>
              <p className='text-sm font-semibold text-gray-700'>Failed to load job details</p>
              <button type='button' onClick={handleRefresh} className='text-xs text-blue-600 hover:underline'>Try again</button>
            </div>
          )}
          <table className='w-full' style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #E8EDF5', background: '#fff' }}>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151', width: '20%' }}>Object</th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151', width: '9%' }}>Depth</th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151', width: '12%' }}>Status</th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151' }}>Records Uploaded</th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151' }}>Records Deleted</th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151' }}>Records Failed</th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151' }}>Data Size</th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151' }}>API Calls</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className='px-5 py-12 text-center text-sm' style={{ color: '#64748B' }}>
                    No objects found.
                  </td>
                </tr>
              ) : paginatedData.map(({ obj, depth }, idx) => {
                const st = getStatusStyle(obj.status ?? '');
                const levelColor = levelColorMap[depth] ?? '#E11D48';
                const deletedFailed = obj.deletedfailedRecordCount ?? 0;
                return (
                  <tr
                    key={obj.id ?? idx}
                    style={{ borderBottom: idx < paginatedData.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                    className='hover:bg-gray-50 transition-colors'
                  >
                    {/* Object Name */}
                    <td className='px-5 py-3.5'>
                      <span className='flex items-center gap-1 text-sm font-medium' style={{ color: '#111827', paddingLeft: depth * 14 }}>
                        {depth > 0 && <span style={{ color: '#CBD5E1' }}>↳</span>}
                        {obj.name}
                      </span>
                    </td>
                    {/* Depth */}
                    <td className='px-5 py-3.5'>
                      <span
                        className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold'
                        style={{ background: `${levelColor}18`, color: levelColor, whiteSpace: 'pre' }}
                      >
                        Level {depth + 1}
                      </span>
                    </td>
                    {/* Status */}
                    <td className='px-5 py-3.5'>
                      {obj.status ? (
                        <span
                          className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap'
                          style={{ background: st.bg, color: st.color }}
                        >
                          {getStatusLabel(obj.status)}
                        </span>
                      ) : <span className='text-xs' style={{ color: '#94A3B8' }}>--</span>}
                    </td>
                    {/* Records Uploaded */}
                    <td className='px-5 py-3.5'>
                      <span className='text-sm font-semibold' style={{ color: '#008020' }}>
                        {(obj.insertCount ?? 0).toLocaleString()}
                      </span>
                    </td>
                    {/* Records Deleted */}
                    <td className='px-5 py-3.5'>
                      <span className='text-sm font-semibold' style={{ color: '#155DFC' }}>
                        {(obj.deletedSuccessRecordCount ?? 0).toLocaleString()}
                      </span>
                    </td>
                    {/* Records Failed */}
                    <td className='px-5 py-3.5'>
                      {deletedFailed > 0 ? (
                        <span className='inline-flex items-center gap-1 text-sm font-semibold' style={{ color: '#F24400' }}>
                          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                            <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                          </svg>
                          {deletedFailed.toLocaleString()}
                        </span>
                      ) : (
                        <span className='text-sm font-semibold' style={{ color: '#94A3B8' }}>0</span>
                      )}
                    </td>
                    {/* Data Size */}
                    <td className='px-5 py-3.5'>
                      <span className='text-sm' style={{ color: '#374151' }}>{formatBytes(obj.sizeInBytes)}</span>
                    </td>
                    {/* API Calls */}
                    <td className='px-5 py-3.5'>
                      <span className='text-sm' style={{ color: '#374151' }}>{obj.salesforceApiCount ?? '--'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className='flex items-center justify-between px-7 py-4 flex-shrink-0'>
          <p className='text-sm font-medium' style={{ color: '#155DFC' }}>
            Showing {filtered.length === 0 ? 0 : Math.min(startIdx + itemsPerPage, filtered.length)} of {filtered.length} Object{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className='flex items-center gap-1'>
            {pageNums.map(n => (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                className='w-7 h-7 rounded-md text-xs font-medium transition flex items-center justify-center'
                style={currentPage === n
                  ? { background: '#155DFC', color: '#fff' }
                  : { background: '#F3F4F6', color: '#374151' }
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ── */
function IconBox({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
    </svg>
  );
}
function IconFile({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' />
    </svg>
  );
}
function IconSync({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='23 4 23 10 17 10' /><polyline points='1 20 1 14 7 14' />
      <path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' />
    </svg>
  );
}
function IconTrash({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
      <path d='M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
    </svg>
  );
}
function IconDone({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='20 6 9 17 4 12' />
    </svg>
  );
}
