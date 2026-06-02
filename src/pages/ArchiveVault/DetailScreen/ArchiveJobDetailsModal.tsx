import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useArchivalService } from '../../../services/archival/archival.service';
import { formatBytes } from '../../../utils';
import dayjs from 'dayjs';
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
  if (s === 'COMPLETED' || s === 'SUCCESS') return { bg: 'rgba(55,197,91,0.12)', color: '#008020', dot: 'bg-green-500' };
  if (s === 'FAILED') return { bg: 'rgba(242,68,0,0.08)', color: '#F24400', dot: 'bg-red-500' };
  if (s === 'RUNNING') return { bg: 'rgba(21,93,252,0.08)', color: '#155DFC', dot: 'bg-blue-500' };
  if (s === 'CREATED' || s === 'PENDING') return { bg: 'rgba(234,179,8,0.08)', color: '#A16207', dot: 'bg-yellow-400' };
  return { bg: '#F3F4F6', color: '#374151', dot: 'bg-gray-400' };
}

function getStatusLabel(status: string) {
  const s = status?.toUpperCase();
  if (s === 'COMPLETED' || s === 'SUCCESS') return 'Completed';
  if (s === 'FAILED') return 'Failed';
  if (s === 'RUNNING') return 'In Progress';
  if (s === 'CREATED' || s === 'PENDING') return 'Pending';
  return status || 'Unknown';
}

function calcDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt || !completedAt) return '--';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return '--';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

// ── Flatten nested objects into a flat list ───────────────────────────────────

