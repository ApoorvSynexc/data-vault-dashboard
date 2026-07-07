import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Table, { type TableColumn } from '../../components/Table';
import type { PlatformType } from '../BackupManagement/AddBackupModal';
import Typography from '../../components/Typography';
import WarningDialog from '../../components/WarningDialog';
import { useBackupConfigService } from '../../services/backup-config/backup-config.service';
import { formatBytes, formatDateTime } from '../../utils';
import BackupManagementWelcome from './Welcome';

type MetricTone = 'default' | 'success' | 'warning' | 'danger';
type BackupStatus = 'DRAFT' | 'ACTIVE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'PAUSED' | 'RESUMED' | 'RUNNING';
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
  scheduleConfig?: {
    scheduling?: {
      frequency?: string;
    };
  };
  crm?: { name: string; crmName: string };
  destination?: { name: string; type: string };
};

type BackupRow = {
  id: string;
  slug: string;
  name: string;
  platform: PlatformType;
  source: string;
  destination: string;
  status: BackupStatus;
  configStatus: string;
  backupType: BackupType;
  scheduleFrequency: string;
  lastRun: string;
  dataSize: string;
  backupStatus: 'DRAFT' | 'ACTIVE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'PAUSED' | 'RESUMED' | 'RUNNING';
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
    <section className='flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-2.5 flex-shrink-0 overflow-x-auto'>
        <Typography as='h3' variant='sectionTitle' color='secondary' className='flex-shrink-0'>
          {title}
        </Typography>
        {action && <div className='flex items-center gap-2 flex-shrink-0 ml-auto'>{action}</div>}
      </div>
      {children}
    </section>
  );
}

