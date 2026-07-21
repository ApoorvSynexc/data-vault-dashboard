import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from '../../../../../components/Table';
import type { TableColumn } from '../../../../../components/Table';
import Typography from '../../../../../components/Typography';
import { useArchivalService } from '../../../../../services/archival/archival.service';
import { useBackupConfigService } from '../../../../../services/backup-config/backup-config.service';
import { formatBytes } from '../../../../../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArchivalSelection {
  backupConfigId: string;
  slug: string;
  backupJobIds: string[];
}

interface Props {
  showJobsPhase: boolean;
  onConfigSelected: (selected: boolean) => void;
  onSelectionChange: (selection: ArchivalSelection | null) => void;
  onExitJobsPhase: () => void;
  initialSelectedRow?: any;
  initialSelectedConfigId?: string;
  initialSelectedJobIds?: string[];
  onSelectedRowChange?: (row: any) => void;
  onSelectedConfigIdChange?: (id: string) => void;
  onSelectedJobIdsChange?: (ids: string[]) => void;
}

type StatusFilter = 'All' | 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'INACTIVE';

const JOBS_PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtJobTime(iso?: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

function flattenObjects(items: any[]): any[] {
  return items.flatMap((o) => [o, ...flattenObjects(o.children ?? [])]);
}

function normalizeStatus(raw?: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'ACTIVE', RUNNING: 'RUNNING', SCHEDULED: 'SCHEDULED',
    DRAFT: 'DRAFT', PAUSED: 'PAUSED', FAILED: 'FAILED',
    ONE_TIME: 'ONE_TIME', PENDING: 'PENDING', SUCCESS: 'SUCCESS',
    PARTIAL_FAILURE: 'PARTIAL_FAILURE', INACTIVE: 'INACTIVE', RESUMED: 'ACTIVE',
  };
  return map[raw?.toUpperCase() ?? ''] ?? raw ?? 'DRAFT';
}

