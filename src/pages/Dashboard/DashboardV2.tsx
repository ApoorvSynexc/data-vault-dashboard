import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../services/backup-config/backup-config.service';
import { useArchivalService } from '../../services/archival/archival.service';
import { useRestoreService } from '../../services/restore/restore.service';
import { formatBytes } from '../../utils';
import Table from '../../components/Table';
import type { TableColumn } from '../../components/Table';
import Typography from '../../components/Typography';
import dayjs from 'dayjs';

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = 'backup' | 'archive' | 'restore';

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status?: string): { label: string; bg: string; color: string } {
  const s = (status ?? '').toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'DONE')
    return { label: 'Completed', bg: '#DCFCE7', color: '#16A34A' };
  if (s === 'FAILED') return { label: 'Failed', bg: '#FEE2E2', color: '#DC2626' };
  if (s === 'RUNNING') return { label: 'Running', bg: '#DBEAFE', color: '#155DFC' };
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
    <div className='rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center gap-3 min-w-0'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(21,93,252,0.08)' }}>
        {icon}
      </div>
      <div className='min-w-0'>
        <p className='text-xl font-bold leading-tight text-gray-900'>{value}</p>
        <p className='mt-0.5 text-xs text-gray-500 leading-tight'>{label}</p>
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
  const archivalService = useArchivalService();
  const restoreService = useRestoreService();

  // Determine which tabs this user can see, then default to the first available
  const hasBackup = permissions.some((p) => p.startsWith('backup'));
  const hasArchive = permissions.some((p) => p.startsWith('archival'));
  const hasRestore = permissions.some((p) => p.startsWith('restore'));

  const defaultTab: Tab = hasBackup ? 'backup' : hasArchive ? 'archive' : 'restore';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [selectedJob, setSelectedJob] = useState<{ job: any; type: Tab } | null>(null);

  // ── data fetching ──────────────────────────────────────────────────────────
  const { data: jobsData, isLoading: isJobsLoading } = useQuery({
    queryKey: ['dashv2-last-jobs'],
    queryFn: () => backupConfigService.getLastJobs(),
  });

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['dashv2-overview'],
    queryFn: () => backupConfigService.getDashboardOverview(),
  });

  const { data: archivalStatsData, isLoading: isArchivalLoading } = useQuery({
    queryKey: ['dashv2-archival-stats'],
    queryFn: () => archivalService.getStats(),
  });

  const { data: restoreJobsData, isLoading: isRestoreLoading } = useQuery({
    queryKey: ['dashv2-restore-jobs'],
    queryFn: () => restoreService.listRestoreJobs(),
  });

  const { data: restoreStatsData, isLoading: isRestoreStatsLoading } = useQuery({
    queryKey: ['dashv2-restore-stats'],
    queryFn: () => restoreService.getJobStats(),
  });

  const isLoading = isJobsLoading || isOverviewLoading || isArchivalLoading || isRestoreLoading || isRestoreStatsLoading;

  // ── derived values ─────────────────────────────────────────────────────────
  const allJobs: any[] = Array.isArray((jobsData as any)?.data)
    ? (jobsData as any).data
    : Array.isArray(jobsData) ? (jobsData as any) : [];

  const backupJobs = allJobs.filter((j) => (j.type ?? '').toUpperCase() !== 'ARCHIVAL');
  const archiveJobs = allJobs.filter((j) => (j.type ?? '').toUpperCase() === 'ARCHIVAL');

  const restoreRaw = (restoreJobsData as any)?.data?.data ?? (restoreJobsData as any)?.data ?? [];
  const restoreJobs: any[] = Array.isArray(restoreRaw) ? restoreRaw : [];

  const overview = (overviewData as any)?.data ?? {};
  const archivalStats = (archivalStatsData as any)?.data ?? {};
  const restoreStats = (restoreStatsData as any)?.data ?? (restoreStatsData as any) ?? {};

  // Backup KPIs
  const bkpProtectedRecords = overview?.protectedRecords?.value ?? '--';
  const bkpStorageUsed = overview?.storageUsed?.value ?? '--';
  const bkpActiveJobs = overview?.activeJobs?.value ?? 0;
  const bkpActiveBackups = overview?.activeBackups ?? 0;
  const bkpCompletedBackups = overview?.completedBackups ?? 0;
  const bkpFailedBackups = overview?.failedBackups ?? 0;
  const bkpCompletedJobs = overview?.completedJobs ?? 0;
  const bkpRunningJobs = overview?.runningJobs ?? 0;
  const bkpFailedJobs = overview?.failedJobs ?? 0;
  const bkpTotalRuns = bkpCompletedJobs + bkpRunningJobs + bkpFailedJobs;
  const bkpRate = bkpTotalRuns > 0 ? ((bkpCompletedJobs / bkpTotalRuns) * 100).toFixed(1) : '0.0';

  // Archive KPIs
  const archTotalConfigs = archivalStats?.totalConfigs ?? archivalStats?.total ?? '--';
  const archRecordsArchived = archivalStats?.totalRecords ?? archivalStats?.recordsArchived ?? '--';
  const archStorageUsed = archivalStats?.totalSize ?? archivalStats?.storageUsed ?? '--';
  const archActiveConfigs = archivalStats?.activeConfigs ?? archivalStats?.active ?? 0;

  // Restore KPIs
  const rstTotalRestores = restoreStats?.totalRestores ?? restoreStats?.total ?? restoreJobs.length;
  const rstCompleted = restoreStats?.completed ?? restoreJobs.filter((j) => ['COMPLETED', 'SUCCESS', 'DONE'].includes((j.status ?? '').toUpperCase())).length;
  const rstFailed = restoreStats?.failed ?? restoreJobs.filter((j) => (j.status ?? '').toUpperCase() === 'FAILED').length;
  const rstRunning = restoreStats?.running ?? restoreJobs.filter((j) => (j.status ?? '').toUpperCase() === 'RUNNING').length;
  const rstTotal = Number(rstTotalRestores) || 0;
  const rstRate = rstTotal > 0 ? ((Number(rstCompleted) / rstTotal) * 100).toFixed(1) : '0.0';

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
  const jobRows: { job: any; jtype: 'backup' | 'archive' | 'restore' }[] = (() => {
    if (activeTab === 'archive') return archiveJobs.slice(0, 10).map((j) => ({ job: j, jtype: 'archive' as const }));
    if (activeTab === 'restore') return restoreJobs.slice(0, 10).map((j) => ({ job: j, jtype: 'restore' as const }));
    return backupJobs.slice(0, 10).map((j) => ({ job: j, jtype: 'backup' as const }));
  })();

  // ── columns ────────────────────────────────────────────────────────────────
  const columns: TableColumn<{ job: any; jtype: 'backup' | 'archive' | 'restore' }>[] = [
    {
      key: 'name',
      header: 'Job Name',
      width: '180px',
      render: ({ job, jtype }) => {
        const name =
          jtype === 'restore'
            ? (job.name ?? job.objectName ?? job.restoreId ?? 'Restore Job')
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
    const ArchiveIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><polyline points='21 8 21 21 3 21 3 8' /><rect x='1' y='3' width='22' height='5' /><line x1='10' y1='12' x2='14' y2='12' /></svg>;
    const RestoreIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><polyline points='1 4 1 10 7 10' /><path d='M3.51 15a9 9 0 1 0 .49-4.5' /></svg>;
    const RateIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>;
    const StorageIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' /><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' /></svg>;
    const ActiveIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><rect x='2' y='7' width='20' height='14' rx='2' /><path d='M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' /></svg>;
    const RecordsIcon = <svg viewBox='0 0 24 24' className='w-5 h-5' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M22 12h-4l-3 9L9 3l-3 9H2' /></svg>;

    if (activeTab === 'backup') return [
      { icon: RecordsIcon, label: 'Protected Records', value: String(bkpProtectedRecords) },
      { icon: StorageIcon, label: 'Storage Used', value: bkpStorageUsed || '--' },
      { icon: RateIcon, label: 'Success Rate', value: `${bkpRate}%` },
      { icon: ActiveIcon, label: 'Active Jobs', value: String(bkpActiveJobs) },
    ];
    if (activeTab === 'archive') return [
      { icon: ArchiveIcon, label: 'Total Archive Configs', value: String(archTotalConfigs) },
      { icon: RecordsIcon, label: 'Records Archived', value: String(archRecordsArchived) },
      { icon: StorageIcon, label: 'Storage Used', value: typeof archStorageUsed === 'number' ? formatBytes(archStorageUsed) : String(archStorageUsed) },
      { icon: ActiveIcon, label: 'Active Archives', value: String(archActiveConfigs) },
    ];
    if (activeTab === 'restore') return [
      { icon: RestoreIcon, label: 'Total Restores', value: String(rstTotalRestores) },
      { icon: RateIcon, label: 'Success Rate', value: `${rstRate}%` },
      { icon: ActiveIcon, label: 'Active Restores', value: String(rstRunning) },
      { icon: RecordsIcon, label: 'Completed', value: String(rstCompleted) },
    ];
    // fallback (backup)
    return [
      { icon: RecordsIcon, label: 'Protected Records', value: String(bkpProtectedRecords) },
      { icon: StorageIcon, label: 'Storage Used', value: bkpStorageUsed || '--' },
      { icon: RateIcon, label: 'Success Rate', value: `${bkpRate}%` },
      { icon: ActiveIcon, label: 'Active Jobs', value: String(bkpActiveJobs) },
    ];
  })();

  // ── right-column stats per tab ─────────────────────────────────────────────
  const healthScore = (() => {
    if (activeTab === 'restore') return Number(rstRate);
    if (activeTab === 'archive') return 100;
    return Number(bkpRate);
  })();

  const summaryRows: { label: string; value: number; color: string; bg: string }[] = (() => {
    if (activeTab === 'restore') return [
      { label: 'Completed', value: Number(rstCompleted), color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Running', value: Number(rstRunning), color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Failed', value: Number(rstFailed), color: 'text-red-600', bg: 'bg-red-50' },
    ];
    if (activeTab === 'archive') return [
      { label: 'Active', value: Number(archActiveConfigs), color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Total', value: Number(archTotalConfigs), color: 'text-gray-700', bg: 'bg-gray-100' },
      { label: 'Records', value: Number(archRecordsArchived) || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];
    return [
      { label: 'Completed', value: bkpCompletedJobs, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Running', value: bkpRunningJobs, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Failed', value: bkpFailedJobs, color: 'text-red-600', bg: 'bg-red-50' },
    ];
  })();

  const healthDots: { label: string; value: number; color: string; dot: string }[] = (() => {
    if (activeTab === 'restore') return [
      { label: 'Completed Restores', value: Number(rstCompleted), color: 'text-green-600', dot: '#16A34A' },
      { label: 'Active Restores', value: Number(rstRunning), color: 'text-blue-600', dot: '#3B82F6' },
      { label: 'Failed Restores', value: Number(rstFailed), color: Number(rstFailed) > 0 ? 'text-red-600' : 'text-gray-400', dot: Number(rstFailed) > 0 ? '#DC2626' : '#9CA3AF' },
    ];
    if (activeTab === 'archive') return [
      { label: 'Active Archives', value: Number(archActiveConfigs), color: 'text-blue-600', dot: '#3B82F6' },
      { label: 'Total Configs', value: Number(archTotalConfigs), color: 'text-purple-600', dot: '#7C3AED' },
      { label: 'Records Archived', value: Number(archRecordsArchived) || 0, color: 'text-gray-600', dot: '#6B7280' },
    ];
    return [
      { label: 'Active Backups', value: bkpActiveBackups, color: 'text-blue-600', dot: '#3B82F6' },
      { label: 'Completed Backups', value: bkpCompletedBackups, color: 'text-green-600', dot: '#16A34A' },
      { label: 'Failed Backups', value: bkpFailedBackups, color: bkpFailedBackups > 0 ? 'text-red-600' : 'text-gray-400', dot: bkpFailedBackups > 0 ? '#DC2626' : '#9CA3AF' },
    ];
  })();

  const rateLabel = activeTab === 'archive' ? 'N/A' : `${healthScore.toFixed(1)}%`;

  // ── loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <div className='animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600' />
      </div>
    );
  }

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>

      {/* Top area */}
      <div className='flex-shrink-0 flex flex-col gap-4 p-4 sm:p-6 pb-0'>

        {/* Header */}
        <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm'>
          <div>
            <Typography as='h2' variant='pageTitle'>Dashboard</Typography>
            <Typography variant='bodySm' color='muted' className='mt-0.5'>
              Hi {userName} — here's your DataVault overview across Backup, Archive & Restore.
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
                onClick={() => navigate('/restore-center/new')}
                className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap'
              >
                + New Restore
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className='flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2'>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const accent = tab.color;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className='px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap'
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
        <div className='grid grid-cols-4 gap-4'>
          {kpiCards.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>

      {/* Main 2-column area */}
      <div
        className='grid gap-4 flex-1 min-h-0 px-4 sm:px-6 py-4'
        style={{ gridTemplateColumns: '1fr 280px', alignItems: 'stretch' }}
      >
        {/* Jobs table */}
        <section className='flex flex-col min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-gray-100 px-5 py-2.5 flex-shrink-0'>
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
            getRowKey={(r) => r.job.backupJobId ?? r.job.restoreId ?? r.job.id ?? Math.random().toString()}
            onRowClick={(r) => setSelectedJob({ job: r.job, type: r.jtype })}
            rowClassName='border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer'
            cellPaddingClassName='px-4 py-2.5'
            emptyState={
              <span className='text-sm text-gray-500'>
                No recent {activeTab} jobs found.
              </span>
            }
            columns={columns}
          />

          <div className='flex-shrink-0 border-t border-gray-100 px-5 py-2.5'>
            <span className='text-xs text-gray-500'>
              Showing {jobRows.length} most recent {activeTab} jobs
            </span>
          </div>
        </section>

        {/* Right column */}
        <div className='flex flex-col gap-4' style={{ minHeight: 0 }}>

          {/* System Health */}
          <section className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-4 flex-1 flex flex-col'>
            <div className='flex items-center justify-between mb-2'>
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
            <div className='flex flex-col gap-2 mt-2'>
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
          <section className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-4 flex-1 flex flex-col'>
            <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-3'>
              {TABS.find((t) => t.id === activeTab)?.label ?? activeTab} Summary
            </Typography>
            <div className='flex flex-col gap-2.5 flex-1 justify-center'>
              {summaryRows.map(({ label, value, color, bg }) => (
                <div key={label} className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500'>{label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color} ${bg}`}>{value}</span>
                </div>
              ))}
              <div className='border-t border-gray-100 pt-2.5 flex items-center justify-between'>
                <span className='text-xs text-gray-500'>Success Rate</span>
                <span className='text-sm font-bold text-gray-800'>{activeTab === 'archive' ? 'N/A' : rateLabel}</span>
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
                  setSelectedJob(null);
                  if (selectedJob.type === 'archive') navigate('/archive-vault');
                  else if (selectedJob.type === 'restore') navigate('/restore-center');
                  else navigate('/backup-management');
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
