import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Table, { type TableColumn } from '../../components/Table';
import { useBackupConfigService } from '../../services/backup-config/backup-config.service';
import Frame from '../../assets/icons/Frame.svg';
import Frame1 from '../../assets/icons/Frame-1.svg';
import Frame2 from '../../assets/icons/Frame-2.svg';
import Frame3 from '../../assets/icons/Frame-3.svg';
import Frame4 from '../../assets/icons/Frame-4.svg';
import Frame5 from '../../assets/icons/Frame-5.svg';
import Frame6 from '../../assets/icons/Frame-6.svg';
import Frame7 from '../../assets/icons/Frame-7.svg';
import Frame8 from '../../assets/icons/Frame-8.svg';
import Frame9 from '../../assets/icons/Frame-9.svg';
import Frame10 from '../../assets/icons/Frame-10.svg';
import Frame11 from '../../assets/icons/Frame-11.svg';
import Frame12 from '../../assets/icons/Frame-12.svg';
import Frame13 from '../../assets/icons/Frame-13.svg';
import Frame14 from '../../assets/icons/Frame-14.svg';
import Frame15 from '../../assets/icons/Frame-15.svg';
import Frame16 from '../../assets/icons/Frame-16.svg';
import Frame17 from '../../assets/icons/Frame-17.svg';

type StatusType = 'Completed' | 'Running' | 'Scheduled' | 'Failed';

type BackupJob = {
  name: string;
  platform: string;
  status: StatusType;
  lastRun: string;
  duration: string;
  size: string;
};

