import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from '../../../../../components/Table';
import type { TableColumn } from '../../../../../components/Table';
import Typography from '../../../../../components/Typography';
import { useArchivalService } from '../../../../../services/archival/archival.service';
import { formatBytes } from '../../../../../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ArchivalScopeType = 'ENTIRE';

export interface ArchivalSelection {
  backupConfigId: string;
  slug: string;
  backupJobIds: string[];
  type: ArchivalScopeType;
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


export default function ArchivalPicker({ onConfigSelected, onSelectionChange, showJobsPhase, initialSelectedConfigId = '', onSelectedRowChange, onSelectedConfigIdChange }: Props) {
  const archivalService = useArchivalService();

  // ── Phase 1: config list ──────────────────────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string>(initialSelectedConfigId);
  const [selectedSlug, setSelectedSlug] = useState<string>('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const queryFn = useCallback(
    () => archivalService.getList(currentCursor ?? undefined, debouncedSearch || undefined),
    [currentCursor, debouncedSearch]
  );

  const { data: rawData, isLoading, isFetching } = useQuery({
    queryKey: ['restore-archival-list', currentCursor, debouncedSearch],
    queryFn,
    refetchOnWindowFocus: false,
  });

  const rawList: any[] = Array.isArray((rawData as any)?.data) ? (rawData as any).data : [];
  const apiMeta = (rawData as any)?.meta ?? { limit: 25, nextCursor: null, totalRecords: rawList.length };

  const rows = rawList.filter((item: any) => normalizeStatus(item.status) !== 'DRAFT').map((item: any) => ({
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
    setSelectedSlug(row.slug ?? row.backupConfigId);
    onSelectedRowChange?.(row);
    onSelectedConfigIdChange?.(row.backupConfigId);
    onSelectionChange(null);
    onConfigSelected(true);
  };

  // ── Phase 2: emit selection on config change ──────────────────────────────
  useEffect(() => {
    if (!selectedKey) return;
    onSelectionChange({
      backupConfigId: selectedKey,
      slug: selectedSlug,
      backupJobIds: [],
      type: 'ENTIRE',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

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

          </div>

          <Table
            columns={configColumns}
            rows={rows}
            getRowKey={(row: any) => row.backupConfigId}
            loading={isLoading || isFetching}
            skeletonConfig={{ rows: 6, colWidths: ['w-8', 'w-12', 'w-40', 'w-24', 'w-20', 'w-28', 'w-16', 'w-20'] }}
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

    </>
  );
}