function JobsStatusSection({ service }: { service: { getStats: () => Promise<unknown> } }) {
  const statsQuery = useQuery({
    queryKey: ['backup-config-stats'],
    queryFn: () => service.getStats(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const stats = (statsQuery.data as any)?.data;

  const pad = (n: number) => String(n).padStart(2, '0');

  function extractCount(field: unknown): number {
    if (field == null) return 0;
    if (typeof field === 'number') return field;
    if (typeof field === 'object') {
      const obj = field as Record<string, unknown>;
      const val = obj.count ?? obj.total ?? obj.value ?? Object.values(obj).find((v) => typeof v === 'number');
      return typeof val === 'number' ? val : 0;
    }
    return 0;
  }

  function extractChange(field: unknown): number | null {
    if (field == null || typeof field !== 'object') return null;
    const obj = field as Record<string, unknown>;
    const val = obj.vsYesterday ?? obj.change ?? obj.delta ?? obj.diff ?? obj.yesterdayChange ?? obj.changeCount;
    return typeof val === 'number' ? val : null;
  }


  const dataProcessed = stats?.dataProcessed;
  const dataValue = dataProcessed ? formatBytes(dataProcessed.bytes) : '--';
  const dataNote = dataProcessed?.weeklyChangePercent != null
    ? `${dataProcessed.weeklyChangePercent >= 0 ? '+' : ''}${dataProcessed.weeklyChangePercent}% this week`
    : 'This week';

  const completedChange = extractChange(stats?.completedJobs);
  const completedNote = completedChange != null && completedChange >= 0
    ? `+${completedChange} Jobs vs yesterday`
    : 'No change vs yesterday';
  const completedNoteTone: MetricTone = completedChange != null && completedChange >= 0 ? 'default' : 'warning';

  return (
    <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm'>
      <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-2.5'>
        Jobs Status
      </Typography>
      {statsQuery.isLoading ? (
        <div className='grid grid-cols-4 gap-3'>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm animate-pulse'>
              <div className='h-2.5 w-20 rounded bg-gray-100' />
              <div className='mt-1.5 h-6 w-12 rounded bg-gray-100' />
            </div>
          ))}
        </div>
      ) : statsQuery.isError ? (
        <p className='text-xs text-red-500'>Failed to load job stats.</p>
      ) : (
        <div className='grid grid-cols-4 gap-3'>
          <MetricCard label='Completed Jobs' value={pad(extractCount(stats?.completedJobs))} note={completedNote} noteTone={completedNoteTone} />
          <MetricCard label='Running Jobs' value={pad(extractCount(stats?.runningJobs))} note='All within SLA' tone='success' withBar />
          <MetricCard label='Failed Jobs' value={pad(extractCount(stats?.failedJobs))} note='Requires Intervention' tone={extractCount(stats?.failedJobs) > 0 ? 'danger' : 'default'} />
          <MetricCard label='Data Processed' value={dataValue} note={dataNote} />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone = 'default',
  noteTone,
  withBar = false,
}: {
  label: string;
  value: string;
  note: string;
  tone?: MetricTone;
  noteTone?: MetricTone;
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
    <div className='rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm min-w-0'>
      <Typography variant='metricLabel' color={labelColor[tone]}>
        {label}
      </Typography>
      <Typography className='mt-0.5 truncate !text-xl !leading-7' variant='metricValue' color={valueColor[tone]}>
        {value}
      </Typography>
      {withBar ? (
        <div className='mt-1 flex items-center gap-2'>
          <Typography variant='metricLabel' color={noteColor[noteTone ?? tone]}>
            {note}
          </Typography>
          <div className='h-1.5 flex-1 rounded-full bg-gray-100'>
            <div className='h-1.5 rounded-full bg-green-500' style={{ width: '80%' }} />
          </div>
        </div>
      ) : (
        <Typography className='mt-1' variant='metricLabel' color={noteColor[noteTone ?? tone]}>
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

function ScheduleFrequencyBadge({ frequency }: { frequency: string }) {
  if (frequency === '--') {
    return <span className='inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold text-gray-500'>--</span>;
  }

  const styles: Record<string, string> = {
    'Hourly': 'bg-orange-100 text-orange-700',
    'Daily': 'bg-cyan-100 text-cyan-700',
    'Weekly': 'bg-green-100 text-green-700',
    'Monthly': 'bg-purple-100 text-purple-700',
    'Custom': 'bg-indigo-100 text-indigo-700',
    'Once': 'bg-gray-100 text-gray-700',
  };

  const style = styles[frequency] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${style}`}>
      {frequency}
    </span>
  );
}

function BackupStatusBadge({ backupStatus }: { backupStatus: string }) {
  const styles: Record<string, string> = {
    'DRAFT': 'bg-yellow-100 text-yellow-700',
    'ACTIVE': 'bg-blue-100 text-blue-700',
    'PENDING': 'bg-indigo-100 text-indigo-700',
    'RUNNING': 'bg-indigo-100 text-indigo-700',
    'SUCCESS': 'bg-green-100 text-green-700',
    'FAILED': 'bg-red-100 text-red-700',
    'PAUSED': 'bg-gray-100 text-gray-700',
    'RESUMED': 'bg-purple-100 text-purple-700',
  };

  const labels: Record<string, string> = {
    'DRAFT': 'Draft',
    'ACTIVE': 'Active',
    'PENDING': 'Running',
    'RUNNING': 'Running',
    'SUCCESS': 'Success',
    'FAILED': 'Failed',
    'PAUSED': 'Paused',
    'RESUMED': 'Resumed',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[backupStatus] || styles['PENDING']}`}>
      {labels[backupStatus] || backupStatus}
    </span>
  );
}

function ConfigStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'ACTIVE':   'bg-green-100 text-green-700',
    'INACTIVE': 'bg-gray-100 text-gray-600',
    'PAUSED':   'bg-gray-100 text-gray-600',
    'ERROR':    'bg-red-100 text-red-700',
    'DRAFT':    'bg-yellow-100 text-yellow-700',
  };
  const labels: Record<string, string> = {
    'ACTIVE':   'Active',
    'INACTIVE': 'Inactive',
    'PAUSED':   'Paused',
    'ERROR':    'Error',
    'DRAFT':    'Draft',
  };
  const key = status?.toUpperCase() ?? '';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[key] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[key] ?? status}
    </span>
  );
}

