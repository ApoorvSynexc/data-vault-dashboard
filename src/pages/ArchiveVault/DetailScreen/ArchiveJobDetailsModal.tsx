// ArchiveJobDetailsModal — modal overlay showing the per-object breakdown of
// a single archive job run.
//
// Opens when the user clicks a row in the Activity Logs tab of the Detail Screen.
// Props: backupJobId (the specific job to show), configSlug (to fetch the job list),
//        onClose (dismiss callback).
//
// Data fetching: calls GET /v1/backup-job/list?slug=&limit=20, then finds the
// matching job by backupJobId client-side. The shared backup-job endpoint is used
// because archive jobs are stored in the same job collection.
//
// Tree structure: job.object[] is a nested array (parent → children[]).
// buildTreeRows() flattens it into a {obj, depth, parentId}[] for table rendering.
// Parents are collapsed by default; clicking the chevron expands children.
//
// Stats bar derives: status, started at, duration, data size, object count
// from the job payload using computeArchiveJobStats() utility.
//
// Filters: All / Completed / Failed / Pending — applied client-side on the visible rows.
// Refresh: re-invalidates the React Query cache key to re-fetch the latest job state.
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { formatBytes, computeArchiveJobStats } from '../../../utils';
import { useBackupConfigService } from '../../../services';
import { useArchivalService } from '../../../services/archival/archival.service';
import type { TableColumn } from '../../../components/Table';
// to support colSpan inline-error rows.

