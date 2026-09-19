import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../services/backup-config/backup-config.service';
import { formatBytes } from '../../utils';
import Table from '../../components/Table';
import type { TableColumn } from '../../components/Table';
import Typography from '../../components/Typography';
import dayjs from 'dayjs';

import DashFrame   from '../../assets/icons/DataVault Dashboard/Frame.svg';
import DashFrame1  from '../../assets/icons/DataVault Dashboard/Frame-1.svg';
import DashFrame2  from '../../assets/icons/DataVault Dashboard/Frame-2.svg';
import DashFrame3  from '../../assets/icons/DataVault Dashboard/Frame-3.svg';
import DashFrame4  from '../../assets/icons/DataVault Dashboard/Frame-4.svg';
import DashFrame5  from '../../assets/icons/DataVault Dashboard/Frame-5.svg';
import DashFrame6  from '../../assets/icons/DataVault Dashboard/Frame-6.svg';
import DashFrame7  from '../../assets/icons/DataVault Dashboard/Frame-7.svg';
import DashFrame8  from '../../assets/icons/DataVault Dashboard/Frame-8.svg';
import DashFrame9  from '../../assets/icons/DataVault Dashboard/Frame-9.svg';
import DashFrame10 from '../../assets/icons/DataVault Dashboard/Frame-10.svg';
import DashFrame11 from '../../assets/icons/DataVault Dashboard/Frame-11.svg';
import DashFrame12 from '../../assets/icons/DataVault Dashboard/Frame-12.svg';
import DashFrame13 from '../../assets/icons/DataVault Dashboard/Frame-13.svg';
import DashFrame14 from '../../assets/icons/DataVault Dashboard/Frame-14.svg';
import DashFrame15 from '../../assets/icons/DataVault Dashboard/Frame-15.svg';
import DashFrame16 from '../../assets/icons/DataVault Dashboard/Frame-16.svg';
import DashFrame17 from '../../assets/icons/DataVault Dashboard/Frame-17.svg';

const floatingFrames = [
  { src: DashFrame4,  size: 128, x: '49%', y: '21%' },
  { src: DashFrame5,  size: 128, x: '79%', y: '30%' },
  { src: DashFrame2,  size: 128, x: '22%', y: '31%' },
  { src: DashFrame3,  size: 70,  x: '36%', y: '29%' },
  { src: DashFrame6,  size: 98,  x: '24%', y: '15%' },
  { src: DashFrame7,  size: 89,  x: '47%', y: '13%' },
  { src: DashFrame8,  size: 84,  x: '73%', y: '20%' },
  { src: DashFrame9,  size: 98,  x: '29%', y: '26%' },
  { src: DashFrame10, size: 98,  x: '61%', y: '26%' },
  { src: DashFrame11, size: 74,  x: '62%', y: '20%' },
  { src: DashFrame12, size: 108, x: '81%', y: '17%' },
  { src: DashFrame13, size: 70,  x: '68%', y: '14%' },
  { src: DashFrame14, size: 94,  x: '42%', y: '31%' },
  { src: DashFrame15, size: 67,  x: '43%', y: '21%' },
  { src: DashFrame16, size: 67,  x: '56%', y: '15%' },
  { src: DashFrame17, size: 67,  x: '71%', y: '31%' },
  { src: DashFrame,   size: 102, x: '34%', y: '14%' },
  { src: DashFrame1,  size: 98,  x: '17%', y: '18%' },
];

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = 'backup' | 'archive' | 'restore';

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status?: string): { label: string; bg: string; color: string } {
  const s = (status ?? '').toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'DONE')
    return { label: 'Completed', bg: '#DCFCE7', color: '#16A34A' };
  if (s === 'FAILED') return { label: 'Failed', bg: '#FEE2E2', color: '#DC2626' };
  if (s === 'RUNNING' || s === 'IN_PROGRESS') return { label: 'Running', bg: '#DBEAFE', color: '#155DFC' };
  if (s === 'PENDING') return { label: 'Pending', bg: '#FEF9C3', color: '#A16207' };
  if (s === 'PARTIAL') return { label: 'Partial', bg: 'rgba(234,179,8,0.12)', color: '#A16207' };
  if (s === 'DRAFT') return { label: 'Draft', bg: '#F3F4F6', color: '#6B7280' };
  return { label: status || 'Unknown', bg: '#F3F4F6', color: '#374151' };
}

