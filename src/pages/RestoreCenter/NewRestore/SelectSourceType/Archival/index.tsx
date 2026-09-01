import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from '../../../../../components/Table';
import type { TableColumn } from '../../../../../components/Table';
import Typography from '../../../../../components/Typography';
import { useArchivalService } from '../../../../../services/archival/archival.service';
import { formatBytes } from '../../../../../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ArchivalScopeType = 'ENTIRE' | 'DELETED_BETWEEN';

export interface ArchivalSelection {
  backupConfigId: string;
  slug: string;
  backupJobIds: string[];
  type: ArchivalScopeType;
  startDate?: string;
  endDate?: string;
}

interface Props {
  showJobsPhase: boolean;
  onConfigSelected: (selected: boolean) => void;
  onSelectionChange: (selection: ArchivalSelection | null) => void;
  initialSelectedRow?: any;
  initialSelectedConfigId?: string;
  initialSelectedJobIds?: string[];
  onSelectedRowChange?: (row: any) => void;
  onSelectedConfigIdChange?: (id: string) => void;
  onSelectedJobIdsChange?: (ids: string[]) => void;
}

type StatusFilter = 'All' | 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'INACTIVE';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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

// ── Component ─────────────────────────────────────────────────────────────────

const JOB_STATUS_SET = new Set(['SUCCESS', 'FAILED', 'PARTIAL_FAILURE', 'PENDING']);