function PlatformBadge({ name }: { name: string }) {
  const letter = name?.charAt(0)?.toUpperCase() ?? '?';
  const fill = name?.toLowerCase().includes('salesforce') ? '#0ea5e9'
    : name?.toLowerCase().includes('hubspot') ? '#f97316'
    : '#6b7280';
  return (
    <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50'>
      <svg viewBox='0 0 40 40' className='h-7 w-7'>
        <rect x='5' y='5' width='30' height='30' rx='9' fill={fill} fillOpacity='0.16' />
        <text x='20' y='23' textAnchor='middle' fontSize='14' fontWeight='700' fill={fill}>{letter}</text>
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-700', RUNNING: 'bg-green-100 text-green-700',
    SUCCESS: 'bg-green-100 text-green-700', PENDING: 'bg-indigo-100 text-indigo-700',
    DRAFT: 'bg-yellow-100 text-yellow-700', PAUSED: 'bg-gray-100 text-gray-700',
    INACTIVE: 'bg-gray-100 text-gray-500', FAILED: 'bg-red-100 text-red-700',
    PARTIAL_FAILURE: 'bg-orange-100 text-orange-700',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active', RUNNING: 'Running', SUCCESS: 'Success', PENDING: 'Pending',
    DRAFT: 'Draft', PAUSED: 'Paused', INACTIVE: 'Inactive', FAILED: 'Failed',
    PARTIAL_FAILURE: 'Partial Failure',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const upper = status?.toUpperCase() ?? '';
  const statusColor: Record<string, string> = {
    SUCCESS: 'border-green-200 bg-green-50 text-green-700',
    COMPLETED: 'border-green-200 bg-green-50 text-green-700',
    UPLOAD_COMPLETED: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    PARTIAL_FAILURE: 'border-amber-200 bg-amber-50 text-amber-700',
    FAILED: 'border-red-200 bg-red-50 text-red-700',
    DELETION_JOB_FAILED: 'border-red-200 bg-red-50 text-red-700',
    DELETION_RECORDS_FAILED: 'border-amber-200 bg-amber-50 text-amber-700',
    RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
    PENDING: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  };
  const dotColor: Record<string, string> = {
    SUCCESS: 'bg-green-500', COMPLETED: 'bg-green-500', UPLOAD_COMPLETED: 'bg-cyan-500',
    FAILED: 'bg-red-500', DELETION_JOB_FAILED: 'bg-red-500',
    RUNNING: 'bg-blue-500', PENDING: 'bg-yellow-400',
    PARTIAL_FAILURE: 'bg-amber-400', DELETION_RECORDS_FAILED: 'bg-amber-400',
  };
  const statusLabel: Record<string, string> = {
    PARTIAL_FAILURE: 'Partial Failure',
    DELETION_JOB_FAILED: 'Deletion Failed',
    DELETION_RECORDS_FAILED: 'Records Failed',
    UPLOAD_COMPLETED: 'Upload Completed',
    COMPLETED: 'Completed',
    SUCCESS: 'Success',
    FAILED: 'Failed',
    RUNNING: 'Running',
    PENDING: 'Pending',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusColor[upper] ?? 'border-gray-200 bg-gray-50 text-gray-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor[upper] ?? 'bg-gray-400'}`} />
      {statusLabel[upper] ?? status ?? '--'}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const JOB_STATUS_SET = new Set(['SUCCESS', 'FAILED', 'PARTIAL_FAILURE', 'PENDING']);

export default function ArchivalPicker({ showJobsPhase, onConfigSelected, onSelectionChange, onExitJobsPhase, initialSelectedRow = null, initialSelectedConfigId = '', initialSelectedJobIds = [], onSelectedRowChange, onSelectedConfigIdChange, onSelectedJobIdsChange }: Props) {
  const archivalService = useArchivalService();
  const backupConfigService = useBackupConfigService();

  // ── Phase 1 — policy list ────────────────────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string>(initialSelectedConfigId);
  const [selectedRow, setSelectedRow] = useState<any>(initialSelectedRow);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const [currentPage, setCurrentPage] = useState(1);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<{ page: number; cursor: string }[]>([]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCursorStack([]);
      setCurrentPage(1);
      setCurrentCursor(null);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const handleStatusFilter = (val: StatusFilter) => {
    setStatusFilter(val);
    setCursorStack([]);
    setCurrentPage(1);
    setCurrentCursor(null);
  };

  const apiStatus = !JOB_STATUS_SET.has(statusFilter) && statusFilter !== 'All' ? statusFilter : undefined;
  const apiBackupStatus = JOB_STATUS_SET.has(statusFilter) ? statusFilter : undefined;

  const queryFn = useCallback(
    () => archivalService.getList(currentCursor ?? undefined, debouncedSearch || undefined, apiStatus, apiBackupStatus),
    [currentCursor, debouncedSearch, apiStatus, apiBackupStatus]
  );

  const { data: rawData, isLoading, isFetching } = useQuery({
    queryKey: ['restore-archival-list', currentCursor, debouncedSearch, statusFilter],
    queryFn,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const rawList: any[] = Array.isArray((rawData as any)?.data) ? (rawData as any).data : [];
  const apiMeta = (rawData as any)?.meta ?? { limit: 25, nextCursor: null, totalRecords: rawList.length };

  const rows = rawList.map((item: any) => ({
    ...item,
    displayName: item.name ?? item.slug ?? '--',
    displayStatus: normalizeStatus(item.status),
    lastJobStatus: item.backupStatus ? normalizeStatus(item.backupStatus) : '',
    displayDate: formatDate(item.lastBackupAt ?? item.createdAt),
  }));

  const goToPrev = () => {
    const stack = [...cursorStack];
    const prev = stack.pop();
    setCursorStack(stack);
    setCurrentPage(prev ? prev.page : 1);
    setCurrentCursor(prev ? (prev.cursor || null) : null);
  };

  const goToPage1 = () => {
    setCursorStack([]);
    setCurrentPage(1);
    setCurrentCursor(null);
  };

  // ── Phase 2 — jobs list ──────────────────────────────────────────────────
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set(initialSelectedJobIds));
  const [jobsCursor, setJobsCursor] = useState<string | null>(null);
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1);
  const [jobsCursorStack, setJobsCursorStack] = useState<{ page: number; cursor: string }[]>([]);

  // Reset jobs state only when transitioning false→true (entering phase 2), not on initial mount
  const prevShowJobsPhaseRef = useRef(showJobsPhase);
  useEffect(() => {
    const wasInJobsPhase = prevShowJobsPhaseRef.current;
    prevShowJobsPhaseRef.current = showJobsPhase;
    if (showJobsPhase && !wasInJobsPhase) {
      setSelectedJobIds(new Set());
      setJobsCursor(null);
      setJobsCurrentPage(1);
      setJobsCursorStack([]);
    }
  }, [showJobsPhase]);

  const selectedSlug = selectedRow?.slug ?? selectedRow?.backupConfigId ?? '';

  const { data: jobsData, isLoading: isLoadingJobs, isFetching: isFetchingJobs } = useQuery({
    queryKey: ['restore-archival-jobs', selectedSlug, jobsCursor],
    queryFn: () => backupConfigService.listBackupJobs(selectedSlug, true, jobsCursor ?? undefined, JOBS_PAGE_SIZE),
    enabled: showJobsPhase && !!selectedSlug,
    staleTime: 30_000,
  });

  const jobsRows: any[] = (jobsData as any)?.data ?? [];
  const jobsMeta = (jobsData as any)?.meta ?? { nextCursor: null, totalRecords: 0 };

  const goJobsNext = () => {
    if (!jobsMeta.nextCursor) return;
    setJobsCursorStack((prev) => [...prev, { page: jobsCurrentPage, cursor: jobsCursor ?? '' }]);
    setJobsCurrentPage((p) => p + 1);
    setJobsCursor(jobsMeta.nextCursor);
  };

  const goJobsPrev = () => {
    const stack = [...jobsCursorStack];
    const prev = stack.pop();
    setJobsCursorStack(stack);
    setJobsCurrentPage(prev ? prev.page : 1);
    setJobsCursor(prev ? (prev.cursor || null) : null);
  };

  const goJobsToPage1 = () => {
    setJobsCursorStack([]);
    setJobsCurrentPage(1);
    setJobsCursor(null);
  };

  const toggleJob = (id: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const ids = Array.from(next);
      onSelectedJobIdsChange?.(ids);
      onSelectionChange(next.size > 0
        ? { backupConfigId: selectedKey, slug: selectedSlug, backupJobIds: ids }
        : null
      );
      return next;
    });
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const configColumns: TableColumn<any>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: (row) => (
        <input
          type='radio'
          name='archive-select'
          checked={selectedKey === row.backupConfigId}
          onChange={() => {
            setSelectedKey(row.backupConfigId);
            setSelectedRow(row);
            onSelectedRowChange?.(row);
            onSelectedConfigIdChange?.(row.backupConfigId);
            onSelectionChange(null);
            onConfigSelected(true);
          }}
          onClick={(e) => e.stopPropagation()}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'slNo',
      header: 'SL No.',
      width: '60px',
      render: (_row, index) => <span className='text-sm text-gray-600'>{(currentPage - 1) * (apiMeta.limit ?? 25) + index + 1}</span>,
    },
    {
      key: 'displayName',
      header: 'Archive Policy',
      render: (row) => (
        <div className='flex items-center gap-2'>
          <PlatformBadge name={row.crmName ?? 'Salesforce'} />
          <span className='text-sm font-semibold text-gray-900'>{row.displayName}</span>
        </div>
      ),
    },
    {
      key: 'platform',
      header: 'Platform',
      render: (row) => <span className='text-xs text-gray-600'>{row.crmName ?? 'Salesforce'}</span>,
    },
    {
      key: 'displayStatus',
      header: 'Status',
      render: (row) => <StatusBadge status={row.displayStatus} />,
    },
    {
      key: 'lastJobStatus',
      header: 'Last Job',
      render: (row) => row.lastJobStatus
        ? <StatusBadge status={row.lastJobStatus} />
        : <span className='text-xs text-gray-400'>--</span>,
    },
    {
      key: 'displayDate',
      header: 'Last Run',
      render: (row) => <span className='text-xs text-gray-500 whitespace-nowrap'>{row.displayDate}</span>,
    },
    {
      key: 'archivedRecordsCount',
      header: 'Records',
      render: (row) => <span className='text-xs text-gray-600 tabular-nums'>{row.archivedRecordsCount != null ? Number(row.archivedRecordsCount).toLocaleString() : '--'}</span>,
    },
    {
      key: 'archivedSizeInBytes',
      header: 'Data Size',
      render: (row) => <span className='text-xs text-gray-600 tabular-nums'>{row.archivedSizeInBytes ? formatBytes(row.archivedSizeInBytes) : '--'}</span>,
    },
  ];

  const jobsColumns: TableColumn<any>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '40px',
      render: (job) => (
        <input
          type='checkbox'
          checked={selectedJobIds.has(job.backupJobId)}
          onChange={() => toggleJob(job.backupJobId)}
          onClick={(e) => e.stopPropagation()}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'slNo',
      header: 'SL No.',
      width: '60px',
      render: (_row, index) => <span className='text-sm text-gray-600'>{(jobsCurrentPage - 1) * JOBS_PAGE_SIZE + index + 1}</span>,
    },
    {
      key: 'startedAt',
      header: 'Start Time',
      render: (job) => <span className='text-xs text-gray-700 whitespace-nowrap'>{fmtJobTime(job.startedAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => <JobStatusBadge status={job.status ?? ''} />,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (job) => <span className='text-xs font-semibold text-blue-600'>{calcDuration(job.startedAt, job.completedAt)}</span>,
    },
    {
      key: 'recordsUploaded',
      header: 'Records Uploaded',
      render: (job) => {
        const allObjs = flattenObjects(job.object ?? []);
        const count = allObjs.length > 0
          ? allObjs.reduce((acc: number, o: any) => acc + (o.insertCount ?? o.completedRecordCount ?? o.totalRecordCount ?? 0), 0)
          : (job.recordCount ?? 0);
        return <span className='text-xs font-semibold text-green-600 tabular-nums'>{count.toLocaleString()}</span>;
      },
    },
    {
      key: 'recordsDeleted',
      header: 'Records Deleted',
      render: (job) => {
        const allObjs = flattenObjects(job.object ?? []);
        const count = allObjs.reduce((acc: number, o: any) => acc + ((o as any).deletedSuccessRecordCount ?? 0), 0);
        return <span className='text-xs font-semibold text-blue-600 tabular-nums'>{count.toLocaleString()}</span>;
      },
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      render: (job) => {
        const allObjs = flattenObjects(job.object ?? []);
        const bytes = allObjs.length > 0
          ? allObjs.reduce((acc: number, o: any) => acc + (o.sizeInBytes ?? 0), 0)
          : (job.sizeInBytes ?? 0);
        return <span className='text-xs text-gray-700 tabular-nums'>{formatBytes(bytes || undefined)}</span>;
      },
    },
  ];

  const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
    { label: 'All',      value: 'All'      },
    { label: 'Active',   value: 'ACTIVE'   },
    { label: 'Paused',   value: 'PAUSED'   },
    { label: 'Draft',    value: 'DRAFT'    },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Phase 1 — policy list */}
      {!showJobsPhase && (
        <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
          <div className='flex-shrink-0 flex items-center gap-3 border-b border-gray-100 px-5 py-3'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Choose an Archive Vault Entry</Typography>
          </div>

          <div className='flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
            <div className='relative'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'
                className='pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400'>
                <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search archive…'
                className='h-8 w-48 rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-700 outline-none focus:border-blue-400 transition'
              />
            </div>

            <div className='flex items-center gap-1 ml-auto'>
              <span className='text-xs text-gray-500 font-medium mr-1'>Status:</span>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusFilter(opt.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    statusFilter === opt.value
                      ? opt.value === 'ACTIVE'   ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : opt.value === 'PAUSED'   ? 'bg-gray-200 text-gray-700 border-gray-300'
                      : opt.value === 'DRAFT'    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      : opt.value === 'INACTIVE' ? 'bg-gray-100 text-gray-500 border-gray-200'
                      : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Table
            columns={configColumns}
            rows={rows}
            getRowKey={(row: any) => row.backupConfigId}
            loading={isLoading || isFetching}
            skeletonConfig={{ rows: 6, colWidths: ['w-8', 'w-12', 'w-40', 'w-24', 'w-20', 'w-20', 'w-28', 'w-16', 'w-20'] }}
            headerVariant='uppercase'
            borderless
            getRowClassName={(row: any) => `border-b border-gray-50 transition-colors cursor-pointer ${selectedKey === row.backupConfigId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            onRowClick={(row: any) => {
              setSelectedKey(row.backupConfigId);
              setSelectedRow(row);
              onSelectedRowChange?.(row);
              onSelectedConfigIdChange?.(row.backupConfigId);
              onSelectionChange(null);
              onConfigSelected(true);
            }}
            emptyState='No archive entries found.'
            height='auto'
            paginationConfig={{
              type: 'cursor',
              hasPrev: currentPage > 1,
              hasNext: !!apiMeta.nextCursor,
              onPrev: goToPrev,
              onNext: () => {
                if (apiMeta.nextCursor) {
                  setCursorStack((prev) => [...prev, { page: currentPage, cursor: currentCursor ?? '' }]);
                  setCurrentPage(currentPage + 1);
                  setCurrentCursor(apiMeta.nextCursor);
                }
              },
              label: `Showing ${rows.length > 0 ? (currentPage - 1) * (apiMeta.limit ?? 25) + 1 : 0} to ${(currentPage - 1) * (apiMeta.limit ?? 25) + rows.length} of ${apiMeta.totalRecords ?? rows.length}`,
            }}
          />
        </div>
      )}

      {/* Phase 2 — jobs list */}
      {showJobsPhase && (
        <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '600px' }}>
          <div className='flex-shrink-0 flex items-center gap-3 border-b border-gray-100 px-5 py-3'>
            <button
              onClick={onExitJobsPhase}
              className='inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors'
            >
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='15 18 9 12 15 6' />
              </svg>
              Back to Archives
            </button>
            <span className='text-gray-300 select-none'>|</span>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Select Archive Jobs</Typography>
            {selectedRow?.displayName && (
              <span className='ml-1 text-xs font-medium text-gray-500'>— {selectedRow.displayName}</span>
            )}
          </div>
          <Table
            columns={jobsColumns}
            rows={jobsRows}
            getRowKey={(job: any) => job.backupJobId}
            loading={isLoadingJobs || isFetchingJobs}
            skeletonConfig={{ rows: 8, colWidths: ['w-8', 'w-12', 'w-36', 'w-28', 'w-20', 'w-24', 'w-24', 'w-20'] }}
            headerVariant='uppercase'
            borderless
            getRowClassName={(job: any) => `border-b border-gray-50 transition-colors cursor-pointer ${selectedJobIds.has(job.backupJobId) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            onRowClick={(job: any) => toggleJob(job.backupJobId)}
            emptyState='No archive jobs found for this policy.'
            height='auto'
            paginationConfig={{
              type: 'cursor',
              hasPrev: jobsCurrentPage > 1,
              hasNext: !!jobsMeta.nextCursor,
              onPrev: goJobsPrev,
              onNext: goJobsNext,
              label: `Showing ${jobsRows.length > 0 ? (jobsCurrentPage - 1) * JOBS_PAGE_SIZE + 1 : 0} to ${(jobsCurrentPage - 1) * JOBS_PAGE_SIZE + jobsRows.length} of ${jobsMeta.totalRecords ?? jobsRows.length}`,
            }}
          />
        </div>
      )}
    </>
  );
}
