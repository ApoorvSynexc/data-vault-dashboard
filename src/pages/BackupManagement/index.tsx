import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddBackupModal, { type PlatformType } from './AddBackupModal';
import Table, { type TableColumn } from '../../components/Table';
import Typography from '../../components/Typography';
import WarningDialog from '../../components/WarningDialog';
import { useBackupConfigService } from '../../services/backup-config/backup-config.service';

type MetricTone = 'default' | 'success' | 'warning' | 'danger';
type BackupStatus = 'Completed' | 'Running' | 'Pending' | 'Failed';
type BackupType = 'Realtime' | 'Schedule';

type BackupConfigItem = {
  backupConfigId: string;
  slug: string;
  crmId: string;
  name: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR' | string;
  schedule?: 'SCHEDULE' | 'REALTIME' | string;
  backupStatus?: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING' | string;
  lastBackupAt?: string;
  sizeInBytes?: number;
  platform?: PlatformType | string;
};

type BackupRow = {
  id: string;
  slug: string;
  name: string;
  platform: PlatformType;
  status: BackupStatus;
  backupType: BackupType;
  lastRun: string;
  dataSize: string;
};

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='flex items-center justify-between border-b border-gray-100 px-5 py-4'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>
          {title}
        </Typography>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone = 'default',
  withBar = false,
}: {
  label: string;
  value: string;
  note: string;
  tone?: MetricTone;
  withBar?: boolean;
}) {
  type TC = 'muted' | 'danger' | 'success' | 'primary';

  const labelColor: Record<MetricTone, TC> = {
    default: 'muted',
    success: 'muted',
    warning: 'muted',
    danger: 'danger',
  };
  const valueColor: Record<MetricTone, TC> = {
    default: 'primary',
    success: 'primary',
    warning: 'primary',
    danger: 'danger',
  };
  const noteColor: Record<MetricTone, TC> = {
    default: 'success',
    success: 'success',
    warning: 'muted',
    danger: 'danger',
  };

  return (
    <div className='rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm'>
      <Typography variant='metricLabel' color={labelColor[tone]}>
        {label}
      </Typography>
      <Typography className='mt-1' variant='metricValue' color={valueColor[tone]}>
        {value}
      </Typography>
      {withBar ? (
        <div className='mt-2 flex items-center gap-2'>
          <Typography variant='metricLabel' color={noteColor[tone]}>
            {note}
          </Typography>
          <div className='h-1.5 flex-1 rounded-full bg-gray-100'>
            <div className='h-1.5 rounded-full bg-green-500' style={{ width: '80%' }} />
          </div>
        </div>
      ) : (
        <Typography className='mt-2' variant='metricLabel' color={noteColor[tone]}>
          {note}
        </Typography>
      )}
    </div>
  );
}