export default function ArchivalPicker({ onConfigSelected, onSelectionChange, showJobsPhase, initialSelectedConfigId = '', onSelectedRowChange, onSelectedConfigIdChange }: Props) {
  const archivalService = useArchivalService();

  // ── Phase 1: config list ──────────────────────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string>(initialSelectedConfigId);
  const [selectedCreatedAt, setSelectedCreatedAt] = useState<string>('');
  const [selectedSlug, setSelectedSlug] = useState<string>('');

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

  const selectRow = (row: any) => {
    setSelectedKey(row.backupConfigId);
    setSelectedCreatedAt(row.createdAt ?? '');
    setSelectedSlug(row.slug ?? row.backupConfigId);
    onSelectedRowChange?.(row);
    onSelectedConfigIdChange?.(row.backupConfigId);
    onSelectionChange(null);
    onConfigSelected(true);
  };

  // ── Phase 2: restore type + date range ───────────────────────────────────
  const toDatetimeLocal = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const minDatetime = toDatetimeLocal(selectedCreatedAt);
  const maxDatetime = toDatetimeLocal(new Date().toISOString());
  const createdAtReadable = selectedCreatedAt
    ? new Date(selectedCreatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const [scopeType, setScopeType] = useState<ArchivalScopeType>('ENTIRE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startOutOfRange, setStartOutOfRange] = useState(false);
  const [endOutOfRange, setEndOutOfRange] = useState(false);

  const dateRangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scopeType === 'DELETED_BETWEEN') {
      setTimeout(() => dateRangeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }, [scopeType]);

  // Reset type/dates when config changes
  const prevConfigIdRef = useRef(selectedKey);
  useEffect(() => {
    if (prevConfigIdRef.current !== selectedKey) {
      prevConfigIdRef.current = selectedKey;
      setScopeType('ENTIRE');
      setStartDate('');
      setEndDate('');
      setStartOutOfRange(false);
      setEndOutOfRange(false);
    }
  }, [selectedKey]);

  // Emit selection whenever type/dates are valid
  useEffect(() => {
    if (!selectedKey) return;
    if (scopeType === 'DELETED_BETWEEN') {
      if (!startDate || !endDate) { onSelectionChange(null); return; }
      const now = toDatetimeLocal(new Date().toISOString());
      const invalid = startDate > now || endDate > now || (minDatetime && startDate < minDatetime) || (minDatetime && endDate < minDatetime) || endDate < startDate;
      if (invalid) { onSelectionChange(null); return; }
    }
    onSelectionChange({
      backupConfigId: selectedKey,
      slug: selectedSlug,
      backupJobIds: [],
      type: scopeType,
      ...(scopeType === 'DELETED_BETWEEN' ? { startDate, endDate } : {}),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeType, startDate, endDate, selectedKey]);

  // ── Columns ───────────────────────────────────────────────────────────────
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
          onChange={() => selectRow(row)}
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
      {/* Phase 1 — config picker */}
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
            onRowClick={selectRow}
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

      {/* Phase 2 — restore type picker */}
      {showJobsPhase && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-5'>
          <p className='text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1'>Restore Type</p>
          <p className='text-xs text-gray-400 mb-4'>Archive jobs are resolved automatically — no manual selection needed.</p>
          <div className='grid gap-3 grid-cols-2'>
            {([
              {
                id: 'ENTIRE' as ArchivalScopeType,
                icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/><path d='M12 8v4l3 3'/></svg>,
                title: 'Entire',
                desc: 'Restore all records from the selected archive policy. No time filtering applied.',
              },
              {
                id: 'DELETED_BETWEEN' as ArchivalScopeType,
                icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>,
                title: 'Deleted Between',
                desc: 'Restore only records that were deleted within a specific date and time range.',
              },
            ]).map(({ id, icon, title, desc }) => {
              const active = scopeType === id;
              return (
                <button
                  key={id}
                  onClick={() => setScopeType(id)}
                  className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {icon}
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${active ? 'border-blue-600' : 'border-gray-300'}`}>
                      {active && <div className='w-2 h-2 rounded-full bg-blue-600' />}
                    </div>
                  </div>
                  <p className={`mt-3 text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-800'}`}>{title}</p>
                  <p className='mt-1 text-xs text-gray-500 leading-relaxed'>{desc}</p>
                </button>
              );
            })}
          </div>

          {/* Date range — only for Deleted Between */}
          {scopeType === 'DELETED_BETWEEN' && (
            <div ref={dateRangeRef} className='mt-4 rounded-xl border border-blue-200 bg-blue-50 px-6 py-5'>
              <div className='flex items-center gap-2 mb-4'>
                <svg width='16' height='16' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24'>
                  <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                </svg>
                <p className='text-sm font-semibold text-blue-700'>Select deletion time range</p>
              </div>
              <div className='grid grid-cols-2 gap-5'>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>Start Time</label>
                  <input
                    type='datetime-local'
                    value={startDate}
                    min={minDatetime || undefined}
                    max={maxDatetime || undefined}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      if (!newStart && e.nativeEvent instanceof InputEvent) {
                        setStartOutOfRange(true);
                        return;
                      }
                      setStartOutOfRange(false);
                      setStartDate(newStart);
                      if (endDate && newStart && endDate < newStart) setEndDate('');
                    }}
                    className={`h-10 text-sm border-2 rounded-lg px-3 bg-white text-gray-800 outline-none focus:border-blue-500 transition-colors ${
                      startOutOfRange || (startDate && (startDate > maxDatetime || (minDatetime && startDate < minDatetime)))
                        ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  <p className='text-[10px] text-gray-400'>Valid range: {createdAtReadable || '—'} → now</p>
                  {startOutOfRange && (
                    <p className='text-[10px] text-red-500 font-medium'>Selected time is outside the allowed range ({createdAtReadable} to now)</p>
                  )}
                  {!startOutOfRange && startDate && startDate > maxDatetime && (
                    <p className='text-[10px] text-red-500 font-medium'>Cannot be in the future</p>
                  )}
                  {!startOutOfRange && startDate && minDatetime && startDate < minDatetime && (
                    <p className='text-[10px] text-red-500 font-medium'>Cannot be before archive creation date</p>
                  )}
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>End Time</label>
                  <input
                    type='datetime-local'
                    value={endDate}
                    min={startDate || minDatetime || undefined}
                    max={maxDatetime || undefined}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      if (!newEnd && e.nativeEvent instanceof InputEvent) {
                        setEndOutOfRange(true);
                        return;
                      }
                      setEndOutOfRange(false);
                      setEndDate(newEnd);
                    }}
                    className={`h-10 text-sm border-2 rounded-lg px-3 bg-white text-gray-800 outline-none focus:border-blue-500 transition-colors ${
                      endOutOfRange || (endDate && (endDate > maxDatetime || (startDate && endDate < startDate) || (minDatetime && endDate < minDatetime)))
                        ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  <p className='text-[10px] text-gray-400'>Valid range: {startDate ? startDate.replace('T', ' ') : (createdAtReadable || '—')} → now</p>
                  {endOutOfRange && (
                    <p className='text-[10px] text-red-500 font-medium'>Selected time is outside the allowed range (must be after start time and not in the future)</p>
                  )}
                  {!endOutOfRange && endDate && endDate > maxDatetime && (
                    <p className='text-[10px] text-red-500 font-medium'>Cannot be in the future</p>
                  )}
                  {!endOutOfRange && endDate && minDatetime && endDate < minDatetime && (
                    <p className='text-[10px] text-red-500 font-medium'>Cannot be before archive creation date</p>
                  )}
                  {!endOutOfRange && endDate && startDate && endDate < startDate && !(endDate < minDatetime) && (
                    <p className='text-[10px] text-red-500 font-medium'>Cannot be before start time</p>
                  )}
                </div>
              </div>
              {(!startDate || !endDate) && (
                <div className='mt-3 flex items-center gap-2'>
                  <div className='w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse' />
                  <p className='text-xs text-blue-600 font-medium'>Fill both dates to proceed</p>
                </div>
              )}
              {startDate && endDate && (
                <div className='mt-3 flex items-center gap-2'>
                  <svg width='13' height='13' fill='none' stroke='#16a34a' strokeWidth='2.5' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7'/>
                  </svg>
                  <p className='text-xs text-green-700 font-medium'>Time range set — ready to proceed</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
