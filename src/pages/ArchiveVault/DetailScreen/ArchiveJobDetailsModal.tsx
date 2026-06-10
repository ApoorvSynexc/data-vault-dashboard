import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { formatBytes, computeArchiveJobStats } from '../../../utils';
import { useBackupConfigService } from '../../../services';
import Table from '../../../components/Table';
import type { TableColumn } from '../../../components/Table';

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
  if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'UPLOAD_COMPLETED') return { bg: 'rgba(0,128,32,0.1)', color: '#008020' };
  if (s === 'FAILED') return { bg: 'rgba(242,68,0,0.1)', color: '#F24400' };
  if (s === 'RUNNING') return { bg: 'rgba(21,93,252,0.1)', color: '#155DFC' };
  if (s === 'CREATED' || s === 'PENDING') return { bg: 'rgba(234,179,8,0.1)', color: '#A16207' };
  return { bg: '#F3F4F6', color: '#374151' };
}

function getStatusLabel(status: string) {
  const s = status?.toUpperCase();
  if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'UPLOAD_COMPLETED') return 'Completed';
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
        {(() => {
          type FlatRow = { obj: ArchiveJobObject; depth: number };
          const jobColumns: TableColumn<FlatRow>[] = [
            {
              key: 'name',
              header: 'Object',
              render: ({ obj, depth }) => (
                <span className='flex items-center gap-1 text-sm font-medium' style={{ color: '#111827', paddingLeft: depth * 14 }}>
                  {depth > 0 && <span style={{ color: '#CBD5E1' }}>↳</span>}
                  {obj.name}
                </span>
              ),
            },
            {
              key: 'depth',
              header: 'Depth',
              render: ({ depth }) => {
                const levelColor = levelColorMap[depth] ?? '#E11D48';
                return (
                  <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold'
                    style={{ background: `${levelColor}18`, color: levelColor, whiteSpace: 'pre' }}>
                    Level {depth + 1}
                  </span>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: ({ obj }) => {
                const st = getStatusStyle(obj.status ?? '');
                return obj.status
                  ? <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap' style={{ background: st.bg, color: st.color }}>{getStatusLabel(obj.status)}</span>
                  : <span className='text-xs' style={{ color: '#94A3B8' }}>--</span>;
              },
            },
            {
              key: 'insertCount',
              header: 'Records Uploaded',
              render: ({ obj }) => <span className='text-sm font-semibold' style={{ color: '#008020' }}>{(obj.insertCount ?? obj.completedRecordCount ?? obj.totalRecordCount ?? 0).toLocaleString()}</span>,
            },
            {
              key: 'deletedSuccess',
              header: 'Records Deleted',
              render: ({ obj }) => <span className='text-sm font-semibold' style={{ color: '#155DFC' }}>{(obj.deletedSuccessRecordCount ?? 0).toLocaleString()}</span>,
            },
            {
              key: 'deletedFailed',
              header: 'Records Failed',
              render: ({ obj }) => {
                const n = obj.deletedfailedRecordCount ?? 0;
                return n > 0
                  ? <span className='inline-flex items-center gap-1 text-sm font-semibold' style={{ color: '#F24400' }}>
                      <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                        <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                      </svg>
                      {n.toLocaleString()}
                    </span>
                  : <span className='text-sm font-semibold' style={{ color: '#94A3B8' }}>0</span>;
              },
            },
            {
              key: 'sizeInBytes',
              header: 'Data Size',
              render: ({ obj }) => <span className='text-sm' style={{ color: '#374151' }}>{formatBytes(obj.sizeInBytes)}</span>,
            },
            {
              key: 'apiCalls',
              header: 'API Calls',
              render: ({ obj }) => <span className='text-sm' style={{ color: '#374151' }}>{obj.salesforceApiCount ?? '--'}</span>,
            },
          ];

          return (
            <div className='flex flex-col flex-1 mx-7 rounded-xl relative overflow-hidden' style={{ border: '1.5px solid #E8EDF5', minHeight: 0 }}>
              {error && !isLoading && (
                <div className='flex flex-col items-center justify-center h-full gap-3 text-center'>
                  <p className='text-sm font-semibold text-gray-700'>Failed to load job details</p>
                  <button type='button' onClick={handleRefresh} className='text-xs text-blue-600 hover:underline'>Try again</button>
                </div>
              )}
              <Table<FlatRow>
                columns={jobColumns}
                rows={filtered}
                getRowKey={({ obj }, idx) => obj.id ?? String(idx)}
                loading={isLoading || isRefreshing}
                skeletonConfig={{ rows: 5, colWidths: ['w-32', 'w-16', 'w-20', 'w-24', 'w-24', 'w-20', 'w-16', 'w-16'] }}
                headerVariant='uppercase'
                borderless
                cellPaddingClassName='px-5 py-3.5'
                rowClassName='hover:bg-gray-50 transition-colors'
                getRowStyle={() => ({ borderBottom: '1px solid #F1F5F9' })}
                emptyState='No objects found.'
                pagination={{
                  currentPage,
                  pageSize: itemsPerPage,
                  totalRecords: filtered.length,
                  onPageChange: setCurrentPage,
                }}
              />
            </div>
          );
        })()}
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