function typeBadge(type: 'backup' | 'archive' | 'restore') {
  const map = {
    backup: { label: 'Backup', bg: '#EFF6FF', color: '#2563EB' },
    archive: { label: 'Archive', bg: '#F5F3FF', color: '#7C3AED' },
    restore: { label: 'Restore', bg: '#F0FDF4', color: '#16A34A' },
  };
  return map[type];
}

// ─── shared sub-components ────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub }: {
  icon: ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className='rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm flex items-center gap-2.5 min-w-0'>
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg' style={{ background: 'rgba(21,93,252,0.08)' }}>
        {icon}
      </div>
      <div className='min-w-0'>
        <p className='text-lg font-bold leading-tight text-gray-900'>{value}</p>
        <p className='text-xs text-gray-500 leading-tight'>{label}</p>
        {sub && <p className='text-xs text-gray-400 leading-tight'>{sub}</p>}
      </div>
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const cx = 80, cy = 75, r = 60;
  const progressAngle = (score / 100) * 180;
  const rad = ((180 - progressAngle) * Math.PI) / 180;
  const px = +(cx + r * Math.cos(rad)).toFixed(2);
  const py = +(cy - r * Math.sin(rad)).toFixed(2);
  const la = progressAngle >= 180 ? 1 : 0;
  const color = score >= 90 ? '#22C55E' : score >= 70 ? '#F59E0B' : '#EF4444';
  return (
    <svg viewBox='0 0 160 90' className='w-36 flex-shrink-0'>
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`} fill='none' stroke='#E2E8F0' strokeWidth='10' strokeLinecap='round' />
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 ${la},1 ${px},${py}`} fill='none' stroke={color} strokeWidth='10' strokeLinecap='round' />
      <text x={cx} y={cy - 8} textAnchor='middle' fill='#0F172A' fontSize='22' fontWeight='bold'>{score}</text>
      <text x={cx} y={cy + 8} textAnchor='middle' fill='#64748B' fontSize='11'>/100</text>
    </svg>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function DashboardV2() {
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

  const backupConfigService = useBackupConfigService();

  // Determine which tabs this user can see, then default to the first available
  const hasBackup = permissions.some((p) => p.startsWith('backup'));
  const hasArchive = permissions.some((p) => p.startsWith('archival'));
  const hasRestore = permissions.some((p) => p.startsWith('restore'));

  const defaultTab: Tab = hasBackup ? 'backup' : hasArchive ? 'archive' : 'restore';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [selectedJob, setSelectedJob] = useState<{ job: any; type: Tab } | null>(null);

  // Map UI tab id to the API's module param value
  const tabToModule = (tab: Tab): 'backup' | 'archival' | 'restore' =>
    tab === 'archive' ? 'archival' : tab;

  // ── data fetching ──────────────────────────────────────────────────────────
  // Fetch jobs for the active tab (drives the table)
  const { data: jobsData, isLoading: isJobsLoading } = useQuery({
    queryKey: ['dashv2-last-jobs', activeTab],
    queryFn: () => backupConfigService.getLastJobs(tabToModule(activeTab)),
    staleTime: 0,
  });

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['dashv2-overview', activeTab],
    queryFn: () => backupConfigService.getDashboardOverview(tabToModule(activeTab)),
    staleTime: 0,
  });

  // Fetch jobs for all available tabs to determine if the welcome screen should show
  const { data: bkpJobsData, isLoading: isBkpJobsLoading } = useQuery({
    queryKey: ['dashv2-last-jobs', 'backup'],
    queryFn: () => backupConfigService.getLastJobs('backup'),
    enabled: hasBackup,
    staleTime: 0,
  });
  const { data: archJobsData, isLoading: isArchJobsLoading } = useQuery({
    queryKey: ['dashv2-last-jobs', 'archival'],
    queryFn: () => backupConfigService.getLastJobs('archival'),
    enabled: hasArchive,
    staleTime: 0,
  });
  const { data: rstJobsData, isLoading: isRstJobsLoading } = useQuery({
    queryKey: ['dashv2-last-jobs', 'restore'],
    queryFn: () => backupConfigService.getLastJobs('restore'),
    enabled: hasRestore,
    staleTime: 0,
  });

  const isLoading = isJobsLoading || isOverviewLoading ||
    (hasBackup && isBkpJobsLoading) ||
    (hasArchive && isArchJobsLoading) ||
    (hasRestore && isRstJobsLoading);

  // ── derived values ─────────────────────────────────────────────────────────
  const parseJobs = (data: any): any[] =>
    Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  // Active tab jobs (drives the table)
  const allJobs: any[] = parseJobs(jobsData);

  // Total jobs across all available tabs — used to decide welcome vs dashboard
  const totalJobsAcrossAllTabs =
    (hasBackup  ? parseJobs(bkpJobsData).length  : 0) +
    (hasArchive ? parseJobs(archJobsData).length : 0) +
    (hasRestore ? parseJobs(rstJobsData).length  : 0);

  const overview = (overviewData as any)?.data ?? {};

  // Backup KPIs: { totalRecords, totalSize, activeBackupConfigs, successBackupStatus, failedBackupStatus, pendingBackupStatus }
  const bkpProtectedRecords = overview?.totalRecords ?? '--';
  const bkpStorageUsed = typeof overview?.totalSize === 'number' ? formatBytes(overview.totalSize) : '--';
  const bkpActiveConfigs = overview?.activeBackupConfigs ?? 0;
  const bkpSuccessStatus = overview?.successBackupStatus ?? 0;
  const bkpFailedStatus  = overview?.failedBackupStatus  ?? 0;
  // Job-level counts (used in the Jobs Summary block)
  const bkpJobSuccess = overview?.jobOverview?.successStatus ?? 0;
  const bkpJobFailed  = overview?.jobOverview?.failedStatus  ?? 0;
  const bkpJobPending = overview?.jobOverview?.pendingStatus ?? 0;
  const bkpJobResolved = bkpJobSuccess + bkpJobFailed;
  const bkpRate = bkpJobResolved > 0 ? ((bkpJobSuccess / bkpJobResolved) * 100).toFixed(1) : '100.0';

  // Archive KPIs: same field names as backup
  const archActiveConfigs = overview?.activeBackupConfigs ?? 0;
  const archRecordsArchived = overview?.totalRecords ?? 0;
  const archStorageUsed = typeof overview?.totalSize === 'number' ? formatBytes(overview.totalSize) : '--';
  const archSuccessStatus = overview?.successBackupStatus ?? 0;
  const archFailedStatus = overview?.failedBackupStatus ?? 0;
  // Job-level counts (used in the Jobs Summary block)
  const archJobSuccess = overview?.jobOverview?.successStatus ?? 0;
  const archJobFailed  = overview?.jobOverview?.failedStatus  ?? 0;
  const archJobPending = overview?.jobOverview?.pendingStatus ?? 0;
  const archJobResolved = archJobSuccess + archJobFailed;
  const archRate = archJobResolved > 0 ? ((archJobSuccess / archJobResolved) * 100).toFixed(1) : '100.0';

  // Restore KPIs: { totalRecords, totalSize, successStatus, failedStatus, pendingStatus }
  const rstTotalRecords = overview?.totalRecords ?? 0;
  const rstStorageUsed = typeof overview?.totalSize === 'number' ? formatBytes(overview.totalSize) : '--';
  const rstSuccessStatus = overview?.successStatus ?? 0;
  const rstFailedStatus = overview?.failedStatus ?? 0;
  const rstPendingStatus = overview?.pendingStatus ?? 0;
  const rstResolvedStatus = rstSuccessStatus + rstFailedStatus;
  const rstRate = rstResolvedStatus > 0 ? ((rstSuccessStatus / rstResolvedStatus) * 100).toFixed(1) : '100.0';

  // ── tab config ─────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; color: string }[] = ([
    { id: 'backup' as Tab, label: 'Backup', color: '#2563EB' },
    { id: 'archive' as Tab, label: 'Archive', color: '#7C3AED' },
    { id: 'restore' as Tab, label: 'Restore', color: '#16A34A' },
  ] as const).filter(({ id }) =>
    (id === 'backup' && hasBackup) ||
    (id === 'archive' && hasArchive) ||
    (id === 'restore' && hasRestore)
  );

  // ── table rows per tab ─────────────────────────────────────────────────────
  const jobRows: { job: any; jtype: 'backup' | 'archive' | 'restore' }[] =
    allJobs.slice(0, 10).map((j: any) => ({ job: j, jtype: activeTab }));

  // ── columns ────────────────────────────────────────────────────────────────
  const columns: TableColumn<{ job: any; jtype: 'backup' | 'archive' | 'restore' }>[] = [
    {
      key: 'name',
      header: 'Job Name',
      width: '180px',
      render: ({ job, jtype }) => {
        const name =
          jtype === 'restore'
            ? (() => {
                const objs: any[] = job.destination?.objects ?? [];
                if (objs.length === 0) return job.name ?? 'Restore Job';
                const first = objs[0].name ?? objs[0].objectApiName ?? 'Object';
                return objs.length > 1 ? `${first} +${objs.length - 1} more` : first;
              })()
            : job.backupConfig?.name ?? job.objectApiName ?? job.name ?? (jtype === 'archive' ? 'Archive Job' : 'Backup Job');
        const initial = (name[0] ?? 'J').toUpperCase();
        const colors = { backup: '#2563EB', archive: '#7C3AED', restore: '#16A34A' };
        return (
          <div className='flex items-center gap-2 overflow-hidden'>
            <div className='w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0'
              style={{ background: colors[jtype] }}>
              {initial}
            </div>
            <span className='text-sm font-light truncate' style={{ color: '#0A0A0A' }}>{name}</span>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: ({ jtype }) => {
        const t = typeBadge(jtype);
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap'
            style={{ background: t.bg, color: t.color }}>
            {t.label}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: ({ job }) => {
        const st = statusBadge(job.status);
        return (
          <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap'
            style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'Date & Time',
      render: ({ job }) => {
        const ts = job.startedAt ?? job.createdAt ?? null;
        return (
          <span className='text-sm font-light whitespace-nowrap' style={{ color: '#0A0A0A' }}>
            {ts ? dayjs(ts).format('MMM D, YYYY h:mm A') : '--'}
          </span>
        );
      },
    },
    {
      key: 'duration',
      header: 'Duration',
      render: ({ job }) => {
        const start = job.startedAt ? dayjs(job.startedAt) : null;
        const end = job.completedAt ? dayjs(job.completedAt) : null;
        const ms = start && end ? end.diff(start, 'ms') : null;
        const dur = ms !== null
          ? ms < 60000 ? `${Math.floor(ms / 1000)}s` : `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
          : '--';
        return <span className='text-sm font-light whitespace-nowrap' style={{ color: '#0A0A0A' }}>{dur}</span>;
      },
    },
    {
      key: 'size',
      header: 'Data Size',
      render: ({ job }) => {
        const bytes = (job.object || []).reduce((s: number, o: any) => s + (o.sizeInBytes || 0), 0)
          || job.sizeInBytes || 0;
        return (
          <span className='text-sm font-light whitespace-nowrap' style={{ color: '#0A0A0A' }}>
            {bytes > 0 ? formatBytes(bytes) : '--'}
          </span>
        );
      },
    },
  ];

  // ── KPIs per tab ───────────────────────────────────────────────────────────
  const kpiCards: { icon: ReactNode; label: string; value: string; sub?: string }[] = (() => {
    const RateIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>;
    const StorageIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' /><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' /></svg>;
    const ActiveIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><rect x='2' y='7' width='20' height='14' rx='2' /><path d='M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' /></svg>;
    const RecordsIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M22 12h-4l-3 9L9 3l-3 9H2' /></svg>;

    if (activeTab === 'backup') return [
      { icon: RecordsIcon, label: 'Protected Records', value: String(bkpProtectedRecords) },
      { icon: StorageIcon, label: 'Storage Used', value: bkpStorageUsed || '--' },
      { icon: RateIcon, label: 'Success Rate', value: `${bkpRate}%` },
      { icon: ActiveIcon, label: 'Active Backup Configs', value: String(bkpActiveConfigs) },
    ];
    if (activeTab === 'archive') return [
      { icon: ActiveIcon, label: 'Active Archive Configs', value: String(archActiveConfigs) },
      { icon: RecordsIcon, label: 'Records Archived', value: String(archRecordsArchived) },
      { icon: StorageIcon, label: 'Storage Used', value: archStorageUsed },
      { icon: RateIcon, label: 'Success Rate', value: `${archRate}%` },
    ];
    if (activeTab === 'restore') return [
      { icon: RecordsIcon, label: 'Total Records', value: String(rstTotalRecords) },
      { icon: RateIcon, label: 'Success Rate', value: `${rstRate}%` },
      { icon: ActiveIcon, label: 'Pending', value: String(rstPendingStatus) },
      { icon: StorageIcon, label: 'Storage Used', value: rstStorageUsed },
    ];
    // fallback (backup)
    return [
      { icon: RecordsIcon, label: 'Protected Records', value: String(bkpProtectedRecords) },
      { icon: StorageIcon, label: 'Storage Used', value: bkpStorageUsed || '--' },
      { icon: RateIcon, label: 'Success Rate', value: `${bkpRate}%` },
      { icon: ActiveIcon, label: 'Active Backup Configs', value: String(bkpActiveConfigs) },
    ];
  })();

  // ── right-column stats per tab ─────────────────────────────────────────────
  const healthScore = (() => {
    if (activeTab === 'restore') return Number(rstRate);
    if (activeTab === 'archive') return Number(archRate);
    return Number(bkpRate);
  })();

  const summaryRows: { label: string; value: number; color: string; bg: string }[] = (() => {
    if (activeTab === 'restore') return [
      { label: 'Success', value: rstSuccessStatus, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Pending', value: rstPendingStatus, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { label: 'Failed', value: rstFailedStatus, color: 'text-red-600', bg: 'bg-red-50' },
    ];
    if (activeTab === 'archive') return [
      { label: 'Success', value: archJobSuccess, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Pending', value: archJobPending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { label: 'Failed', value: archJobFailed, color: 'text-red-600', bg: 'bg-red-50' },
    ];
    return [
      { label: 'Success', value: bkpJobSuccess, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Pending', value: bkpJobPending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
      { label: 'Failed',  value: bkpJobFailed,  color: 'text-red-600',   bg: 'bg-red-50'   },
    ];
  })();

  const healthDots: { label: string; value: number; color: string; dot: string }[] = (() => {
    if (activeTab === 'restore') return [
      { label: 'Successful Restores', value: rstSuccessStatus, color: 'text-green-600', dot: '#16A34A' },
      { label: 'Pending Restores', value: rstPendingStatus, color: 'text-yellow-600', dot: '#F59E0B' },
      { label: 'Failed Restores', value: rstFailedStatus, color: rstFailedStatus > 0 ? 'text-red-600' : 'text-gray-400', dot: rstFailedStatus > 0 ? '#DC2626' : '#9CA3AF' },
    ];
    if (activeTab === 'archive') return [
      { label: 'Active Archive Configs', value: archActiveConfigs, color: 'text-blue-600', dot: '#3B82F6' },
      { label: 'Success Status', value: archSuccessStatus, color: 'text-green-600', dot: '#16A34A' },
      { label: 'Failed Status', value: archFailedStatus, color: archFailedStatus > 0 ? 'text-red-600' : 'text-gray-400', dot: archFailedStatus > 0 ? '#DC2626' : '#9CA3AF' },
    ];
    return [
      { label: 'Active Backup Configs', value: bkpActiveConfigs,  color: 'text-blue-600',  dot: '#3B82F6' },
      { label: 'Success Status',         value: bkpSuccessStatus, color: 'text-green-600', dot: '#16A34A' },
      { label: 'Failed Status',          value: bkpFailedStatus,  color: bkpFailedStatus > 0 ? 'text-red-600' : 'text-gray-400', dot: bkpFailedStatus > 0 ? '#DC2626' : '#9CA3AF' },
    ];
  })();

  const rateLabel = `${healthScore.toFixed(1)}%`;

  // ── loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <div className='animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600' />
      </div>
    );
  }

  // ── empty / welcome state — only when NO jobs exist across any module ────────
  if (totalJobsAcrossAllTabs === 0) {
    const allCtaBtns: { label: string; route: string; icon: ReactNode; bg: string; color: string }[] = [
      ...(hasBackup ? [{
        label: 'Start Backup →',
        route: '/backup-management/add',
        icon: <svg width='18' height='18' fill='none' stroke='white' strokeWidth='2' viewBox='0 0 24 24'><polyline points='16 16 12 12 8 16'/><line x1='12' y1='12' x2='12' y2='21'/><path d='M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3'/></svg>,
        bg: '#155DFC', color: '#ffffff',
      }] : []),
      ...(hasArchive ? [{
        label: 'Start Archive →',
        route: '/archive-vault/new',
        icon: <svg width='18' height='18' fill='none' stroke='white' strokeWidth='2' viewBox='0 0 24 24'><polyline points='21 8 21 21 3 21 3 8'/><rect x='1' y='3' width='22' height='5'/><line x1='10' y1='12' x2='14' y2='12'/></svg>,
        bg: '#7C3AED', color: '#ffffff',
      }] : []),
      ...(hasRestore ? [{
        label: 'Start Restore →',
        route: '/restore-center?action=new',
        icon: <svg width='18' height='18' fill='none' stroke='white' strokeWidth='2' viewBox='0 0 24 24'><polyline points='1 4 1 10 7 10'/><path d='M3.51 15a9 9 0 1 0 .49-4.5'/></svg>,
        bg: '#16A34A', color: '#ffffff',
      }] : []),
    ];

    return (
      <div
        className='relative flex flex-1 flex-col overflow-hidden rounded-xl'
        style={{ background: 'radial-gradient(circle at 60% 75%, #155DFC 0%, #ffffff 100%)', backgroundBlendMode: 'screen', backgroundColor: '#F8FAFC', minHeight: '100%' }}
      >
        <div className='absolute inset-0 pointer-events-none overflow-hidden'>
          {floatingFrames.map((f, i) => (
            <img key={i} src={f.src} alt='' className='absolute object-contain'
              style={{ width: f.size, height: f.size, left: f.x, top: f.y, transform: 'translate(-50%, -50%)', opacity: 0.55 }} />
          ))}
        </div>
        <div className='relative z-10 flex flex-1 flex-col items-center justify-center text-center px-6'>
          <h1 className='font-bold leading-snug mb-2' style={{ color: '#33363F', fontSize: 32, lineHeight: '34px' }}>
            Welcome {userName}!
          </h1>
          <p className='mb-10' style={{ color: '#64748B', fontSize: 22, fontWeight: 400, lineHeight: '34px', maxWidth: 700 }}>
            Get started by protecting your data with Backup, Archive or Restore.
          </p>
          <div className='flex items-center gap-4 flex-wrap justify-center'>
            {allCtaBtns.map((btn) => (
              <button
                key={btn.label}
                onClick={() => navigate(btn.route)}
                style={{ width: 220, height: 58, background: btn.bg, borderRadius: 6, color: btn.color, fontSize: 16, fontWeight: 400, border: 'none', cursor: 'pointer', boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>

      {/* Top area */}
      <div className='flex-shrink-0 flex flex-col gap-3 p-4 sm:p-5 pb-0'>

        {/* Header */}
        <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm'>
          <div>
            <Typography as='h2' variant='pageTitle'>Dashboard</Typography>
            <Typography variant='bodySm' color='muted' className='mt-0.5'>
              Hi {userName} — here's your DataCraft overview across Backup, Archive & Restore.
            </Typography>
          </div>
          <div className='flex items-center gap-2 flex-wrap justify-end'>
            <button
              type='button'
              onClick={() => navigate('/backup-management/add')}
              className='inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 whitespace-nowrap'
            >
              + New Backup
            </button>
            {permissions.some((p) => p.startsWith('archival')) && (
              <button
                type='button'
                onClick={() => navigate('/archive-vault/new')}
                className='inline-flex items-center gap-2 rounded-lg border border-purple-500 px-3 py-2 text-xs font-semibold text-purple-600 transition hover:bg-purple-50 whitespace-nowrap'
              >
                + New Archive
              </button>
            )}
            {permissions.some((p) => p.startsWith('restore')) && (
              <button
                type='button'
                onClick={() => navigate('/restore-center?action=new')}
                className='inline-flex items-center gap-2 rounded-lg border border-green-600 px-3 py-2 text-xs font-semibold text-green-600 transition hover:bg-green-50 whitespace-nowrap'
              >
                + New Restore
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className='flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-1.5'>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const accent = tab.color;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className='px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap'
                style={{
                  background: isActive ? `${accent}14` : 'transparent',
                  color: isActive ? accent : '#64748B',
                  border: isActive ? `1.5px solid ${accent}30` : '1.5px solid transparent',
                }}
              >
                {tab.label}
              </button>
            );
          })}

        </div>

        {/* KPI row */}
        <div className='grid grid-cols-4 gap-3'>
          {kpiCards.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>

      {/* Main 2-column area */}
      <div
        className='grid gap-3 flex-1 min-h-0 px-4 sm:px-5 py-3'
        style={{ gridTemplateColumns: '1fr 272px', alignItems: 'stretch' }}
      >
        {/* Jobs table */}
        <section className='flex flex-col min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-gray-100 px-5 py-2 flex-shrink-0'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Recent Jobs</Typography>
            <button
              onClick={() => {
                if (activeTab === 'archive') navigate('/archive-vault');
                else if (activeTab === 'restore') navigate('/restore-center');
                else navigate('/backup-management');
              }}
              className='text-xs font-medium text-blue-600 hover:underline'
            >
              View all →
            </button>
          </div>

          <Table<{ job: any; jtype: 'backup' | 'archive' | 'restore' }>
            borderless
            loading={false}
            rows={jobRows}
            getRowKey={(r) => r.job.backupJobId ?? r.job.restoreJobId ?? r.job.id ?? Math.random().toString()}
            onRowClick={(r) => setSelectedJob({ job: r.job, type: r.jtype })}
            rowClassName='border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer'
            cellPaddingClassName='px-4 py-2.5'
            emptyState={
              <div className='flex flex-col items-center justify-center gap-2 py-8'>
                <span className='text-sm font-medium text-gray-500'>No {activeTab} jobs yet.</span>
                <button
                  onClick={() => navigate(activeTab === 'archive' ? '/archive-vault/new' : activeTab === 'restore' ? '/restore-center?action=new' : '/backup-management/add')}
                  className='text-xs font-semibold text-blue-600 hover:underline'
                >
                  Create your first {activeTab} →
                </button>
              </div>
            }
            columns={columns}
          />

          <div className='flex-shrink-0 border-t border-gray-100 px-5 py-2'>
            <span className='text-xs text-gray-500'>
              Showing {jobRows.length} most recent {activeTab} jobs
            </span>
          </div>
        </section>

        {/* Right column — overflow-hidden so cards can't spill below grid row */}
        <div className='flex flex-col gap-3 min-h-0 overflow-hidden'>

          {/* System Health */}
          <section className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3 flex-1 flex flex-col min-h-0 overflow-hidden'>
            <div className='flex items-center justify-between mb-1.5'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>System Health</Typography>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${healthScore >= 90 ? 'bg-green-100 text-green-700' : healthScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${healthScore >= 90 ? 'bg-green-500' : healthScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                {healthScore >= 90 ? 'Healthy' : healthScore >= 70 ? 'Degraded' : 'Critical'}
              </span>
            </div>
            <div className='flex justify-center'>
              <HealthGauge score={Math.round(healthScore)} />
            </div>
            <div className='flex flex-col gap-1.5 mt-1'>
              {healthDots.map(({ label, value, color, dot }) => (
                <div key={label} className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='w-2 h-2 rounded-full flex-shrink-0' style={{ background: dot }} />
                    <span className='text-xs text-gray-500'>{label}</span>
                  </div>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Summary */}
          <section className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3 flex-1 flex flex-col min-h-0 overflow-hidden'>
            <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-2'>
              {TABS.find((t) => t.id === activeTab)?.label ?? activeTab} Jobs Summary
            </Typography>
            <div className='flex flex-col gap-2 flex-1 justify-center'>
              {summaryRows.map(({ label, value, color, bg }) => (
                <div key={label} className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500'>{label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color} ${bg}`}>{value}</span>
                </div>
              ))}
              <div className='border-t border-gray-100 pt-2 flex items-center justify-between'>
                <span className='text-xs text-gray-500'>Success Rate</span>
                <span className='text-sm font-bold text-gray-800'>{rateLabel}</span>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Quick-view panel for selected job */}
      {selectedJob && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4'
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
              <div className='flex items-center gap-2'>
                {(() => {
                  const t = typeBadge(selectedJob.type as 'backup' | 'archive' | 'restore');
                  return (
                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold'
                      style={{ background: t.bg, color: t.color }}>
                      {t.label}
                    </span>
                  );
                })()}
                <h3 className='text-sm font-semibold text-gray-900'>Job Details</h3>
              </div>
              <button onClick={() => setSelectedJob(null)} className='text-gray-400 hover:text-gray-600 transition-colors'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M18 6L6 18M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className='px-6 py-5 flex flex-col gap-3'>
              {(() => {
                const j = selectedJob.job;
                const st = statusBadge(j.status);
                const name = j.backupConfig?.name ?? j.name ?? j.objectApiName ?? j.objectName ?? '—';
                const start = j.startedAt ?? j.createdAt;
                const end = j.completedAt;
                const ms = start && end ? dayjs(end).diff(dayjs(start), 'ms') : null;
                const dur = ms !== null
                  ? ms < 60000 ? `${Math.floor(ms / 1000)}s` : `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
                  : '--';
                const bytes = (j.object || []).reduce((s: number, o: any) => s + (o.sizeInBytes || 0), 0) || j.sizeInBytes || 0;
                const rows = [
                  { label: 'Name', value: name },
                  { label: 'Status', value: <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium' style={{ background: st.bg, color: st.color }}>{st.label}</span> },
                  { label: 'Started', value: start ? dayjs(start).format('MMM D, YYYY h:mm A') : '--' },
                  { label: 'Completed', value: end ? dayjs(end).format('MMM D, YYYY h:mm A') : '--' },
                  { label: 'Duration', value: dur },
                  { label: 'Data Size', value: bytes > 0 ? formatBytes(bytes) : '--' },
                ];
                return rows.map(({ label, value }) => (
                  <div key={label} className='flex items-start justify-between gap-4'>
                    <span className='text-xs text-gray-500 flex-shrink-0 w-24'>{label}</span>
                    <span className='text-sm text-gray-900 font-medium text-right'>{value}</span>
                  </div>
                ));
              })()}
            </div>

            {/* Modal footer */}
            <div className='flex justify-end gap-3 px-6 py-4 border-t border-gray-100'>
              <button
                onClick={() => {
                  const j = selectedJob.job;
                  const type = selectedJob.type;
                  setSelectedJob(null);
                  if (type === 'archive') {
                    const slug = j.archivalConfigId ?? j.backupConfig?.slug ?? j.backupConfig?.backupConfigId ?? j.backupConfigId;
                    navigate(slug ? `/archive-vault/${slug}` : '/archive-vault');
                  } else if (type === 'restore') {
                    const jobId = j.restoreJobId ?? j.id;
                    navigate(jobId ? `/restore-center/history/${jobId}` : '/restore-center');
                  } else {
                    const slug = j.backupConfig?.slug ?? j.backupConfig?.backupConfigId ?? j.backupConfigId;
                    navigate(slug ? `/backup-management-v2/details/${slug}` : '/backup-management');
                  }
                }}
                className='text-xs font-semibold px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors'
              >
                View Full Details
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className='text-xs font-semibold px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