type DropdownMenuItem = {
  label: string;
  danger?: boolean;
  onClick?: () => void;
};

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isFiltered = value !== 'All';
  const activeLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setOpen((v) => !v);
  }

  return (
    <div>
      <button
        ref={btnRef}
        type='button'
        onClick={handleOpen}
        className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
          isFiltered
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
        }`}
      >
        <span className='text-[10px] font-semibold uppercase tracking-wide opacity-60'>{label}:</span>
        <span>{isFiltered ? activeLabel : 'All'}</span>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' className='h-2.5 w-2.5 opacity-50'>
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 9999 }}
          className='min-w-[130px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type='button'
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium transition hover:bg-gray-50 ${
                value === opt.value ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {opt.label}
              {value === opt.value && (
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' className='h-3 w-3 text-blue-600'>
                  <polyline points='20 6 9 17 4 12' />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

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


const JOB_STATUS_VALUES = new Set(['SUCCESS', 'FAILED', 'RUNNING', 'PENDING']);

type FilterState = {
  backupType: BackupType | 'All';
  status: BackupStatus | 'All' | 'REALTIME' | 'SCHEDULED';
  search: string;
};

export default function BackupManagementV2() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({ backupType: 'All', status: 'All', search: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pauseTarget, setPauseTarget] = useState<{ id: string; name: string } | null>(null);
  const [activateTarget, setActivateTarget] = useState<{ id: string; name: string; isRealtime: boolean } | null>(null);
  const [activateAcceptText, setActivateAcceptText] = useState('');
  const [activateAcceptError, setActivateAcceptError] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [cursorMap, setCursorMap] = useState<Record<number, string | null>>({ 1: null });

  const backupConfigService = useBackupConfigService();
  const queryClient = useQueryClient();
  const currentCursor = cursorMap[currentPage] ?? null;

  const deleteMutation = useMutation({
    mutationFn: (backupConfigId: string) => backupConfigService.deleteBackupConfig(backupConfigId),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['backup-config-list-v2'] });
      queryClient.invalidateQueries({ queryKey: ['backup-config', 'object-list'] });
    },
    onError: (error: any) => {
      const raw = error?.message || '';
      const msg = raw.includes('bad_oauth_token') || raw.includes('403')
        ? 'Your Salesforce session has expired. Please go to Connections and reconnect your Salesforce org to continue.'
        : raw || 'Failed to delete backup. Please try again.';
      setDeleteError(msg);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ backupConfigId, backupStatus }: { backupConfigId: string; backupStatus: 'ACTIVE' | 'PAUSED' | 'RESUMED' }) =>
      backupConfigService.updateBackupConfig(backupConfigId, { status: backupStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-config-list-v2'] });
      queryClient.invalidateQueries({ queryKey: ['backup-config', 'object-list'] });
    },
    onError: (error) => {
      console.error('Failed to update backup status:', error);
      alert('Failed to update backup status. Please try again.');
    },
  });

  const queryFn = useCallback(() =>
    backupConfigService.listBackupConfigs(true, currentCursor ?? undefined),
    [currentCursor]
  );

  const backupQuery = useQuery({
    queryKey: ['backup-config-list-v2', currentCursor],
    queryFn,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const responseBody = (backupQuery.data as any)?.data ?? null;
  const apiDataArray: BackupConfigItem[] = Array.isArray(responseBody?.data) ? responseBody.data : [];
  const apiMeta = responseBody?.meta ?? {
    limit: 25,
    nextCursor: null,
    totalRecords: apiDataArray.length,
    totalPages: 1,
  };

  useEffect(() => {
    if (!backupQuery.data) return;

    const nextCursor = (backupQuery.data as any)?.data?.meta?.nextCursor ?? null;

    if (nextCursor && !Object.values(cursorMap).includes(nextCursor)) {
      setCursorMap((prev) => ({ ...prev, [currentPage + 1]: nextCursor }));
    }
  }, [backupQuery.data, currentPage]);

  const getScheduleFrequencyDisplay = (frequency?: string): string => {
    if (!frequency) return '--';
    const freqMap: Record<string, string> = {
      'HOURLY': 'Hourly',
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'MONTHLY': 'Monthly',
      'CUSTOM': 'Custom',
      'ONCE': 'Once',
    };
    return freqMap[frequency] || frequency;
  };

  const parsedRows: BackupRow[] = (apiDataArray as BackupConfigItem[]).map((item) => {
    const platform: PlatformType =
      item.platform === 'Salesforce' || item.platform === 'HubSpot' || item.platform === 'Zoho'
        ? (item.platform as PlatformType)
        : 'Salesforce';

    const source = item.crm?.name ?? item.crm?.crmName ?? platform;
    const destination = item.destination?.name ?? item.destination?.type ?? '--';

    return {
      id: item.backupConfigId,
      slug: item.slug,
      name: item.name,
      platform,
      source,
      destination,
      status: (item.backupStatus as BackupStatus) || 'PENDING',
      configStatus: item.status ?? 'INACTIVE',
      backupType: item.schedule === 'REALTIME' ? 'Realtime' : 'Schedule',
      scheduleFrequency: getScheduleFrequencyDisplay(item.scheduleConfig?.scheduling?.frequency),
      lastRun: formatDateTime(item.lastBackupAt),
      dataSize: formatBytes(item.sizeInBytes),
      backupStatus: (item.backupStatus as BackupStatus) || '' as any,
    };
  });

  const filteredBackups = parsedRows.filter((row) => {
    if (filters.backupType !== 'All' && row.backupType !== filters.backupType) return false;
    if (filters.status !== 'All') {
      if (JOB_STATUS_VALUES.has(filters.status)) {
        if (filters.status === 'RUNNING') {
          if (row.backupStatus !== 'RUNNING' && row.backupStatus !== 'PENDING') return false;
        } else {
          if (row.backupStatus !== filters.status) return false;
        }
      } else {
        if (row.configStatus !== filters.status) return false;
      }
    }
    if (filters.search && !row.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const backupColumns: TableColumn<BackupRow>[] = [
    {
      key: 'name',
      header: 'Backup Name',
      render: (row) => (
        <div className='flex min-w-0 items-center gap-3'>
          <PlatformBadge platform={row.platform as PlatformType} size='sm' />
          <Link to={`/backup-management-v2/details/${row.slug}`} className='whitespace-normal'>
            <Typography as='span' variant='label' color='secondary' className='underline hover:text-blue-600'>
              {row.name}
            </Typography>
          </Link>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      className: 'text-xs text-gray-500',
      render: (row) => row.source,
    },
    {
      key: 'destination',
      header: 'Destination',
      className: 'text-xs text-gray-500',
      render: (row) => row.destination,
    },
    {
      key: 'backupType',
      header: 'Backup Type',
      render: (row) => <BackupTypeBadge type={row.backupType} />,
    },
    {
      key: 'scheduleFrequency',
      header: 'Schedule Type',
      render: (row) => row.backupType === 'Schedule' ? <ScheduleFrequencyBadge frequency={row.scheduleFrequency} /> : <span className='text-gray-400 text-[10px]'>N/A</span>,
    },
    {
      key: 'configStatus',
      header: 'Status',
      render: (row) => <ConfigStatusBadge status={row.configStatus} />,
    },
    {
      key: 'backupStatus',
      header: 'Last Job Status',
      render: (row) => row.backupStatus ? <BackupStatusBadge backupStatus={row.backupStatus} /> : <span className='text-gray-400 text-xs'>--</span>,
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
          <Link to={`/backup-management-v2/details/${row.slug}`} className='transition hover:text-gray-600' aria-label='View details'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
              <circle cx='12' cy='12' r='3' />
            </svg>
          </Link>
          <ActionDropdown
            key={row.id}
            items={[
              ...(row.configStatus === 'DRAFT' ? [{
                label: 'Activate',
                onClick: () => {
                  setActivateAcceptText('');
                  setActivateAcceptError(false);
                  setActivateTarget({ id: row.id, name: row.name, isRealtime: row.backupType === 'Realtime' });
                },
              }] : []),
              ...(row.configStatus !== 'DRAFT' ? [{ label: 'Run Now' }] : []),
              ...(row.configStatus !== 'DRAFT' ? [{
                label: row.configStatus === 'PAUSED' ? 'Resume' : 'Pause',
                onClick: () => {
                  if (row.configStatus === 'PAUSED') {
                    updateStatusMutation.mutate({ backupConfigId: row.id, backupStatus: 'RESUMED' });
                  } else {
                    setPauseTarget({ id: row.id, name: row.name });
                  }
                },
              }] : []),
              { label: 'Edit Policy', onClick: () => navigate(`/backup-management/add?edit=${row.slug}`) },
              { label: 'Delete', danger: true, onClick: () => setDeleteTarget({ id: row.id, name: row.name }) },
            ]}
          />
        </div>
      ),
    },
  ];

  if (!backupQuery.isLoading && !backupQuery.isFetching && responseBody !== null && apiDataArray.length === 0 && filters.status === 'All' && filters.backupType === 'All' && !filters.search) {
    return <BackupManagementWelcome />;
  }

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-5 min-h-0'>
      <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm'>
        <div>
          <Typography as='h2' variant='pageTitle'>
            Backup Management
          </Typography>
          <Typography variant='bodySm' color='muted' className='mt-0.5'>
            Track schedules, performance, and intervention points across every protected workload.
          </Typography>
        </div>
        <button
          type='button'
          onClick={() => navigate('/backup-management/add')}
          className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap'
        >
          + New Backup
        </button>
      </div>

      <JobsStatusSection service={backupConfigService} />

      <Panel
        title='All Backups'
        action={
          <div className='flex items-center gap-2 flex-shrink-0'>
            {/* Search */}
            <div className='relative'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400'>
                <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
              <input
                type='text'
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder='Search by name...'
                className='h-7 w-44 rounded-full border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
              />
            </div>
            <div className='h-5 w-px bg-gray-200' />
            {/* Status dropdown */}
            <FilterDropdown
              label='Status'
              value={JOB_STATUS_VALUES.has(filters.status) ? 'All' : filters.status}
              options={[
                { label: 'All',      value: 'All'      },
                { label: 'Active',   value: 'ACTIVE'   },
                { label: 'Paused',   value: 'PAUSED'   },
                { label: 'Draft',    value: 'DRAFT'    },
                { label: 'Inactive', value: 'INACTIVE' },
              ]}
              onChange={(v) => setFilters((f) => ({ ...f, status: v as FilterState['status'] }))}
            />
            {/* Last Job dropdown */}
            <FilterDropdown
              label='Last Job'
              value={JOB_STATUS_VALUES.has(filters.status) ? filters.status : 'All'}
              options={[
                { label: 'All',     value: 'All'     },
                { label: 'Success', value: 'SUCCESS' },
                { label: 'Failed',  value: 'FAILED'  },
                { label: 'Running', value: 'RUNNING' },
                { label: 'Pending', value: 'PENDING' },
              ]}
              onChange={(v) => setFilters((f) => ({ ...f, status: v as FilterState['status'] }))}
            />
            {/* Type dropdown */}
            <FilterDropdown
              label='Type'
              value={filters.backupType}
              options={[
                { label: 'All',      value: 'All'      },
                { label: 'Realtime', value: 'Realtime' },
                { label: 'Schedule', value: 'Schedule' },
              ]}
              onChange={(v) => setFilters((f) => ({ ...f, backupType: v as FilterState['backupType'] }))}
            />
            {/* Divider */}
            <div className='h-5 w-px bg-gray-200 mx-1' />
            {/* Export CSV */}
            <button
              type='button'
              className='flex h-7 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:border-gray-300 whitespace-nowrap'
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-3.5 w-3.5'>
                <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>
              </svg>
              Export CSV
            </button>
          </div>
        }
      >
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
            borderless
            cellPaddingClassName='px-4 py-2.5'
            paginationClassName='px-5 py-2'
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
            showSerialNumber={true}
          />
        )}
      </Panel>

      <WarningDialog
        isOpen={!!deleteTarget}
        title='Delete Backup'
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and all associated job history will be permanently removed.`}
        confirmLabel='Delete'
        isLoading={deleteMutation.isPending}
        error={deleteError}
        onConfirm={() => { setDeleteError(null); deleteMutation.mutate(deleteTarget!.id); }}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null); deleteMutation.reset(); }}
      />

      <WarningDialog
        isOpen={!!pauseTarget}
        title='Pause Backup'
        message={`Are you sure you want to pause "${pauseTarget?.name}"? The backup will stop running until you resume it.`}
        confirmLabel='Pause'
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => { updateStatusMutation.mutate({ backupConfigId: pauseTarget!.id, backupStatus: 'PAUSED' }); setPauseTarget(null); }}
        onCancel={() => setPauseTarget(null)}
      />

      {/* Activate DRAFT backup acknowledgement dialog */}
      {activateTarget && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden'>
            {/* Header */}
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200'>
              <h2 className='text-lg font-bold text-gray-900'>Activate Backup</h2>
              <button
                onClick={() => { setActivateTarget(null); setActivateAcceptText(''); setActivateAcceptError(false); }}
                className='text-gray-400 hover:text-gray-600 transition-colors'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className='px-6 py-5 space-y-4'>
              {activateTarget.isRealtime && (
                <>
                  <p className='text-sm text-gray-500 mb-4'>DataVault uses Salesforce Apex Triggers to capture record changes instantly and sync them to your backup destination in real time.</p>
                  <p className='text-sm font-semibold text-gray-800 mb-3'>What will happen after you activate this backup configuration:</p>
                  <ul className='text-sm text-gray-700 space-y-3 mb-4'>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span>An <span className='font-semibold'>Apex Trigger</span> will be created on each object you selected to listen for <span className='font-semibold'>insert, update, delete,</span> and <span className='font-semibold'>undelete</span> events.</span></li>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span>A Permission Set named <span className='font-semibold'>DataVaultRealTimeTriggerAccess</span> will be created in your Salesforce org and granted access to the DataVault handler class and the triggers above.</span></li>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span><span className='font-semibold'>Action required:</span> Assign the <span className='font-semibold'>DataVaultRealTimeTriggerAccess</span> Permission Set to all users who create, update, or delete records on the selected objects.</span></li>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span><span className='font-semibold'>Already using Real-Time Backup?</span> No duplicate triggers or permission sets will be created. DataVault will only create triggers for newly added objects.</span></li>
                  </ul>
                  <div className='bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded-r-lg'>
                    <p className='text-sm text-yellow-800'>By activating this configuration, you acknowledge that DataVault will deploy <span className='font-semibold'>Apex Triggers</span> and a <span className='font-semibold'>Permission Set</span> to your connected Salesforce org as described above.</p>
                  </div>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-1'>Confirm to proceed</label>
                    <p className='text-sm text-gray-600 mb-2'>Type <span className='font-semibold'>Accept</span> to acknowledge and activate your Real-Time Backup.</p>
                    <input
                      type='text'
                      value={activateAcceptText}
                      onChange={(e) => { setActivateAcceptText(e.target.value); if (activateAcceptError && e.target.value.toLowerCase() === 'accept') setActivateAcceptError(false); }}
                      placeholder='Type Accept here'
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                        activateAcceptError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {activateAcceptError && <p className='text-sm text-red-600 mt-1'>Please type "Accept" to proceed</p>}
                  </div>
                </>
              )}

              {!activateTarget.isRealtime && (
                <p className='text-sm text-gray-600'>
                  Are you sure you want to activate <span className='font-semibold text-gray-900'>"{activateTarget.name}"</span>? The scheduled backup will start running according to its configured schedule.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className='flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50'>
              <button
                onClick={() => { setActivateTarget(null); setActivateAcceptText(''); setActivateAcceptError(false); }}
                className='px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activateTarget.isRealtime && activateAcceptText.trim().toLowerCase() !== 'accept') {
                    setActivateAcceptError(true);
                    return;
                  }
                  updateStatusMutation.mutate({ backupConfigId: activateTarget.id, backupStatus: 'ACTIVE' });
                  setActivateTarget(null);
                  setActivateAcceptText('');
                  setActivateAcceptError(false);
                }}
                disabled={updateStatusMutation.isPending}
                className='px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                {updateStatusMutation.isPending ? 'Activating...' : 'Activate Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