function flattenObjects(objects: ArchiveJobObject[], depth = 0): { obj: ArchiveJobObject; depth: number }[] {
  const result: { obj: ArchiveJobObject; depth: number }[] = [];
  for (const obj of objects) {
    result.push({ obj, depth });
    if (obj.children?.length) {
      result.push(...flattenObjects(obj.children, depth + 1));
    }
  }
  return result;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm'>
      <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(21,93,252,0.08)' }}>
        {icon}
      </div>
      <div className='min-w-0'>
        <p className='text-[10px] text-gray-400 uppercase tracking-wide'>{label}</p>
        <p className='text-sm font-bold text-gray-900 truncate'>{value}</p>
        {sub && <p className='text-[10px] text-gray-400 mt-0.5'>{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

type Props = {
  backupJobId: string;
  configSlug: string;
  onClose: () => void;
};

export default function ArchiveJobDetailsModal({ backupJobId, configSlug, onClose }: Props) {
  const archivalService = useBackupConfigService();
  const queryClient = useQueryClient();

  const queryKey = ['archival-job-detail', backupJobId];

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await archivalService.listBackupJobs(configSlug, true, undefined, 20);
      const jobs: ArchiveJobDetail[] = (res as any)?.data ?? [];
      return jobs.find((j) => j.backupJobId === backupJobId) ?? null;
    },
    staleTime: 0,
  });

  const job: ArchiveJobDetail | null = data ?? null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const flatRows = flattenObjects(job?.object ?? []);
  const totalInserted = flatRows.reduce((sum, { obj }) => sum + (obj.insertCount ?? 0), 0);
  const totalSize = flatRows.reduce((sum, { obj }) => sum + (obj.sizeInBytes ?? 0), 0);
  const totalApiCalls = flatRows.reduce((sum, { obj }) => sum + (obj.salesforceApiCount ?? 0), 0);

  const statusStyle = job ? getStatusStyle(job.status) : { bg: '#F3F4F6', color: '#374151', dot: 'bg-gray-400' };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}>
      <div className='bg-white rounded-2xl w-full flex flex-col' style={{ maxWidth: 900, height: '88vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div className='flex items-center justify-between px-7 pt-6 pb-5 flex-shrink-0' style={{ borderBottom: '1.5px solid #F1F5F9' }}>
          <div className='flex items-center gap-3'>
            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full' style={{ background: 'rgba(21,93,252,0.1)' }}>
              <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
                <polyline points='21 8 21 21 3 21 3 8'/><rect x='1' y='3' width='22' height='5'/><line x1='10' y1='12' x2='14' y2='12'/>
              </svg>
            </div>
            <div>
              <h2 className='text-lg font-bold text-gray-900 leading-snug'>
                Archive Job Details
              </h2>
              <p className='text-xs text-gray-400 mt-0.5'>
                {job?.startedAt ? dayjs(job.startedAt).format('MMM D, YYYY h:mm A') : backupJobId}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {/* Refresh button */}
            <button
              type='button'
              onClick={handleRefresh}
              disabled={isFetching}
              className='flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50'
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}>
                <polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'/>
              </svg>
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type='button'
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='h-4.5 w-4.5'>
                <path d='M18 6L6 18M6 6l12 12'/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className='flex-1 min-h-0 flex flex-col px-7 py-5'>
          {isLoading ? (
            <div className='flex items-center justify-center h-full'>
              <div className='h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600' />
            </div>
          ) : error || !job ? (
            <div className='flex flex-col items-center justify-center h-full gap-3 text-center'>
              <div className='flex h-14 w-14 items-center justify-center rounded-full bg-red-50'>
                <svg viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='1.8' className='h-6 w-6'>
                  <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                </svg>
              </div>
              <p className='text-sm font-semibold text-gray-700'>Failed to load job details</p>
              <button type='button' onClick={handleRefresh} className='text-xs text-blue-600 hover:underline'>Try again</button>
            </div>
          ) : (
            <div className='flex flex-col gap-5 flex-1 min-h-0'>

              {/* Stat cards row */}
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 flex-shrink-0'>
                {/* Status */}
                <div className='flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl' style={{ background: statusStyle.bg }}>
                    <span className={`h-3 w-3 rounded-full ${statusStyle.dot}`} />
                  </div>
                  <div>
                    <p className='text-[10px] text-gray-400 uppercase tracking-wide'>Status</p>
                    <p className='text-sm font-bold' style={{ color: statusStyle.color }}>{getStatusLabel(job.status)}</p>
                  </div>
                </div>
                <StatCard
                  label='Started At'
                  value={job.startedAt ? dayjs(job.startedAt).format('MMM D, YYYY') : '--'}
                  sub={job.startedAt ? dayjs(job.startedAt).format('h:mm A') : undefined}
                  icon={
                    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
                      <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                    </svg>
                  }
                />
                <StatCard
                  label='Duration'
                  value={calcDuration(job.startedAt, job.completedAt)}
                  icon={
                    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
                      <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                    </svg>
                  }
                />
                <StatCard
                  label='Data Size'
                  value={formatBytes(totalSize)}
                  icon={
                    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
                      <ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'/><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'/>
                    </svg>
                  }
                />
              </div>

              {/* Summary stats row */}
              <div className='grid grid-cols-3 gap-3 flex-shrink-0'>
                <div className='rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3'>
                  <p className='text-[10px] text-gray-400 uppercase tracking-wide mb-1'>Total Inserted Records</p>
                  <p className='text-xl font-bold text-green-600'>{totalInserted.toLocaleString()}</p>
                </div>
                <div className='rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3'>
                  <p className='text-[10px] text-gray-400 uppercase tracking-wide mb-1'>Salesforce API Calls</p>
                  <p className='text-xl font-bold text-blue-600'>{totalApiCalls.toLocaleString()}</p>
                </div>
                <div className='rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3'>
                  <p className='text-[10px] text-gray-400 uppercase tracking-wide mb-1'>Destination</p>
                  <p className='text-xl font-bold text-gray-800'>{job.destination?.type ?? '--'}</p>
                </div>
              </div>

              {/* Per-Object table */}
              <div className='rounded-xl border border-gray-100 flex flex-col flex-1 min-h-0'>
                <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex-shrink-0'>
                  <div className='flex items-center gap-2'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
                      <rect x='3' y='3' width='18' height='18' rx='2'/><line x1='3' y1='9' x2='21' y2='9'/><line x1='9' y1='21' x2='9' y2='9'/>
                    </svg>
                    <span className='text-sm font-bold text-gray-800'>Object Details</span>
                    <span className='rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600'>{flatRows.length}</span>
                  </div>
                </div>
                <div className='overflow-auto flex-1 min-h-0'>
                  <table className='w-full'>
                    <thead className='sticky top-0 z-10 bg-gray-50'>
                      <tr className='border-b border-gray-100'>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Object</th>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Depth</th>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Status</th>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Inserted</th>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Completed</th>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Data Size</th>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>API Calls</th>
                        <th className='px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className='py-8 text-center text-xs text-gray-500'>No objects found</td>
                        </tr>
                      ) : flatRows.map(({ obj, depth }, i) => {
                        const st = getStatusStyle(obj.status ?? '');
                        return (
                          <tr key={obj.id ?? i} className='border-b border-gray-50 hover:bg-blue-50/20 transition-colors'>
                            <td className='px-4 py-2.5'>
                              <span className='flex items-center gap-1 text-xs font-medium text-gray-800' style={{ paddingLeft: depth * 16 }}>
                                {depth > 0 && (
                                  <span className='text-gray-300 mr-0.5'>{'↳'}</span>
                                )}
                                {obj.name}
                                {obj.type && (
                                  <span className='ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 uppercase'>{obj.type}</span>
                                )}
                              </span>
                            </td>
                            <td className='px-4 py-2.5'>
                              <span className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold'
                                style={{
                                  whiteSpace: 'pre',
                                  background: depth === 0 ? 'rgba(21,93,252,0.08)' : depth === 1 ? 'rgba(139,92,246,0.08)' : depth === 2 ? 'rgba(234,179,8,0.08)' : 'rgba(55,197,91,0.08)',
                                  color: depth === 0 ? '#155DFC' : depth === 1 ? '#7C3AED' : depth === 2 ? '#A16207' : '#008020',
                                }}>
                                Level {depth + 1}
                              </span>
                            </td>
                            <td className='px-4 py-2.5'>
                              {obj.status ? (
                                <span className='inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap'
                                  style={{ borderColor: st.color + '40', background: st.bg, color: st.color }}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                  {getStatusLabel(obj.status)}
                                </span>
                              ) : <span className='text-xs text-gray-400'>--</span>}
                            </td>
                            <td className='px-4 py-2.5'>
                              <span className='text-xs font-semibold text-green-600'>{(obj.insertCount ?? 0).toLocaleString()}</span>
                            </td>
                            <td className='px-4 py-2.5'>
                              <span className='text-xs text-gray-600'>{(obj.completedRecordCount ?? 0).toLocaleString()}</span>
                            </td>
                            <td className='px-4 py-2.5'>
                              <span className='text-xs text-gray-600'>{formatBytes(obj.sizeInBytes)}</span>
                            </td>
                            <td className='px-4 py-2.5'>
                              <span className='text-xs text-gray-600'>{obj.salesforceApiCount ?? '--'}</span>
                            </td>
                            <td className='px-4 py-2.5'>
                              {obj.errorMessage ? (
                                <span className='text-xs text-red-600' title={obj.errorMessage}>
                                  {obj.errorMessage.length > 40 ? obj.errorMessage.slice(0, 40) + '…' : obj.errorMessage}
                                </span>
                              ) : (
                                <span className='text-xs text-gray-300'>--</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
