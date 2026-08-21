import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useStorageService } from '../../services/storage/storage.service';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val % 1 === 0 ? val : val.toFixed(1)} ${units[i]}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── SVG Area Chart ────────────────────────────────────────────────────────────

type MonthlyStat = { month: string; sizeInBytes: number; uploadedRecords: number };

function AreaChart({ stats }: { stats: MonthlyStat[] }) {
  const W = 700, H = 140, PAD = 10;
  const values = stats.map((s) => s.sizeInBytes);
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : (i / (values.length - 1)) * W;
    const y = PAD + ((max - v) / max) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const path = `M${points.join(' L')}`;
  const area = `${path} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className='w-full h-24' preserveAspectRatio='none'>
      <defs>
        <linearGradient id='archGrad' x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0%' stopColor='#16a34a' stopOpacity='0.35' />
          <stop offset='100%' stopColor='#16a34a' stopOpacity='0' />
        </linearGradient>
      </defs>
      <path d={area} fill='url(#archGrad)' />
      <path d={path} fill='none' stroke='#16a34a' strokeWidth='2' strokeLinejoin='round' />
      <line x1='0' y1={H - PAD} x2={W} y2={H - PAD} stroke='#e5e7eb' strokeWidth='1' />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Storage() {
  const storageService = useStorageService();
  const navigate = useNavigate();

  const overviewQuery = useQuery({
    queryKey: ['storage-overview'],
    queryFn: () => storageService.getOverview(),
    refetchOnWindowFocus: false,
  });

  const lastBackupQuery = useQuery({
    queryKey: ['storage-last-backup-config', 'NORMAL'],
    queryFn: () => storageService.getLastBackupConfig('NORMAL'),
    refetchOnWindowFocus: false,
  });

  const lastArchivalQuery = useQuery({
    queryKey: ['storage-last-backup-config', 'ARCHIVAL'],
    queryFn: () => storageService.getLastBackupConfig('ARCHIVAL'),
    refetchOnWindowFocus: false,
  });

  const lastBackupData: any[] = Array.isArray((lastBackupQuery.data as any)?.data) ? (lastBackupQuery.data as any).data : [];
  const lastArchivalData: any[] = Array.isArray((lastArchivalQuery.data as any)?.data) ? (lastArchivalQuery.data as any).data : [];

  const overviewData = (overviewQuery.data as any)?.data;
  const backupSize: number = overviewData?.backupConfigSizeRecord?.backup?.sizeInBytes ?? 0;
  const backupUploadedRecords: number   = overviewData?.backupConfigSizeRecord?.backup?.uploadedRecords   ?? 0;
  const archivalUploadedRecords: number = overviewData?.backupConfigSizeRecord?.archival?.uploadedRecords ?? 0;
  const backupRecords: number = backupUploadedRecords + archivalUploadedRecords;
  const archivalSize: number = archivalUploadedRecords * 2 * 1024;
  const monthlyStats: MonthlyStat[] = Array.isArray(overviewData?.monthlyStats) ? overviewData.monthlyStats : [];

  const chartMonthLabels = monthlyStats.map((s) => {
    const [, mm] = s.month.split('-');
    return new Date(2000, Number(mm) - 1).toLocaleString('default', { month: 'short' });
  });

  return (
    <div className='flex flex-col gap-5 p-4 sm:p-6 w-full'>

      {/* ── Page Header ── */}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-base font-bold text-gray-900'>Storage</h2>
          <p className='text-sm text-gray-500 mt-1'>Recovery coverage, archive savings, and how long we keep your data.</p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3.5'>
          <p className='text-xs text-gray-500'>DataCraft Storage Used</p>
          <p className='text-xl font-bold mt-1' style={{ color: '#155DFC' }}>{formatBytes(backupSize)}</p>
          <p className='text-xs mt-1 text-gray-400'>Backup storage consumed</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3.5'>
          <p className='text-xs text-gray-500'>Records Protected</p>
          <p className='text-xl font-bold mt-1 text-gray-900'>{formatCount(backupRecords)}</p>
          <p className='text-xs mt-1 text-gray-400'>Across all backup policies</p>
        </div>
        <div className='rounded-xl shadow-sm px-4 py-3.5' style={{ background: 'linear-gradient(180deg,#eef9f1,#fff)', border: '1px solid #16a34a' }}>
          <p className='text-xs font-semibold text-green-700'>Salesforce Storage Saved</p>
          <p className='text-xl font-bold mt-1 text-green-700'>{formatBytes(archivalSize)}</p>
          <p className='text-xs mt-1 text-gray-400'>Freed by Archive Vault</p>
        </div>
      </div>

      {/* ── Storage Breakdown Bar ── */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-sm font-semibold text-gray-800'>Where the 156 GB lives</span>
          <span className='text-xs text-gray-400'>DataCraft storage breakdown</span>
        </div>
        <div className='flex w-full h-3.5 rounded-full overflow-hidden mb-3'>
          <div style={{ width: '50%', background: '#3b82f6' }} />
          <div style={{ width: '50%', background: '#7c3aed' }} />
        </div>
        <div className='grid grid-cols-2 gap-3 text-xs'>
          {[
            { color: '#3b82f6', label: 'Backup Snapshots',  val: '50 GB · 50%' },
            { color: '#7c3aed', label: 'Archive Snapshots', val: '50 GB · 50%' },
          ].map(({ color, label, val }) => (
            <div key={label} className='flex flex-col gap-1'>
              <div className='flex items-center gap-1.5'>
                <span className='w-2.5 h-2.5 rounded-sm flex-shrink-0' style={{ background: color }} />
                <span className='font-semibold text-gray-700'>{label}</span>
              </div>
              <span className='text-gray-400 pl-4'>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Backup Coverage ── */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden' style={{ borderLeft: '4px solid #3b82f6' }}>
        <div className='px-5 py-4 border-b border-gray-100'>
          <p className='text-sm font-semibold text-gray-800'>🛡 Backup Coverage</p>
          <p className='text-xs text-gray-400 mt-0.5'>How protected your data is and how fast you can recover.</p>
        </div>
        <div className='px-5 py-4'>
          {/* Coverage mini-stats */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5'>
            <div className='rounded-lg border border-gray-200 px-4 py-3'>
              <p className='text-xs text-gray-400 mb-1'>Records protected</p>
              <p className='text-lg font-bold text-gray-900'>{formatCount(backupRecords)}</p>
            </div>
            <div className='rounded-lg border border-gray-200 px-4 py-3'>
              <p className='text-xs text-gray-400 mb-1'>Last successful backup</p>
              <p className='text-lg font-bold text-gray-900'>
                {lastBackupData[0]?.lastBackupAt
                  ? new Date(lastBackupData[0].lastBackupAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
          </div>
          {/* Table header */}
          <div className='flex items-center justify-between mb-3'>
            <span className='text-xs font-semibold text-gray-700'>Backup policies</span>
            <span className='text-xs text-gray-400'>Ranked by DataCraft storage used</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-xs min-w-[520px]'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Backup Policy</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Objects</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>DataCraft Storage</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Last Backup</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Status</th>
                </tr>
              </thead>
              <tbody>
                {lastBackupData.length === 0 && !lastBackupQuery.isLoading && (
                  <tr>
                    <td colSpan={5} className='py-8 text-center text-gray-400'>No backup policies found.</td>
                  </tr>
                )}
                {lastBackupQuery.isLoading && (
                  <tr>
                    <td colSpan={5} className='py-8 text-center text-gray-400'>Loading…</td>
                  </tr>
                )}
                {lastBackupData.map((p: any) => (
                  <tr key={p.backupConfigId} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                    <td className='py-2.5 px-3'>
                      <p className='font-semibold text-gray-800'>{p.name}</p>
                      <p className='text-gray-400 mt-0.5 capitalize'>{p.schedule?.toLowerCase?.() ?? '—'} · {p.dataset?.toLowerCase?.() ?? '—'}</p>
                    </td>
                    <td className='py-2.5 px-3 text-gray-700'>{p.objectNames?.length ?? 0}</td>
                    <td className='py-2.5 px-3 text-gray-700'>{p.sizeInBytes != null ? formatBytes(p.sizeInBytes) : '—'}</td>
                    <td className='py-2.5 px-3 text-gray-500'>
                      {p.lastBackupAt ? new Date(p.lastBackupAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className='py-2.5 px-3'>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.backupStatus === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                          p.backupStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                            p.backupStatus === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                        }`}>{p.backupStatus ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='flex items-center justify-between mt-3 text-xs'>
            <span className='text-gray-400'>Showing {lastBackupData.length} {lastBackupData.length === 1 ? 'policy' : 'policies'}</span>
            <button onClick={() => navigate('/backup-management')} className='font-semibold text-blue-600 hover:underline'>View all in Backup Management →</button>
          </div>
        </div>
      </div>

      {/* ── Archive Savings ── */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden' style={{ borderLeft: '4px solid #16a34a' }}>
        <div className='px-5 py-4 border-b border-gray-100'>
          <p className='text-sm font-semibold text-gray-800'>💰 Archive Savings</p>
          <p className='text-xs text-gray-400 mt-0.5'>How much DataCraft has freed up in your CRM org — this is the real storage saving.</p>
        </div>
        <div className='px-5 py-4'>

          {/* Trend chart */}
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 mb-5'>
            <div className='flex items-start justify-between mb-1'>
              <div>
                <p className='text-xs font-semibold text-gray-700'>Storage used — this year</p>
                <p className='text-xs text-gray-400'>Monthly sizeInBytes across all backups</p>
              </div>
            </div>
            <AreaChart stats={monthlyStats} />
            <div className='flex justify-between mt-1'>
              {chartMonthLabels.map((m, i) => (
                <span key={i} className='text-[10px] text-gray-400'>{m}</span>
              ))}
            </div>
          </div>

          {/* Archive table */}
          <div className='flex items-center justify-between mb-3'>
            <span className='text-xs font-semibold text-gray-700'>Archive policies</span>
            <span className='text-xs text-gray-400'>Ranked by GB removed from your CRM org</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-xs min-w-[520px]'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Archive Policy</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Objects</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>SF Storage Freed</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>DataCraft Used</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Last Archive</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Status</th>
                </tr>
              </thead>
              <tbody>
                {lastArchivalData.length === 0 && !lastArchivalQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className='py-8 text-center text-gray-400'>No archive policies found.</td>
                  </tr>
                )}
                {lastArchivalQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className='py-8 text-center text-gray-400'>Loading…</td>
                  </tr>
                )}
                {lastArchivalData.map((p: any) => {
                  const dvUsed = p.sizeInBytes ?? 0;
                  const totalRecords = (p.objects ?? []).reduce((sum: number, o: any) => sum + (o.completedRecordCount ?? 0), 0);
                  const sfFreed = Math.max(0, totalRecords * 2 * 1024 - dvUsed);
                  return (
                    <tr key={p.backupConfigId} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                      <td className='py-2.5 px-3 font-semibold text-gray-800'>{p.name}</td>
                      <td className='py-2.5 px-3 text-gray-600'>{(p.objectNames ?? []).join(', ') || '—'}</td>
                      <td className='py-2.5 px-3 font-semibold text-green-600'>{formatBytes(sfFreed)}</td>
                      <td className='py-2.5 px-3 text-gray-600'>{formatBytes(dvUsed)}</td>
                      <td className='py-2.5 px-3 text-gray-500'>
                        {p.lastBackupAt ? new Date(p.lastBackupAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className='py-2.5 px-3'>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.backupStatus === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                            p.backupStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                              p.backupStatus === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                          }`}>{p.backupStatus ?? '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className='flex items-center justify-between mt-3 text-xs'>
            <span className='text-gray-400'>Showing {lastArchivalData.length} {lastArchivalData.length === 1 ? 'policy' : 'policies'}</span>
            <button onClick={() => navigate('/archive-vault')} className='font-semibold text-blue-600 hover:underline'>View all in Archive Vault →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