function StatCardIcon() {
  return (
    <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded bg-teal-50'>
      <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' stroke='#0d9488' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
        <polyline points='14 2 14 8 20 8' />
        <line x1='16' y1='13' x2='8' y2='13' />
        <line x1='16' y1='17' x2='8' y2='17' />
      </svg>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  subNode,
  decoration,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  subNode?: ReactNode;
  decoration?: ReactNode;
  bar?: number;
}) {
  return (
    <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm'>
      {/* Header row */}
      <div className='mb-3 flex items-center gap-1.5'>
        <StatCardIcon />
        <p className='text-xs font-medium text-gray-500'>{label}</p>
      </div>
      {/* Value */}
      <p className='mb-2 text-2xl font-bold text-gray-900'>{value}</p>
      {/* Bottom row: sub text left, decoration right */}
      <div className='flex items-center justify-between'>
        <div>
          {sub && <p className='text-xs font-medium text-green-600'>{sub}</p>}
          {subNode}
        </div>
        {decoration && <div className='shrink-0'>{decoration}</div>}
      </div>
      {/* Optional progress bar */}
      {bar !== undefined && (
        <div className='mt-2 h-1.5 w-full rounded-full bg-gray-100'>
          <div className='h-1.5 rounded-full bg-green-500' style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}

function CircularProgress({ pct, color = '#0d9488' }: { pct: number; color?: string }) {
  const r = 14;
  const c = 2 * Math.PI * r;

  return (
    <svg className='h-10 w-10 -rotate-90'>
      <circle cx='20' cy='20' r={r} fill='none' stroke='#e2e8f0' strokeWidth='3' />
      <circle
        cx='20'
        cy='20'
        r={r}
        fill='none'
        stroke={color}
        strokeWidth='3'
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap='round'
      />
    </svg>
  );
}

function PlatformCard({
  name,
  icon,
  objects,
}: {
  name: string;
  icon: ReactNode;
  objects: number;
}) {
  return (
    <div className='min-w-0 flex-1 rounded-xl border border-dashed border-gray-200 p-3'>
      <div className='mb-3 flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          {icon}
          <span className='text-sm font-semibold text-gray-800'>{name}</span>
        </div>
        <button className='text-lg leading-none text-gray-400 hover:text-gray-600'>...</button>
      </div>
      <p className='mb-1 text-xs text-gray-500'>{objects} Object</p>
      <div className='flex items-center gap-1.5'>
        <span className='h-2 w-2 shrink-0 rounded-full bg-green-500' />
        <span className='text-xs font-medium text-green-600'>Connected</span>
        <span className='text-xs text-gray-400'>2 hrs ago</span>
      </div>
    </div>
  );
}

function SalesforceIcon() {
  return (
    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50'>
      <svg viewBox='0 0 24 24' className='h-5 w-5' fill='#0176d3'>
        <path d='M10 4C8.3 4 7 5.3 7 7c0 .4.1.8.2 1.1C5.9 8.5 5 9.6 5 11c0 1.7 1.3 3 3 3h8c1.7 0 3-1.3 3-3 0-1.3-.8-2.4-2-2.8.1-.4.2-.8.2-1.2 0-1.7-1.3-3-3-3-.5 0-1 .1-1.4.4C12.4 4.2 11.7 4 11 4h-1z' />
      </svg>
    </div>
  );
}

function HubSpotIcon() {
  return (
    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50'>
      <svg viewBox='0 0 24 24' className='h-5 w-5' fill='#ff7a59'>
        <circle cx='12' cy='12' r='3' />
        <line x1='12' y1='4' x2='12' y2='9' stroke='#ff7a59' strokeWidth='2' />
        <line x1='12' y1='15' x2='12' y2='20' stroke='#ff7a59' strokeWidth='2' />
        <line x1='4' y1='12' x2='9' y2='12' stroke='#ff7a59' strokeWidth='2' />
        <line x1='15' y1='12' x2='20' y2='12' stroke='#ff7a59' strokeWidth='2' />
      </svg>
    </div>
  );
}

function ZohoIcon() {
  return (
    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-red-50'>
      <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none'>
        <rect x='3' y='3' width='8' height='8' rx='1.5' fill='#e84b37' />
        <rect x='13' y='3' width='8' height='8' rx='1.5' fill='#f0a500' />
        <rect x='3' y='13' width='8' height='8' rx='1.5' fill='#00b4cc' />
        <rect x='13' y='13' width='8' height='8' rx='1.5' fill='#3aab3a' />
      </svg>
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const cx = 80;
  const cy = 75;
  const r = 60;
  const sx = cx - r;
  const sy = cy;
  const ex = cx + r;
  const ey = cy;
  const progressAngle = (score / 100) * 180;
  const rad = (progressAngle * Math.PI) / 180;
  const angle = Math.PI - rad;
  const px = +(cx + r * Math.cos(angle)).toFixed(2);
  const py = +(cy - r * Math.sin(angle)).toFixed(2);
  const la = progressAngle >= 180 ? 1 : 0;

  return (
    <svg viewBox='0 0 160 90' className='w-44'>
      <path
        d={`M ${sx},${sy} A ${r},${r} 0 0,1 ${ex},${ey}`}
        fill='none'
        stroke='#e2e8f0'
        strokeWidth='10'
        strokeLinecap='round'
      />
      <path
        d={`M ${sx},${sy} A ${r},${r} 0 ${la},1 ${px},${py}`}
        fill='none'
        stroke='#22c55e'
        strokeWidth='10'
        strokeLinecap='round'
      />
      <text x={cx} y={cy - 8} textAnchor='middle' fill='#1e293b' fontSize='22' fontWeight='bold'>
        {score}
      </text>
      <text x={cx} y={cy + 10} textAnchor='middle' fill='#94a3b8' fontSize='11'>
        /100
      </text>
    </svg>
  );
}

const statusStyles: Record<StatusType, string> = {
  Completed: 'bg-green-100 text-green-700',
  Running: 'bg-amber-100 text-amber-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Failed: 'bg-red-100 text-red-600',
};

function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyles[status]}`}>
      <span className='h-1.5 w-1.5 rounded-full bg-current' />
      {status}
    </span>
  );
}

function UpcomingJobItem({
  name,
  time,
  icon,
}: {
  name: string;
  time: string;
  icon: ReactNode;
}) {
  return (
    <div className='flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-0'>
      {icon}
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium text-gray-800'>{name}</p>
        <p className='text-xs text-gray-400'>{time}</p>
      </div>
    </div>
  );
}

const backupJobs: BackupJob[] = [
  { name: 'Salesforce Production Backup', platform: 'Salesforce', status: 'Completed', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'Zoho Production Backup daily', platform: 'Zoho', status: 'Running', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'HubSpot Production Backup', platform: 'HubSpot', status: 'Scheduled', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'HubSpot Production Backup', platform: 'HubSpot', status: 'Failed', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'HubSpot Production Backup', platform: 'HubSpot', status: 'Failed', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'HubSpot Production Backup', platform: 'HubSpot', status: 'Failed', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
];

const backupJobColumns: TableColumn<BackupJob>[] = [
  {
    key: 'name',
    header: 'Job Name',
    render: (job) => (
      <div className='flex items-center gap-2'>
        <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-600'>
          {job.platform[0]}
        </div>
        <span className='text-sm font-medium text-gray-800'>{job.name}</span>
      </div>
    ),
  },
  {
    key: 'platform',
    header: 'Platform',
    className: 'text-sm text-gray-600',
    render: (job) => job.platform,
  },
  {
    key: 'status',
    header: 'Status',
    render: (job) => <StatusBadge status={job.status} />,
  },
  {
    key: 'lastRun',
    header: 'Last Run',
    className: 'text-sm text-gray-600',
    render: (job) => job.lastRun,
  },
  {
    key: 'duration',
    header: 'Duration',
    className: 'text-sm text-gray-600',
    render: (job) => job.duration,
  },
  {
    key: 'size',
    header: 'Data Size',
    className: 'text-sm text-gray-600',
    render: (job) => job.size,
  },
  {
    key: 'action',
    header: 'Action',
    render: () => (
      <div className='flex items-center gap-2 text-gray-400'>
        <button className='transition hover:text-gray-600'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
            <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
            <circle cx='12' cy='12' r='3' />
          </svg>
        </button>
        <button className='transition hover:text-gray-600'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
            <circle cx='12' cy='5' r='1' fill='currentColor' />
            <circle cx='12' cy='12' r='1' fill='currentColor' />
            <circle cx='12' cy='19' r='1' fill='currentColor' />
          </svg>
        </button>
      </div>
    ),
  },
];

const healthChecks = [
  'No failures in last 7 days',
  'Storage Replication Active',
  'Encryption Enabled',
  'No failures (7 days)',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();

  const { data: backupListData } = useQuery({
    queryKey: ['backup-config-list'],
    queryFn: () => backupConfigService.listBackupConfigs(true, undefined),
    staleTime: 60_000,
  });

  const backupList = Array.isArray(backupListData?.data) ? backupListData.data : (backupListData?.data?.data ?? []);
  const hasBackups = backupList && backupList.length > 0;

  useEffect(() => {
    if (!hasBackups) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      };
    }
  }, [hasBackups]);

  if (!hasBackups) {
    const frameImages = [
      Frame,
      Frame1,
      Frame2,
      Frame3,
      Frame4,
      Frame5,
      Frame6,
      Frame7,
      Frame8,
      Frame9,
      Frame10,
      Frame11,
      Frame12,
      Frame13,
      Frame14,
      Frame15,
      Frame16,
      Frame17,
    ];

    return (
      <div className='w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-white'>
        {/* Background Icons Pattern */}
        <div className='absolute inset-0 pointer-events-none overflow-hidden'>
          <div className='grid grid-cols-6 gap-8 p-8 opacity-20'>
            {frameImages.map((imgSrc, i) => (
              <div key={i} className='aspect-square flex items-center justify-center'>
                <img
                  src={imgSrc}
                  alt={`decoration-${i}`}
                  className='w-20 h-20 object-contain'
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className='relative z-10 text-center max-w-md'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>Welcome User !</h1>
          <p className='text-lg text-gray-600 mb-8'>
            Currently you dont have any backup to get started with your dashboard !
          </p>
          <button
            onClick={() => navigate('/backup-management')}
            className='inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors'
          >
            Lets Start Backup
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      <h2 className='text-lg font-bold text-gray-800'>Dashboard Overview</h2>

      <div className='grid grid-cols-4 gap-4'>
        <StatCard label='Protected Records' value='2.2B' sub='+2.1% vs last week' />

        <StatCard label='Storage Used' value='2.2 TB' sub='+2.5% vs last week' bar={68} />

        <StatCard
          label='Backup Success Rate'
          value='99.98%'
          sub='Last 7 Day'
          decoration={<CircularProgress pct={99.98} color='#0d9488' />}
        />

        <StatCard
          label='Active Jobs'
          value='14'
          subNode={
            <div className='flex items-center gap-1.5'>
              <span className='h-2 w-2 animate-pulse rounded-full bg-green-500' />
              <span className='text-xs font-medium text-green-600'>3 Running</span>
            </div>
          }
          bar={30}
        />
      </div>

      <div className='grid grid-cols-5 gap-4'>
        <div className='col-span-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
          <h3 className='mb-4 text-sm font-semibold text-gray-800'>Connected Platforms</h3>
          <div className='flex gap-3'>
            <PlatformCard name='Salesforce' icon={<SalesforceIcon />} objects={152} />
            <PlatformCard name='HubSpot' icon={<HubSpotIcon />} objects={152} />
            <PlatformCard name='Zoho CRM' icon={<ZohoIcon />} objects={152} />
          </div>
          <button className='mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50'>
            <span className='text-lg leading-none'>+</span> Add Platform
          </button>
        </div>

        <div className='col-span-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
          <h3 className='mb-3 text-sm font-semibold text-gray-800'>System Health</h3>
          <div className='flex flex-col items-center gap-2'>
            <HealthGauge score={97} />
            <span className='inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'>
              <span className='h-1.5 w-1.5 rounded-full bg-green-500' /> Healthy
            </span>
          </div>
          <ul className='mt-4 flex flex-col gap-2'>
            {healthChecks.map((check) => (
              <li key={check} className='flex items-center gap-2 text-xs text-gray-600'>
                <svg viewBox='0 0 24 24' fill='none' stroke='#22c55e' strokeWidth='2.5' strokeLinecap='round' className='h-3.5 w-3.5 shrink-0'>
                  <polyline points='20 6 9 17 4 12' />
                </svg>
                {check}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Jobs Status ── */}
      <div className='rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
        <h3 className='mb-4 text-sm font-semibold text-gray-800'>Jobs Status</h3>
        <div className='grid grid-cols-4 gap-4'>
          {/* Completed */}
          <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm'>
            <p className='text-xs font-medium text-gray-500'>Completed Job</p>
            <p className='mt-1 text-3xl font-bold text-gray-900'>124</p>
            <p className='mt-1.5 text-xs font-medium text-green-600'>+6 Jobs vs yesterday</p>
          </div>

          {/* Running */}
          <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm'>
            <p className='text-xs font-medium text-gray-500'>Running Jobs</p>
            <p className='mt-1 text-3xl font-bold text-gray-900'>03</p>
            <div className='mt-1.5 flex items-center gap-2'>
              <p className='text-xs font-medium text-gray-500'>All within SLA</p>
              <div className='flex flex-1 items-center gap-1'>
                <div className='h-1.5 flex-1 rounded-full bg-gray-100'>
                  <div className='h-1.5 rounded-full bg-green-500' style={{ width: '80%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm'>
            <p className='text-xs font-medium text-red-500'>Failed Jobs</p>
            <p className='mt-1 text-3xl font-bold text-red-500'>01</p>
            <p className='mt-1.5 text-xs font-medium text-red-500'>Requires intervention</p>
          </div>

          {/* Data Processed */}
          <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm'>
            <p className='text-xs font-medium text-gray-500'>Data Processed</p>
            <p className='mt-1 text-3xl font-bold text-gray-900'>1.6 TB</p>
            <p className='mt-1.5 text-xs font-medium text-green-600'>+11% this week</p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-5 gap-4'>
        <div className='col-span-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-gray-100 px-5 py-4'>
            <h3 className='text-sm font-semibold text-gray-800'>Recent Backup Jobs</h3>
            <button className='text-xs text-blue-600 hover:underline'>View All</button>
          </div>
          <Table
            columns={backupJobColumns}
            rows={backupJobs}
            getRowKey={(job, index) => `${job.name}-${job.platform}-${index}`}
            minWidthClassName='min-w-[880px]'
            maxHeightClassName='max-h-[320px]'
          />
        </div>

        <div className='col-span-2 flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm'>
          <h3 className='mb-1 text-sm font-semibold text-gray-800'>Upcoming Jobs</h3>
          <div className='flex-1'>
            <UpcomingJobItem name='Salesforce Backup Full Production' time='02:00 AM Today' icon={<SalesforceIcon />} />
            <UpcomingJobItem name='HubSpot Backup' time='08:00 PM Today' icon={<HubSpotIcon />} />
            <UpcomingJobItem name='Zoho Backup Monthly' time='08:00 PM Today' icon={<ZohoIcon />} />
          </div>
          <div className='mt-4 flex items-center gap-2 border-t border-gray-100 pt-4'>
            <button className='flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-700'>Run All</button>
            <button className='flex-1 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50'>Pause</button>
            <button className='flex-1 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50'>Manage</button>
          </div>
        </div>
      </div>
    </div>
  );
}