function IconRetry({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
      className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`}>
      <path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' /><path d='M3 3v5h5' />
    </svg>
  );
}

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
  recordErrorsS3Prefix?: string;
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
  if (s === 'UPLOAD_COMPLETED') return { bg: 'rgba(6,182,212,0.1)', color: '#0891B2' };
  if (s === 'FAILED' || s === 'DELETION_JOB_FAILED') return { bg: 'rgba(242,68,0,0.1)', color: '#F24400' };
  if (s === 'PARTIAL_FAILURE' || s === 'DELETION_RECORDS_FAILED') return { bg: 'rgba(217,119,6,0.1)', color: '#D97706' };
  if (s === 'RUNNING' || s === 'IN_PROGRESS') return { bg: 'rgba(21,93,252,0.1)', color: '#155DFC' };
  if (s === 'CREATED' || s === 'PENDING') return { bg: 'rgba(234,179,8,0.1)', color: '#A16207' };
  return { bg: '#F3F4F6', color: '#374151' };
}

function getStatusLabel(status: string) {
  const s = status?.toUpperCase();
  if (s === 'COMPLETED' || s === 'SUCCESS') return 'Completed';
  if (s === 'FAILED') return 'Failed';
  if (s === 'DELETION_JOB_FAILED') return 'Deletion Failed';
  if (s === 'DELETION_RECORDS_FAILED') return 'Records Failed';
  if (s === 'PARTIAL_FAILURE') return 'Partial Failure';
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

// ── Tree row type ─────────────────────────────────────────────────────────────

type TreeRow = { obj: ArchiveJobObject; depth: number; parentId: string | null };

function buildTreeRows(items: ArchiveJobObject[], depth = 0, parentId: string | null = null): TreeRow[] {
  return items.flatMap((obj) => [
    { obj, depth, parentId },
    ...buildTreeRows(obj.children ?? [], depth + 1, obj.id),
  ]);
}

export default function ArchiveJobDetailsModal({ backupJobId, configSlug, onClose }: Props) {
  const archivalService = useBackupConfigService();
  const archivalApi = useArchivalService();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [expandedInlineErrors, setExpandedInlineErrors] = useState<Set<string>>(new Set());
  const toggleInlineError = (id: string) =>
    setExpandedInlineErrors(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const itemsPerPage = 10;

  // ── Error panel state (S3-paginated per-record errors) ──
  const [errorPanel, setErrorPanel] = useState<{ obj: ArchiveJobObject; page: number } | null>(null);
  const [errorRecords, setErrorRecords] = useState<{ recordId: string; error: string }[]>([]);
  const [errorTotalPages, setErrorTotalPages] = useState(0);
  const [errorTotalRecords, setErrorTotalRecords] = useState(0);
  const [errorLoading, setErrorLoading] = useState(false);

  const fetchErrorPage = useCallback(async (obj: ArchiveJobObject, page: number) => {
    setErrorLoading(true);
    try {
      const res = await archivalApi.getRecordErrors(backupJobId, obj.id, page);
      const d = (res as any)?.data ?? res;
      setErrorRecords(d.records ?? []);
      setErrorTotalPages(d.totalPages ?? 0);
      setErrorTotalRecords(d.totalRecords ?? 0);
      setErrorPanel({ obj, page });
    } catch {
      // leave existing records visible
    } finally {
      setErrorLoading(false);
    }
  }, [archivalApi, backupJobId]);

  // Open the panel immediately so the spinner is visible during the first fetch.
  const openErrorPanel = (obj: ArchiveJobObject) => {
    setErrorPanel({ obj, page: 1 });
    setErrorRecords([]);
    setErrorTotalPages(0);
    setErrorTotalRecords(0);
    fetchErrorPage(obj, 1);
  };
  const closeErrorPanel = () => { setErrorPanel(null); setErrorRecords([]); setErrorTotalPages(0); setErrorTotalRecords(0); };

  // Re-use the parent screen's job-list cache (keyed by ['archival-jobs', configSlug, null])
  // so object statuses update automatically whenever the parent polls — no duplicate fetch.
  const queryKey = ['archival-jobs', configSlug, null];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      return archivalService.listBackupJobs(configSlug, true, undefined, 20);
    },
    staleTime: 0,
    refetchInterval: (query) => {
      const jobs: ArchiveJobDetail[] = (query.state.data as any)?.data ?? [];
      const job = Array.isArray(jobs) ? jobs.find((j) => j.backupJobId === backupJobId) : null;
      const s = job?.status?.toUpperCase() ?? '';
      return s === 'RUNNING' || s === 'PENDING' ? 3_000 : false;
    },
  });

  const jobs: ArchiveJobDetail[] = (data as any)?.data ?? [];
  const job: ArchiveJobDetail | null = jobs.find((j) => j.backupJobId === backupJobId) ?? null;

  // Collapse all parents by default once data loads
  useEffect(() => {
    if (!job?.object) return;
    const parentIds = new Set<string>();
    const collect = (items: ArchiveJobObject[]) => {
      items.forEach((obj) => {
        if (obj.children?.length) { parentIds.add(obj.id); collect(obj.children); }
      });
    };
    collect(job.object);
    setCollapsedIds(parentIds);
  }, [job?.object]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await queryClient.invalidateQueries({ queryKey }); }
    finally { setIsRefreshing(false); }
  };

  const handleRetryJob = async () => {
    setIsRetrying(true);
    closeErrorPanel();
    setExpandedInlineErrors(new Set());
    try {
      await archivalService.resumeBackupJob(backupJobId);
      // Invalidate the shared cache — parent screen and modal both update.
      await queryClient.invalidateQueries({ queryKey });
    } catch {
      // silently fail — status badge and refresh button let user retry again
    } finally {
      setIsRetrying(false);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allTreeRows = buildTreeRows(job?.object ?? []);
  const { flatRows, totalInserted, totalApiCalls, completedObjects, failedObjects } = computeArchiveJobStats(job?.object ?? []);
  const startedAt = job?.startedAt ? new Date(job.startedAt) : null;

  // Build visible rows respecting collapsed state
  const visibleRows: TreeRow[] = (() => {
    const collapsedSet = collapsedIds;
    const result: TreeRow[] = [];
    const isAncestorCollapsed = (parentId: string | null): boolean => {
      if (!parentId) return false;
      if (collapsedSet.has(parentId)) return true;
      const parentRow = allTreeRows.find((r) => r.obj.id === parentId);
      return isAncestorCollapsed(parentRow?.parentId ?? null);
    };
    for (const row of allTreeRows) {
      if (!isAncestorCollapsed(row.parentId)) result.push(row);
    }
    return result;
  })();

  // Apply search + filter on visible rows
  let filtered = visibleRows.filter(({ obj }) =>
    obj.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (activeFilter === 'Completed') filtered = filtered.filter(({ obj }) => ['COMPLETED', 'SUCCESS', 'UPLOAD_COMPLETED'].includes(obj.status?.toUpperCase() ?? ''));
  if (activeFilter === 'Failed')    filtered = filtered.filter(({ obj }) => ['FAILED', 'DELETION_JOB_FAILED', 'DELETION_RECORDS_FAILED'].includes(obj.status?.toUpperCase() ?? ''));
  if (activeFilter === 'Pending')   filtered = filtered.filter(({ obj }) => ['CREATED', 'PENDING', 'RUNNING'].includes(obj.status?.toUpperCase() ?? ''));

  const statCards = [
    { value: flatRows.length,   label: 'Objects Archived',    color: '#008020', icon: <IconBox color='#008020' /> },
    { value: totalInserted,     label: 'Total Records',    color: '#008020', icon: <IconFile color='#008020' /> },
    { value: totalApiCalls,     label: 'API Calls',           color: '#155DFC', icon: <IconSync color='#155DFC' /> },
    { value: failedObjects,     label: 'Failed Objects',      color: '#F24400', icon: <IconTrash color='#F24400' /> },
    { value: completedObjects,  label: 'Objects Synced',      color: '#155DFC', icon: <IconDone color='#155DFC' /> },
  ];

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
            {(() => {
              const jobSt = job?.status?.toUpperCase() ?? '';
              const RETRYABLE_JOB_STATUSES = new Set(['FAILED', 'PARTIAL_FAILURE']);
              const RETRYABLE_OBJ_STATUSES = new Set(['FAILED', 'DELETION_JOB_FAILED', 'DELETION_RECORDS_FAILED']);
              const showRetry = RETRYABLE_JOB_STATUSES.has(jobSt) ||
                (job?.object ?? []).some((o: ArchiveJobObject) => RETRYABLE_OBJ_STATUSES.has(o.status?.toUpperCase() ?? ''));
              return showRetry ? (
                <button
                  onClick={handleRetryJob}
                  disabled={isRetrying}
                  title='Retry failed job'
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50'
                  style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}
                >
                  <IconRetry spinning={isRetrying} />
                  {isRetrying ? 'Retrying…' : 'Retry Job'}
                </button>
              ) : null;
            })()}
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
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className='p-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 ml-1'
            style={{ color: '#64748B' }}
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
            </svg>
          </button>
        </div>

        {/* ── Error Details Panel (S3-paginated per-record errors) ── */}
        {errorPanel && (
          <div
            className='fixed inset-0 z-[70] flex items-center justify-center p-4'
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={closeErrorPanel}
          >
            <div
              className='bg-white rounded-2xl w-full flex flex-col overflow-hidden'
              style={{ maxWidth: '660px', maxHeight: '75vh', boxShadow: '0 32px 80px rgba(0,0,0,0.22)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className='flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0'
                style={{ background: 'linear-gradient(135deg, #FFF5F5 0%, #FFF 60%)', borderBottom: '1px solid #FFE4E1' }}>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0'
                    style={{ background: 'rgba(242,68,0,0.1)' }}>
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                    </svg>
                  </div>
                  <div>
                    <h3 className='font-bold text-sm' style={{ color: '#111827' }}>
                      Record Errors
                      <span className='ml-2 font-normal text-xs px-2 py-0.5 rounded-full'
                        style={{ background: 'rgba(242,68,0,0.1)', color: '#F24400' }}>
                        {errorPanel.obj.name}
                      </span>
                    </h3>
                    <p className='text-xs mt-0.5' style={{ color: '#94A3B8' }}>
                      {errorLoading && errorTotalRecords === 0
                        ? 'Fetching errors…'
                        : errorTotalRecords > 0
                        ? `${errorTotalRecords.toLocaleString()} failed record${errorTotalRecords !== 1 ? 's' : ''}`
                        : 'No error records found'}
                    </p>
                  </div>
                </div>
                <button onClick={closeErrorPanel}
                  className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition'
                  style={{ color: '#94A3B8' }}>
                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M18 6L6 18M6 6l12 12' />
                  </svg>
                </button>
              </div>

              {/* Job-level error banner */}
              {errorPanel.obj.errorMessage && (
                <div className='mx-5 mt-4 rounded-xl p-3.5 flex items-start gap-3 flex-shrink-0'
                  style={{ background: 'rgba(242,68,0,0.05)', border: '1px solid rgba(242,68,0,0.18)' }}>
                  <svg className='flex-shrink-0 mt-0.5' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
                  </svg>
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold mb-0.5' style={{ color: '#F24400' }}>Job-level Error</p>
                    <p className='text-xs font-mono break-all leading-relaxed' style={{ color: '#374151' }}>{errorPanel.obj.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Records list */}
              <div className='overflow-y-auto flex-1 relative px-5 py-3'>
                {errorLoading && (
                  <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 z-10' style={{ background: 'rgba(255,255,255,0.9)' }}>
                    <div className='w-10 h-10 rounded-full flex items-center justify-center' style={{ background: 'rgba(242,68,0,0.08)' }}>
                      <svg className='animate-spin' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M21 12a9 9 0 11-6.219-8.56' />
                      </svg>
                    </div>
                    <span className='text-xs font-medium' style={{ color: '#94A3B8' }}>Loading error records…</span>
                  </div>
                )}

                {!errorLoading && errorRecords.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 gap-2'>
                    <div className='w-10 h-10 rounded-full flex items-center justify-center' style={{ background: '#F1F5F9' }}>
                      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#94A3B8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <circle cx='12' cy='12' r='10'/><polyline points='20 6 9 17 4 12'/>
                      </svg>
                    </div>
                    <p className='text-sm font-medium' style={{ color: '#64748B' }}>No error records found</p>
                  </div>
                ) : (
                  <div className='flex flex-col gap-2'>
                    {errorRecords.map((r, i) => (
                      <div key={i} className='rounded-xl p-4'
                        style={{ background: i % 2 === 0 ? '#FAFAFA' : '#FFF', border: '1px solid #F1F5F9' }}>
                        <div className='flex items-center gap-2 mb-2'>
                          <span className='text-xs font-semibold uppercase tracking-wide' style={{ color: '#94A3B8' }}>Record ID</span>
                          <span className='font-mono text-xs px-2 py-0.5 rounded-md font-semibold'
                            style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC' }}>
                            {r.recordId}
                          </span>
                        </div>
                        <p className='text-xs leading-relaxed' style={{ color: '#374151' }}>{r.error}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination footer */}
              {errorTotalPages > 1 && (
                <div className='flex items-center justify-between px-6 py-3 flex-shrink-0'
                  style={{ borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                  <span className='text-xs' style={{ color: '#94A3B8' }}>
                    {((errorPanel.page - 1) * 10) + 1}–{Math.min(errorPanel.page * 10, errorTotalRecords)} of {errorTotalRecords.toLocaleString()} records
                  </span>
                  <div className='flex items-center gap-1'>
                    <button
                      onClick={() => fetchErrorPage(errorPanel.obj, errorPanel.page - 1)}
                      disabled={errorPanel.page <= 1 || errorLoading}
                      className='w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-gray-100 transition'
                      style={{ color: '#374151', border: '1px solid #E2E8F0' }}>
                      <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                    </button>
                    <span className='text-xs px-2 font-medium' style={{ color: '#374151' }}>{errorPanel.page} / {errorTotalPages}</span>
                    <button
                      onClick={() => fetchErrorPage(errorPanel.obj, errorPanel.page + 1)}
                      disabled={errorPanel.page >= errorTotalPages || errorLoading}
                      className='w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30 hover:bg-gray-100 transition'
                      style={{ color: '#374151', border: '1px solid #E2E8F0' }}>
                      <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Table ── */}
        {(() => {
          const jobColumns: TableColumn<TreeRow>[] = [
            {
              key: 'name',
              header: 'Object',
              render: ({ obj, depth }) => {
                const hasChildren = (obj.children?.length ?? 0) > 0;
                const isCollapsed = collapsedIds.has(obj.id);
                const FAILURE_STATUSES_WITH_MSG = new Set(['FAILED', 'DELETION_JOB_FAILED']);
                const hasJobError = !!obj.errorMessage ||
                  FAILURE_STATUSES_WITH_MSG.has(obj.status?.toUpperCase() ?? '');
                const isErrorOpen = expandedInlineErrors.has(obj.id);
                return (
                  <span className='flex items-center gap-1.5 text-sm font-medium' style={{ color: '#111827', paddingLeft: depth * 20 }}>
                    {depth > 0 && (
                      <span className='flex-shrink-0 text-gray-300' style={{ fontSize: 10 }}>↳</span>
                    )}
                    {hasChildren ? (
                      <button
                        onClick={() => toggleCollapse(obj.id)}
                        className='flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-gray-100'
                        style={{ border: '1px solid #E2E8F0' }}
                      >
                        <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
                          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                          <polyline points='6 9 12 15 18 9' />
                        </svg>
                      </button>
                    ) : (
                      <span className='flex-shrink-0 w-5' />
                    )}
                    {obj.name}
                    {/* Error disclosure arrow — only on the specific failed object */}
                    {hasJobError && (
                      <button
                        onClick={() => toggleInlineError(obj.id)}
                        title={isErrorOpen ? 'Hide error' : 'Show error'}
                        className='flex-shrink-0 ml-1 rounded transition-colors hover:bg-red-50'
                        style={{ color: '#F24400', lineHeight: 0, padding: '2px' }}
                      >
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
                          style={{ transform: isErrorOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>
                          <polyline points='6 9 12 15 18 9' />
                        </svg>
                      </button>
                    )}
                  </span>
                );
              },
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
                const rawStatus = obj.status?.toUpperCase() ?? '';
                const st = getStatusStyle(rawStatus);
                return rawStatus
                  ? <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap' style={{ background: st.bg, color: st.color }}>{getStatusLabel(rawStatus)}</span>
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
                const ACTIVE_STATUSES = new Set(['DELETION_IN_PROGRESS', 'BULK_QUERY_IN_PROGRESS', 'BULK_QUERY_COMPLETED', 'TRANSFER_IN_PROGRESS', 'UPLOAD_COMPLETED', 'RUNNING', 'PENDING', 'CREATED']);
                const jobIsActive = job?.status?.toUpperCase() === 'RUNNING' || job?.status?.toUpperCase() === 'PENDING';
                const hasPerRecord = !!obj.recordErrorsS3Prefix && !ACTIVE_STATUSES.has(obj.status?.toUpperCase() ?? '') && !jobIsActive;
                return (
                  <span className='inline-flex items-center gap-2'>
                    {n > 0
                      ? <span className='inline-flex items-center gap-1 text-sm font-semibold' style={{ color: '#F24400' }}>
                          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                            <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                          </svg>
                          {n.toLocaleString()}
                        </span>
                      : <span className='text-sm font-semibold' style={{ color: '#94A3B8' }}>0</span>
                    }
                    {hasPerRecord && (
                      <button
                        onClick={() => openErrorPanel(obj)}
                        className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition hover:opacity-80'
                        style={{ background: 'rgba(242,68,0,0.1)', color: '#F24400', border: '1px solid rgba(242,68,0,0.2)' }}
                      >
                        View Errors
                      </button>
                    )}
                  </span>
                );
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

          const paginatedRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
          const totalPages = Math.ceil(filtered.length / itemsPerPage);
          const colHeaders = ['Object', 'Depth', 'Status', 'Records Uploaded', 'Records Deleted', 'Records Failed', 'Data Size', 'API Calls'];

          return (
            <div className='flex flex-col flex-1 mx-7 rounded-xl relative overflow-hidden' style={{ border: '1.5px solid #E8EDF5', minHeight: 0 }}>
              {error && !isLoading ? (
                <div className='flex flex-col items-center justify-center h-full gap-3 text-center'>
                  <p className='text-sm font-semibold text-gray-700'>Failed to load job details</p>
                  <button type='button' onClick={handleRefresh} className='text-xs text-blue-600 hover:underline'>Try again</button>
                </div>
              ) : (
                <>
                  <div className='overflow-auto flex-1'>
                    <table className='w-full' style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 1 }}>
                          {colHeaders.map(h => (
                            <th key={h} className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#64748B', whiteSpace: 'nowrap', background: '#F8FAFC' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading || isRefreshing
                          ? Array.from({ length: 5 }).map((_, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                {colHeaders.map((_, j) => (
                                  <td key={j} className='px-5 py-3.5'><div className='h-4 rounded animate-pulse' style={{ background: '#E2E8F0', width: j === 0 ? 120 : 60 }} /></td>
                                ))}
                              </tr>
                            ))
                          : paginatedRows.length === 0
                          ? <tr><td colSpan={colHeaders.length} className='px-5 py-8 text-center text-sm' style={{ color: '#94A3B8' }}>No objects found.</td></tr>
                          : paginatedRows.map(({ obj, depth }, idx) => {
                              const FAILURE_STATUSES_WITH_MSG = new Set(['FAILED', 'DELETION_JOB_FAILED']);
                              const hasJobErrorOnly = !!obj.errorMessage ||
                                FAILURE_STATUSES_WITH_MSG.has(obj.status?.toUpperCase() ?? '');
                              const isInlineOpen = expandedInlineErrors.has(obj.id);
                              return (
                                <>
                                  <tr
                                    key={obj.id ?? idx}
                                    className='hover:bg-gray-50 transition-colors'
                                    style={{ borderBottom: '1px solid #F1F5F9', background: depth > 0 ? `rgba(0,0,0,${depth * 0.012})` : undefined }}
                                  >
                                    {/* Object */}
                                    <td className='px-5 py-3.5'>{jobColumns[0].render({ obj, depth, parentId: null }, idx)}</td>
                                    {/* Depth */}
                                    <td className='px-5 py-3.5'>{jobColumns[1].render({ obj, depth, parentId: null }, idx)}</td>
                                    {/* Status */}
                                    <td className='px-5 py-3.5'>{jobColumns[2].render({ obj, depth, parentId: null }, idx)}</td>
                                    {/* Records Uploaded */}
                                    <td className='px-5 py-3.5'>{jobColumns[3].render({ obj, depth, parentId: null }, idx)}</td>
                                    {/* Records Deleted */}
                                    <td className='px-5 py-3.5'>{jobColumns[4].render({ obj, depth, parentId: null }, idx)}</td>
                                    {/* Records Failed */}
                                    <td className='px-5 py-3.5'>{jobColumns[5].render({ obj, depth, parentId: null }, idx)}</td>
                                    {/* Data Size */}
                                    <td className='px-5 py-3.5'>{jobColumns[6].render({ obj, depth, parentId: null }, idx)}</td>
                                    {/* API Calls */}
                                    <td className='px-5 py-3.5'>{jobColumns[7].render({ obj, depth, parentId: null }, idx)}</td>
                                  </tr>
                                  {/* Inline error row — only for job-level errorMessage (no per-record errors) */}
                                  {hasJobErrorOnly && isInlineOpen && (
                                    <tr style={{ background: 'rgba(242,68,0,0.02)', borderBottom: '1px solid rgba(242,68,0,0.1)' }}>
                                      <td colSpan={colHeaders.length} style={{ paddingLeft: depth * 20 + 20, paddingRight: 20, paddingTop: 8, paddingBottom: 12 }}>
                                        <div className='flex items-start gap-2.5 rounded-lg px-4 py-3' style={{ background: 'rgba(242,68,0,0.06)', border: '1px solid rgba(242,68,0,0.15)' }}>
                                          <svg className='flex-shrink-0 mt-0.5' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                                            <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                                          </svg>
                                          <div className='flex-1 min-w-0'>
                                            <p className='text-xs font-semibold mb-0.5' style={{ color: '#F24400' }}>Job Error</p>
                                            <p className='text-sm font-mono break-all' style={{ color: '#374151' }}>{obj.errorMessage || 'Object failed — no additional error details available.'}</p>
                                          </div>
                                          <button
                                            onClick={handleRetryJob}
                                            disabled={isRetrying}
                                            title='Retry this object'
                                            className='flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50'
                                            style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}
                                          >
                                            <IconRetry spinning={isRetrying} />
                                            {isRetrying ? 'Retrying…' : 'Retry'}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })
                        }
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className='flex items-center justify-between px-5 py-3 flex-shrink-0' style={{ borderTop: '1px solid #F1F5F9' }}>
                      <span className='text-xs' style={{ color: '#64748B' }}>
                        {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                      </span>
                      <div className='flex items-center gap-1'>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                          className='px-3 py-1 rounded text-xs font-medium disabled:opacity-40 hover:bg-gray-100 transition' style={{ color: '#374151' }}>Prev</button>
                        <span className='text-xs px-2' style={{ color: '#374151' }}>{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                          className='px-3 py-1 rounded text-xs font-medium disabled:opacity-40 hover:bg-gray-100 transition' style={{ color: '#374151' }}>Next</button>
                      </div>
                    </div>
                  )}
                </>
              )}
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
