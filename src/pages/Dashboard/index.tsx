import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../services/backup-config/backup-config.service';
import { formatBytes } from '../../utils';
import dayjs from 'dayjs';
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

/* ── helpers ── */
function getJobStatus(status?: string): { label: string; bg: string; color: string } {
  const s = status?.toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED') return { label: 'Completed', bg: '#DCFCE7', color: '#16A34A' };
  if (s === 'FAILED') return { label: 'Failed', bg: '#FEE2E2', color: '#DC2626' };
  if (s === 'RUNNING') return { label: 'Running', bg: '#DBEAFE', color: '#155DFC' };
  if (s === 'PENDING') return { label: 'Pending', bg: '#FEF9C3', color: '#A16207' };
  return { label: status || 'Unknown', bg: '#F3F4F6', color: '#374151' };
}

/* ── KPI card ── */
function KpiCard({ icon, label, value, sub, subColor = '#16A34A' }: {
  icon: ReactNode; label: string; value: string; sub?: string; subColor?: string;
}) {
  return (
    <div className='rounded-xl bg-white p-4 flex flex-col gap-2' style={{ border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
      <div className='flex items-center gap-2'>
        <div className='w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0' style={{ background: 'rgba(22,163,74,0.1)' }}>
          {icon}
        </div>
        <p className='text-xs font-normal' style={{ color: '#64748B' }}>{label}</p>
      </div>
      <p className='text-3xl font-bold' style={{ color: '#33363F' }}>{value}</p>
      {sub && <p className='text-xs font-semibold' style={{ color: subColor }}>{sub}</p>}
    </div>
  );
}

/* ── health gauge ── */
function HealthGauge({ score }: { score: number }) {
  const cx = 80, cy = 75, r = 60;
  const progressAngle = (score / 100) * 180;
  const rad = ((180 - progressAngle) * Math.PI) / 180;
  const px = +(cx + r * Math.cos(rad)).toFixed(2);
  const py = +(cy - r * Math.sin(rad)).toFixed(2);
  const la = progressAngle >= 180 ? 1 : 0;
  return (
    <svg viewBox='0 0 160 90' className='w-40'>
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`} fill='none' stroke='#E2E8F0' strokeWidth='10' strokeLinecap='round' />
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 ${la},1 ${px},${py}`} fill='none' stroke='#22C55E' strokeWidth='10' strokeLinecap='round' />
      <text x={cx} y={cy - 8} textAnchor='middle' fill='#0F172A' fontSize='22' fontWeight='bold'>{score}</text>
      <text x={cx} y={cy + 8} textAnchor='middle' fill='#64748B' fontSize='11'>/100</text>
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();

  /* ── data fetching ── */
  const { data: backupListData } = useQuery({
    queryKey: ['backup-config-list'],
    queryFn: () => backupConfigService.listBackupConfigs(true, undefined),
    staleTime: 60_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => backupConfigService.getStats(),
    staleTime: 60_000,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['dashboard-last-jobs'],
    queryFn: () => backupConfigService.getLastJobs(),
    staleTime: 60_000,
  });

  const { data: overviewData } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => backupConfigService.getDashboardOverview(),
    staleTime: 60_000,
  });

  /* ── derived values ── */
  const backupList = Array.isArray((backupListData as any)?.data)
    ? (backupListData as any).data
    : [];

  const hasBackups = backupList && backupList.length > 0;

  // stats: for system health / jobs summary sidebar
  const apiStats = (statsData as any)?.data ?? {};
  const completedJobs = apiStats?.completedJobs?.count ?? 0;
  const runningJobs   = apiStats?.runningJobs?.count ?? 0;
  const failedJobs    = apiStats?.failedJobs?.count ?? 0;
  const totalRuns     = completedJobs + runningJobs + failedJobs;
  const successRate   = totalRuns > 0 ? ((completedJobs / totalRuns) * 100).toFixed(2) : '0.00';

  // overview API: KPI cards
  const overview = (overviewData as any)?.data ?? {};
  const kpiProtectedRecords = overview?.protectedRecords?.value ?? '--';
  const kpiProtectedChange  = overview?.protectedRecords?.change;
  const kpiProtectedPeriod  = overview?.protectedRecords?.period;
  const kpiStorageValue     = overview?.storageUsed?.value ?? '--';
  const kpiStorageChange    = overview?.storageUsed?.change;
  const kpiStoragePeriod    = overview?.storageUsed?.period;
  const kpiSuccessRate      = overview?.backupSuccessRate?.value ?? '--';
  const kpiSuccessPeriod    = overview?.backupSuccessRate?.period;
  const kpiActiveJobs       = overview?.activeJobs?.value ?? 0;
  const kpiRunning          = overview?.activeJobs?.running ?? 0;

  const recentJobs: any[] = Array.isArray((jobsData as any)?.data)
    ? (jobsData as any).data
    : Array.isArray(jobsData)
      ? jobsData
      : [];

  /* ── no-backup state: lock scroll ── */
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

  /* ── empty state ── */
  if (!hasBackups) {
    const frameImages = [Frame, Frame1, Frame2, Frame3, Frame4, Frame5, Frame6, Frame7, Frame8, Frame9, Frame10, Frame11, Frame12, Frame13, Frame14, Frame15, Frame16, Frame17];
    return (
      <div className='w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-white'>
        <div className='absolute inset-0 pointer-events-none overflow-hidden'>
          <div className='grid grid-cols-6 gap-8 p-8 opacity-20'>
            {frameImages.map((src, i) => (
              <div key={i} className='aspect-square flex items-center justify-center'>
                <img src={src} alt='' className='w-20 h-20 object-contain' />
              </div>
            ))}
          </div>
        </div>
        <div className='relative z-10 text-center max-w-md'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>Welcome User !</h1>
          <p className='text-lg text-gray-600 mb-8'>Currently you dont have any backup to get started with your dashboard !</p>
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

  /* ── main dashboard ── */
  return (
    <div className='flex flex-col gap-3'>
      <h2 className='text-lg font-semibold flex-shrink-0' style={{ color: '#33363F' }}>Dashboard Overview</h2>

      {/* ── KPI Row ── */}
      <div className='grid grid-cols-4 gap-3 flex-shrink-0'>
        <KpiCard
          icon={<svg viewBox='0 0 24 24' className='w-4 h-4' fill='none' stroke='#16A34A' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 12h-4l-3 9L9 3l-3 9H2'/></svg>}
          label='Protected Records'
          value={String(kpiProtectedRecords)}
          sub={kpiProtectedChange ? `${kpiProtectedChange} ${kpiProtectedPeriod ?? ''}`.trim() : undefined}
        />
        <KpiCard
          icon={<svg viewBox='0 0 24 24' className='w-4 h-4' fill='none' stroke='#16A34A' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>}
          label='Storage Used'
          value={kpiStorageValue || '--'}
          sub={kpiStorageChange ? `${kpiStorageChange} ${kpiStoragePeriod ?? ''}`.trim() : undefined}
        />
        <KpiCard
          icon={<svg viewBox='0 0 24 24' className='w-4 h-4' fill='none' stroke='#16A34A' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12'/></svg>}
          label='Backup Success Rate'
          value={kpiSuccessRate || '--'}
          sub={kpiSuccessPeriod ?? undefined}
        />
        <KpiCard
          icon={<svg viewBox='0 0 24 24' className='w-4 h-4' fill='none' stroke='#16A34A' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='2' y='7' width='20' height='14' rx='2'/><path d='M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2'/></svg>}
          label='Active Jobs'
          value={String(kpiActiveJobs)}
          sub={kpiRunning > 0 ? `${kpiRunning} Running` : 'No active jobs'}
        />
      </div>

      {/* ── Main two-column layout ── */}
      <div className='grid gap-3' style={{ gridTemplateColumns: '1fr 265px' }}>

        {/* Left: Recent Jobs table */}
        <div className='rounded-xl bg-white flex flex-col' style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div className='flex items-center px-5 py-3 flex-shrink-0' style={{ borderBottom: '1px solid #E2E8F0' }}>
            <h3 className='font-semibold' style={{ fontSize: '16px', color: '#33363F' }}>Recent Jobs (Last 10 Jobs)</h3>
          </div>

          {/* fixed header */}
          <table className='w-full' style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                {['Job Name', 'Type', 'Status', 'Date & Time', 'Duration', 'Data Size'].map(h => (
                  <th key={h} className='px-5 py-2.5 text-left text-sm font-medium' style={{ color: '#33363F' }}>{h}</th>
                ))}
              </tr>
            </thead>
          </table>

          {/* scrollable body */}
          <div className='overflow-y-auto' style={{ maxHeight: '420px' }}>
          <table className='w-full' style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <tbody>
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-5 py-10 text-center text-sm' style={{ color: '#64748B' }}>No recent jobs found.</td>
                </tr>
              ) : recentJobs.slice(0, 10).map((job: any) => {
                const st = getJobStatus(job.status);
                const startMs = job.startedAt ? dayjs(job.startedAt) : null;
                const endMs   = job.completedAt ? dayjs(job.completedAt) : null;
                const diffMs  = startMs && endMs ? endMs.diff(startMs, 'ms') : null;
                const duration = diffMs !== null
                  ? diffMs < 60000 ? `${Math.floor(diffMs / 1000)}s`
                  : `${Math.floor(diffMs / 60000)}m ${Math.floor((diffMs % 60000) / 1000)}s`
                  : '--';
                const sizeBytes = (job.object || []).reduce((s: number, o: any) => s + (o.sizeInBytes || 0), 0);
                const bulkObjects: any[] = job.object || [];
                const jobName = job.objectApiName
                  ? job.objectApiName
                  : bulkObjects.length > 0
                    ? bulkObjects.length === 1
                      ? bulkObjects[0].name
                      : `${bulkObjects[0].name} +${bulkObjects.length - 1} more`
                    : 'Backup Job';
                const initials = jobName[0]?.toUpperCase() ?? 'B';
                return (
                  <tr key={job.backupJobId} style={{ borderBottom: '1px solid #EBEBEB' }}>
                    <td className='px-5 py-3'>
                      <div className='flex items-center gap-2 overflow-hidden'>
                        <div className='w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0' style={{ background: '#155DFC' }}>
                          {initials}
                        </div>
                        <span className='text-sm font-light truncate' style={{ color: '#0A0A0A' }}>
                          {jobName}
                        </span>
                      </div>
                    </td>
                    <td className='px-5 py-3 text-sm font-light' style={{ color: '#0A0A0A' }}>
                      {job.jobType === 'BULK' ? 'Backup' : 'Realtime'}
                    </td>
                    <td className='px-5 py-3'>
                      <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium' style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td className='px-5 py-3 text-sm font-light' style={{ color: '#0A0A0A' }}>
                      {startMs ? startMs.format('MMM D, YYYY h:mm A') : '--'}
                    </td>
                    <td className='px-5 py-3 text-sm font-light' style={{ color: '#0A0A0A' }}>{duration}</td>
                    <td className='px-5 py-3 text-sm font-light' style={{ color: '#0A0A0A' }}>{sizeBytes > 0 ? formatBytes(sizeBytes) : '--'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

        </div>

        {/* Right column */}
        <div className='flex flex-col gap-4'>

          {/* System Health */}
          <div className='rounded-xl bg-white p-5' style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <h3 className='font-semibold mb-3' style={{ fontSize: '16px', color: '#33363F' }}>System Health</h3>
            <div className='flex flex-col items-center gap-2'>
              <HealthGauge score={Number(successRate)} />
              <span className='inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium' style={{ background: 'rgba(2,169,64,0.1)', color: '#008020' }}>
                <span className='w-2 h-2 rounded-full bg-green-600' />
                {Number(successRate) >= 90 ? 'Healthy' : Number(successRate) >= 70 ? 'Degraded' : 'Critical'}
              </span>
            </div>
            <ul className='mt-4 flex flex-col gap-1.5'>
              {[
                `${backupList.length} active backup${backupList.length !== 1 ? 's' : ''}`,
                `${completedJobs} completed job${completedJobs !== 1 ? 's' : ''}`,
                failedJobs === 0 ? 'No failures' : `${failedJobs} failed job${failedJobs !== 1 ? 's' : ''}`,
              ].map((item, i) => (
                <li key={i} className='flex items-center gap-2 text-sm' style={{ color: '#33363F' }}>
                  <svg viewBox='0 0 24 24' className='w-4 h-4 flex-shrink-0' fill='none'>
                    <circle cx='12' cy='12' r='10' fill={i === 2 && failedJobs > 0 ? '#DC2626' : 'url(#hg)'} />
                    <path d='M8 12l3 3 5-5' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                    <defs>
                      <linearGradient id='hg' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0%' stopColor='#008020' />
                        <stop offset='100%' stopColor='#37C55B' />
                      </linearGradient>
                    </defs>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Jobs Stats */}
          <div className='rounded-xl bg-white p-5' style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <h3 className='font-semibold mb-3' style={{ fontSize: '16px', color: '#33363F' }}>Jobs Summary</h3>
            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm' style={{ color: '#64748B' }}>Completed</span>
                <span className='text-sm font-bold' style={{ color: '#16A34A' }}>{completedJobs}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm' style={{ color: '#64748B' }}>Running</span>
                <span className='text-sm font-bold' style={{ color: '#155DFC' }}>{runningJobs}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm' style={{ color: '#64748B' }}>Failed</span>
                <span className='text-sm font-bold' style={{ color: '#DC2626' }}>{failedJobs}</span>
              </div>
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '8px' }} className='flex items-center justify-between'>
                <span className='text-sm' style={{ color: '#64748B' }}>Success Rate</span>
                <span className='text-sm font-bold' style={{ color: '#33363F' }}>{successRate}%</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
