import { useState, useRef, useEffect, type ReactNode } from 'react';
import AddBackupModal, { type PlatformType } from './AddBackupModal';
import Table, { type TableColumn } from '../../components/Table';
import Typography from '../../components/Typography';

type MetricTone = 'default' | 'success' | 'warning' | 'danger';
type BackupStatus = 'Completed' | 'Running' | 'Paused';
type BackupType = 'Realtime' | 'Schedule';

type BackupRow = {
  id: string;
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
}: {
  label: string;
  value: string;
  note: string;
  tone?: MetricTone;
}) {
  const noteStyles: Record<MetricTone, string> = {
    default: 'text-emerald-500',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-orange-500',
  };

  return (
    <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm'>
      <Typography variant='metricLabel' color='muted'>
        {label}
      </Typography>
      <Typography className='mt-1' variant='metricValue'>
        {value}
      </Typography>
      <Typography className={`mt-2 ${noteStyles[tone]}`} variant='metricLabel'>
        {note}
      </Typography>
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
    Paused: 'bg-slate-100 text-slate-600',
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

function PaginationFooter() {
  return (
    <div className='flex flex-col gap-3 px-5 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-end'>
      <Typography as='span' variant='bodySm' color='muted'>
        Showing 4 of 12
      </Typography>
      <div className='flex items-center gap-1'>
        <button type='button' className='flex h-6 min-w-6 items-center justify-center rounded bg-emerald-500 px-2 text-[10px] font-semibold text-white'>
          1
        </button>
        <button type='button' className='flex h-6 min-w-6 items-center justify-center rounded border border-gray-200 px-2 text-[10px] font-medium text-gray-500'>
          2
        </button>
        <button type='button' className='flex h-6 min-w-6 items-center justify-center rounded border border-gray-200 px-2 text-[10px] font-medium text-gray-500'>
          3
        </button>
      </div>
    </div>
  );
}

const allBackups: BackupRow[] = [
  {
    id: 'sf-prod',
    name: 'Salesforce Production Backup',
    platform: 'Salesforce',
    status: 'Completed',
    backupType: 'Realtime',
    lastRun: 'Today, 02:00 AM',
    dataSize: '5.2 GB',
  },
  {
    id: 'sf-uat',
    name: 'Salesforce UAT Backup',
    platform: 'Salesforce',
    status: 'Completed',
    backupType: 'Schedule',
    lastRun: 'Today, 06:00 AM',
    dataSize: '2.2 GB',
  },
  {
    id: 'hubspot-dev',
    name: 'HubSpot Dev Backup',
    platform: 'HubSpot',
    status: 'Running',
    backupType: 'Realtime',
    lastRun: 'Today, 08:00 AM',
    dataSize: '4.2 GB',
  },
  {
    id: 'zoho-prod',
    name: 'Zoho Production Backup',
    platform: 'Zoho',
    status: 'Paused',
    backupType: 'Schedule',
    lastRun: 'Today, 08:00 AM',
    dataSize: '4.2 GB',
  },
];

const ROW_ACTIONS: DropdownMenuItem[] = [
  { label: 'Run Now' },
  { label: 'Pause' },
  { label: 'Manage' },
  { label: 'Delete', danger: true },
];

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
        <option value='Paused'>Paused</option>
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

  const filteredBackups = allBackups.filter((row) => {
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
          <PlatformBadge platform={row.platform} size='sm' />
          <Typography as='span' variant='label' color='secondary' className='whitespace-normal'>
            {row.name}
          </Typography>
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
          <button type='button' className='transition hover:text-gray-600' aria-label='View details'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
              <circle cx='12' cy='12' r='3' />
            </svg>
          </button>
          <ActionDropdown key={row.id} items={ROW_ACTIONS} />
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

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2'>
        <MetricCard label='Completed Job' value='124' note='+ 6 Jobs vs yesterday' />
        <MetricCard label='Running Jobs' value='03' note='All within SLA' tone='success' />
        <MetricCard label='Failed Jobs' value='01' note='Requires Intervention' tone='danger' />
        <MetricCard label='Data Processed' value='1.6 TB' note='+11% this week' />
      </div>

      <Panel title='All Backups'>
        <FilterBar filters={filters} onChange={setFilters} />
        <Table
          columns={backupColumns}
          rows={filteredBackups}
          getRowKey={(row) => row.id}
          rowClassName='border-t border-gray-100'
          minWidthClassName='min-w-[960px]'
        />
        <PaginationFooter />
      </Panel>

      <AddBackupModal isOpen={isCreatingBackup} onClose={() => setIsCreatingBackup(false)} />
    </div>
  );
}