function PlatformBadge({
  platform,
  size = 'md',
}: {
  platform: PlatformType;
  size?: 'sm' | 'md';
}) {
  const sizeMap = {
    sm: {
      box: 'h-7 w-7',
      text: 'text-[10px]',
      svg: 'h-7 w-7',
    },
    md: {
      box: 'h-9 w-9',
      text: 'text-xs',
      svg: 'h-9 w-9',
    },
  };

  const config: Record<PlatformType, { letter: string; bg: string; fill: string }> = {
    Salesforce: { letter: 'S', bg: 'bg-sky-50', fill: '#0ea5e9' },
    HubSpot: { letter: 'H', bg: 'bg-orange-50', fill: '#f97316' },
    Zoho: { letter: 'Z', bg: 'bg-emerald-50', fill: '#10b981' },
  };

  const current = config[platform];

  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center rounded-lg border border-gray-100',
        current.bg,
        sizeMap[size].box,
      ].join(' ')}
    >
      <svg viewBox='0 0 40 40' className={sizeMap[size].svg} aria-hidden='true'>
        <rect x='5' y='5' width='30' height='30' rx='9' fill={current.fill} fillOpacity='0.16' />
        <text
          x='20'
          y='23'
          textAnchor='middle'
          fontSize='14'
          fontWeight='700'
          fill={current.fill}
          className={sizeMap[size].text}
        >
          {current.letter}
        </text>
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: BackupStatus }) {
  const styles: Record<BackupStatus, string> = {
    Completed: 'bg-emerald-100 text-emerald-700',
    Running: 'bg-amber-100 text-amber-700',
    Pending: 'bg-blue-100 text-blue-700',
    Failed: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function BackupTypeBadge({ type }: { type: BackupType }) {
  const styles: Record<BackupType, string> = {
    Realtime: 'bg-violet-100 text-violet-700',
    Schedule: 'bg-blue-100 text-blue-700',
  };

  const icons: Record<BackupType, ReactNode> = {
    Realtime: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
        <circle cx='12' cy='12' r='10' />
        <circle cx='12' cy='12' r='3' fill='currentColor' stroke='none' />
      </svg>
    ),
    Schedule: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
        <circle cx='12' cy='12' r='10' />
        <polyline points='12 6 12 12 16 14' />
      </svg>
    ),
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[type]}`}>
      {icons[type]}
      {type}
    </span>
  );
}

type DropdownMenuItem = {
  label: string;
  danger?: boolean;
  onClick?: () => void;
};

function ActionDropdown({ items }: { items: DropdownMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className='relative' ref={ref}>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex items-center justify-center rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
        aria-label='Row actions'
      >
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
          <circle cx='12' cy='5' r='1' fill='currentColor' />
          <circle cx='12' cy='12' r='1' fill='currentColor' />
          <circle cx='12' cy='19' r='1' fill='currentColor' />
        </svg>
      </button>

      {open && (
        <div className='absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'>
          {items.map((item) => (
            <button
              key={item.label}
              type='button'
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              className={[
                'flex w-full items-center px-3 py-2 text-left text-xs font-medium transition',
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


type FilterState = {
  backupType: BackupType | 'All';
  status: BackupStatus | 'All';
};

function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const selectCls =
    'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200';

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3'>
      <Typography variant='bodySm' color='muted' className='mr-1'>
        Filter:
      </Typography>

      <select
        value={filters.backupType}
        onChange={(e) => onChange({ ...filters, backupType: e.target.value as FilterState['backupType'] })}
        className={selectCls}
        aria-label='Filter by backup type'
      >
        <option value='All'>All Types</option>
        <option value='Realtime'>Realtime</option>
        <option value='Schedule'>Schedule</option>
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as FilterState['status'] })}
        className={selectCls}
        aria-label='Filter by status'
      >
        <option value='All'>All Statuses</option>
        <option value='Completed'>Completed</option>
        <option value='Running'>Running</option>
        <option value='Pending'>Pending</option>
        <option value='Failed'>Failed</option>
      </select>

      {(filters.backupType !== 'All' || filters.status !== 'All') && (
        <button
          type='button'
          onClick={() => onChange({ backupType: 'All', status: 'All' })}
          className='text-[10px] font-medium text-blue-600 hover:underline'
        >
          Clear
        </button>
      )}
    </div>
  );
}

export default function BackupManagement() {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ backupType: 'All', status: 'All' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [cursorMap, setCursorMap] = useState<Record<number, string | null>>({ 1: null });

  const backupConfigService = useBackupConfigService();
  const queryClient = useQueryClient();
  const currentCursor = cursorMap[currentPage] ?? null;

  const deleteMutation = useMutation({
    mutationFn: (backupConfigId: string) => backupConfigService.deleteBackupConfig(backupConfigId),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['backup-config-list'] });
      queryClient.invalidateQueries({ queryKey: ['backup-config', 'object-list'] });
    },
  });

  const backupQuery = useQuery({
    queryKey: ['backup-config-list', currentCursor],
    queryFn: () => backupConfigService.listBackupConfigs(true, currentCursor ?? undefined),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const listObject = (backupQuery.data as any)?.data ?? null;
  const apiDataArray = Array.isArray(listObject) ? listObject : (listObject as any)?.data ?? [];
  const apiMeta = (listObject as any)?.meta ?? (backupQuery.data as any)?.meta ?? {
    limit: 20,
    nextCursor: null,
    totalRecords: apiDataArray.length,
    totalPages: 1,
  };

  useEffect(() => {
    const sourceData = (backupQuery.data as any)?.data;
    if (!sourceData) return;

    const nextCursor = (sourceData as any)?.meta?.nextCursor ?? null;

    if (nextCursor && !Object.values(cursorMap).includes(nextCursor)) {
      setCursorMap((prev) => ({ ...prev, [currentPage + 1]: nextCursor }));
    }
  }, [backupQuery.data, currentPage, cursorMap]);

  const parsedRows: BackupRow[] = (apiDataArray as BackupConfigItem[]).map((item) => {
    const platform: PlatformType =
      item.platform === 'Salesforce' || item.platform === 'HubSpot' || item.platform === 'Zoho'
        ? (item.platform as PlatformType)
        : 'Salesforce';

    return {
      id: item.backupConfigId,
      slug: item.slug,
      name: item.name,
      platform,
      status: item.backupStatus === 'SUCCESS' ? 'Completed' : item.backupStatus === 'RUNNING' ? 'Running' : item.backupStatus === 'PENDING' ? 'Pending' : item.backupStatus === 'FAILED' ? 'Failed' : 'Pending',
      backupType: item.schedule === 'REALTIME' ? 'Realtime' : 'Schedule',
      lastRun: item.lastBackupAt ? new Date(item.lastBackupAt).toLocaleString() : '--',
      dataSize: item.sizeInBytes ? `${(item.sizeInBytes / (1024 * 1024)).toFixed(2)} MB` : '--',
    };
  });

  const filteredBackups = parsedRows.filter((row) => {
    if (filters.backupType !== 'All' && row.backupType !== filters.backupType) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    return true;
  });

  const backupColumns: TableColumn<BackupRow>[] = [
    {
      key: 'name',
      header: 'Backup Name',
      render: (row) => (
        <div className='flex min-w-0 items-center gap-3'>
          <PlatformBadge platform={row.platform as PlatformType} size='sm' />
          <Link to={`/backup-management/${row.slug}`} className='whitespace-normal'>
            <Typography as='span' variant='label' color='secondary' className='underline hover:text-blue-600'>
              {row.name}
            </Typography>
          </Link>
        </div>
      ),
    },
    {
      key: 'platform',
      header: 'Platform',
      className: 'text-xs text-gray-500',
      render: (row) => row.platform,
    },
    {
      key: 'backupType',
      header: 'Backup Type',
      render: (row) => <BackupTypeBadge type={row.backupType} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'lastRun',
      header: 'Last Run',
      className: 'text-xs text-gray-500',
      render: (row) => row.lastRun,
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      className: 'text-xs text-gray-500',
      render: (row) => row.dataSize,
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <div className='flex items-center gap-2 text-gray-400'>
          <Link to={`/backup-management/${row.slug}`} className='transition hover:text-gray-600' aria-label='View details'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
              <circle cx='12' cy='12' r='3' />
            </svg>
          </Link>
          <ActionDropdown
            key={row.id}
            items={[
              { label: 'Run Now' },
              { label: 'Pause' },
              { label: 'Manage' },
              { label: 'Delete', danger: true, onClick: () => setDeleteTarget({ id: row.id, name: row.name }) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className='flex w-full min-w-0 flex-col gap-5'>
      <section className='rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm'>
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div>
            <Typography as='h2' variant='pageTitle'>
              Backup Management
            </Typography>
            <Typography className='mt-1' variant='body' color='muted'>
              Track schedules, performance, and intervention points across every protected workload.
            </Typography>
          </div>

          <button
            type='button'
            onClick={() => setIsCreatingBackup(true)}
            className='inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'
          >
            + New Backup
          </button>
        </div>
      </section>

      <div className='rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm'>
        <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-4'>
          Jobs Status
        </Typography>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <MetricCard label='Completed Job' value='124' note='+ 6 Jobs vs yesterday' />
          <MetricCard label='Running Jobs' value='03' note='All within SLA' tone='success' withBar />
          <MetricCard label='Failed Jobs' value='01' note='Requires Intervention' tone='danger' />
          <MetricCard label='Data Processed' value='1.6 TB' note='+11% this week' />
        </div>
      </div>

      <Panel title='All Backups'>
        <FilterBar filters={filters} onChange={setFilters} />

        {backupQuery.isLoading ? (
          <div className='p-8 text-center text-gray-500'>Loading backup configs...</div>
        ) : backupQuery.isError ? (
          <div className='p-8 text-center text-red-500'>Failed to load backup configs.</div>
        ) : (
          <Table
            columns={backupColumns}
            rows={filteredBackups}
            getRowKey={(row) => row.id}
            rowClassName='border-t border-gray-100'
            minWidthClassName='min-w-[960px]'
            pagination={{
              currentPage,
              pageSize: apiMeta.limit ?? 10,
              totalRecords: apiMeta.totalRecords ?? filteredBackups.length,
              onPageChange: (nextPage) => {
                if (nextPage <= 0) return;
                if (nextPage === currentPage) return;

                const nextCursor = cursorMap[nextPage];
                if (nextCursor !== undefined) {
                  setCurrentPage(nextPage);
                  return;
                }

                const foundNextCursor = apiMeta.nextCursor;
                if (foundNextCursor && nextPage === currentPage + 1) {
                  setCursorMap((prev) => ({ ...prev, [nextPage]: foundNextCursor }));
                  setCurrentPage(nextPage);
                }
              },
            }}
          />
        )}
      </Panel>

      <AddBackupModal
        isOpen={isCreatingBackup}
        onClose={() => setIsCreatingBackup(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backup-config-list'] })}
      />

      <WarningDialog
        isOpen={!!deleteTarget}
        title='Delete Backup'
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and all associated job history will be permanently removed.`}
        confirmLabel='Delete'
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)}
        onCancel={() => { setDeleteTarget(null); deleteMutation.reset(); }}
      />
    </div>
  );
}
