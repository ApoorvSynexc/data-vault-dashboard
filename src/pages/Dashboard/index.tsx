// ── Types ───────────────────────────────────────────────────────────────────────
type StatusType = 'Completed' | 'Running' | 'Scheduled' | 'Failed';

// ── Stat Cards ──────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, children,
}: {
  label: string; value: string; sub?: string; children?: React.ReactNode;
}) {
  return (
    <div className='bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2'>
      <p className='text-xs text-gray-500 font-medium'>{label}</p>
      <p className='text-2xl font-bold text-gray-900'>{value}</p>
      {sub && <p className='text-xs text-green-600 font-medium'>{sub}</p>}
      {children}
    </div>
  );
}

function CircularProgress({ pct, color = '#0d9488' }: { pct: number; color?: string }) {
  const r = 14, c = 2 * Math.PI * r;
  return (
    <svg className='w-10 h-10 -rotate-90'>
      <circle cx='20' cy='20' r={r} fill='none' stroke='#e2e8f0' strokeWidth='3' />
      <circle cx='20' cy='20' r={r} fill='none' stroke={color} strokeWidth='3'
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap='round' />
    </svg>
  );
}

// ── Platform Card ───────────────────────────────────────────────────────────────
function PlatformCard({ name, icon, objects }: { name: string; icon: React.ReactNode; objects: number }) {
  return (
    <div className='border border-dashed border-gray-200 rounded-xl p-3 flex-1 min-w-0'>
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-center gap-2'>
          {icon}
          <span className='text-sm font-semibold text-gray-800'>{name}</span>
        </div>
        <button className='text-gray-400 hover:text-gray-600 text-lg leading-none'>···</button>
      </div>
      <p className='text-xs text-gray-500 mb-1'>{objects} Object</p>
      <div className='flex items-center gap-1.5'>
        <span className='w-2 h-2 rounded-full bg-green-500 shrink-0' />
        <span className='text-xs text-green-600 font-medium'>Connected</span>
        <span className='text-xs text-gray-400'>• 2 hrs ago</span>
      </div>
    </div>
  );
}

// ── Platform Icons ──────────────────────────────────────────────────────────────
function SalesforceIcon() {
  return (
    <div className='w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center'>
      <svg viewBox='0 0 24 24' className='w-5 h-5' fill='#0176d3'>
        <path d='M10 4C8.3 4 7 5.3 7 7c0 .4.1.8.2 1.1C5.9 8.5 5 9.6 5 11c0 1.7 1.3 3 3 3h8c1.7 0 3-1.3 3-3 0-1.3-.8-2.4-2-2.8.1-.4.2-.8.2-1.2 0-1.7-1.3-3-3-3-.5 0-1 .1-1.4.4C12.4 4.2 11.7 4 11 4h-1z' />
      </svg>
    </div>
  );
}
function HubSpotIcon() {
  return (
    <div className='w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center'>
      <svg viewBox='0 0 24 24' className='w-5 h-5' fill='#ff7a59'>
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
    <div className='w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center'>
      <span className='text-sm font-bold text-red-500'>Z</span>
    </div>
  );
}

// ── System Health Gauge ─────────────────────────────────────────────────────────
function HealthGauge({ score }: { score: number }) {
  const cx = 80, cy = 75, r = 60;
  const sx = cx - r, sy = cy;
  const ex = cx + r, ey = cy;
  const progressAngle = (score / 100) * 180;
  const rad = (progressAngle * Math.PI) / 180;
  const angle = Math.PI - rad;
  const px = +(cx + r * Math.cos(angle)).toFixed(2);
  const py = +(cy - r * Math.sin(angle)).toFixed(2);
  const la = progressAngle >= 180 ? 1 : 0;

  return (
    <svg viewBox='0 0 160 90' className='w-44'>
      <path d={`M ${sx},${sy} A ${r},${r} 0 0,1 ${ex},${ey}`} fill='none' stroke='#e2e8f0' strokeWidth='10' strokeLinecap='round' />
      <path d={`M ${sx},${sy} A ${r},${r} 0 ${la},1 ${px},${py}`} fill='none' stroke='#22c55e' strokeWidth='10' strokeLinecap='round' />
      <text x={cx} y={cy - 8} textAnchor='middle' fill='#1e293b' fontSize='22' fontWeight='bold'>{score}</text>
      <text x={cx} y={cy + 10} textAnchor='middle' fill='#94a3b8' fontSize='11'>/100</text>
    </svg>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────────
const statusStyles: Record<StatusType, string> = {
  Completed: 'bg-green-100 text-green-700',
  Running:   'bg-amber-100 text-amber-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Failed:    'bg-red-100 text-red-600',
};

function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[status]}`}>
      <span className='w-1.5 h-1.5 rounded-full bg-current' />
      {status}
    </span>
  );
}

// ── Backup Job Row ──────────────────────────────────────────────────────────────
type BackupJob = { name: string; platform: string; status: StatusType; lastRun: string; duration: string; size: string };

function BackupJobRow({ job }: { job: BackupJob }) {
  return (
    <tr className='border-t border-gray-100 hover:bg-gray-50'>
      <td className='py-3 px-4'>
        <div className='flex items-center gap-2'>
          <div className='w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold shrink-0'>
            {job.platform[0]}
          </div>
          <span className='text-sm text-gray-800 font-medium'>{job.name}</span>
        </div>
      </td>
      <td className='py-3 px-4 text-sm text-gray-600'>{job.platform}</td>
      <td className='py-3 px-4'><StatusBadge status={job.status} /></td>
      <td className='py-3 px-4 text-sm text-gray-600'>{job.lastRun}</td>
      <td className='py-3 px-4 text-sm text-gray-600'>{job.duration}</td>
      <td className='py-3 px-4 text-sm text-gray-600'>{job.size}</td>
      <td className='py-3 px-4'>
        <div className='flex items-center gap-2 text-gray-400'>
          <button className='hover:text-gray-600 transition'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='w-4 h-4'>
              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
              <circle cx='12' cy='12' r='3' />
            </svg>
          </button>
          <button className='hover:text-gray-600 transition'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='w-4 h-4'>
              <circle cx='12' cy='5' r='1' fill='currentColor' /><circle cx='12' cy='12' r='1' fill='currentColor' /><circle cx='12' cy='19' r='1' fill='currentColor' />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Upcoming Job ────────────────────────────────────────────────────────────────
function UpcomingJobItem({ name, time, icon }: { name: string; time: string; icon: React.ReactNode }) {
  return (
    <div className='flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0'>
      {icon}
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-gray-800 truncate'>{name}</p>
        <p className='text-xs text-gray-400'>{time}</p>
      </div>
    </div>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────────
const backupJobs: BackupJob[] = [
  { name: 'Salesforce Production Backup', platform: 'Salesforce', status: 'Completed', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'Zoho Production Backup daily', platform: 'Zoho',       status: 'Running',   lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'HubSpot Production Backup',   platform: 'HubSpot',    status: 'Scheduled', lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
  { name: 'HubSpot Production Backup',   platform: 'HubSpot',    status: 'Failed',    lastRun: 'Today, 02:00 AM', duration: '42m 20s', size: '5.2 GB' },
];

const healthChecks = [
  'No failures in last 7 days',
  'Storage Replication Active',
  'Encryption Enabled',
  'No failures (7 days)',
];

// ── Dashboard ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div className='flex flex-col gap-5'>
      <h2 className='text-lg font-bold text-gray-800'>Dashboard Overview</h2>

      {/* Stat Cards */}
      <div className='grid grid-cols-4 gap-4'>
        <StatCard label='Protected Records' value='2.2B' sub='+2.1% vs last week' />

        <StatCard label='Storage Used' value='2.2 TB' sub='+2.5% vs last week'>
          <div className='w-full bg-gray-100 rounded-full h-1.5 mt-1'>
            <div className='bg-green-500 h-1.5 rounded-full' style={{ width: '68%' }} />
          </div>
        </StatCard>

        <StatCard label='Backup Success Rate' value='99.98%' sub='Last 7 Day'>
          <div className='flex justify-end mt-1'>
            <CircularProgress pct={99.98} color='#0d9488' />
          </div>
        </StatCard>

        <StatCard label='Active Jobs' value='14'>
          <div className='flex items-center gap-1.5'>
            <span className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
            <span className='text-xs text-green-600 font-medium'>3 Running</span>
          </div>
        </StatCard>
      </div>

      {/* Connected Platforms + System Health */}
      <div className='grid grid-cols-5 gap-4'>

        {/* Connected Platforms */}
        <div className='col-span-3 bg-white rounded-xl p-5 shadow-sm border border-gray-100'>
          <h3 className='text-sm font-semibold text-gray-800 mb-4'>Connected Platforms</h3>
          <div className='flex gap-3'>
            <PlatformCard name='Salesforce' icon={<SalesforceIcon />} objects={152} />
            <PlatformCard name='HubSpot'    icon={<HubSpotIcon />}    objects={152} />
            <PlatformCard name='Zoho CRM'   icon={<ZohoIcon />}       objects={152} />
          </div>
          <button className='mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 text-blue-600 text-sm font-medium rounded-xl py-2.5 hover:bg-blue-50 transition'>
            <span className='text-lg leading-none'>+</span> Add Platform
          </button>
        </div>

        {/* System Health */}
        <div className='col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100'>
          <h3 className='text-sm font-semibold text-gray-800 mb-3'>System Health</h3>
          <div className='flex flex-col items-center gap-2'>
            <HealthGauge score={97} />
            <span className='inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-500' /> Healthy
            </span>
          </div>
          <ul className='mt-4 flex flex-col gap-2'>
            {healthChecks.map((check) => (
              <li key={check} className='flex items-center gap-2 text-xs text-gray-600'>
                <svg viewBox='0 0 24 24' fill='none' stroke='#22c55e' strokeWidth='2.5' strokeLinecap='round' className='w-3.5 h-3.5 shrink-0'>
                  <polyline points='20 6 9 17 4 12' />
                </svg>
                {check}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Backup Jobs + Upcoming Jobs */}
      <div className='grid grid-cols-5 gap-4'>

        {/* Recent Backup Jobs */}
        <div className='col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
            <h3 className='text-sm font-semibold text-gray-800'>Recent Backup Jobs</h3>
            <button className='text-xs text-blue-600 hover:underline'>View All</button>
          </div>
          <table className='w-full'>
            <thead>
              <tr className='bg-gray-50'>
                {['Job Name', 'Platform', 'Status', 'Last Run', 'Duration', 'Data Size', 'Action'].map((h) => (
                  <th key={h} className='py-2.5 px-4 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backupJobs.map((job, i) => <BackupJobRow key={i} job={job} />)}
            </tbody>
          </table>
        </div>

        {/* Upcoming Jobs */}
        <div className='col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col'>
          <h3 className='text-sm font-semibold text-gray-800 mb-1'>Upcoming Jobs</h3>
          <div className='flex-1'>
            <UpcomingJobItem name='Salesforce Backup Full Production' time='02:00 AM Today' icon={<SalesforceIcon />} />
            <UpcomingJobItem name='HubSpot Backup'                    time='08:00 PM Today' icon={<HubSpotIcon />}    />
            <UpcomingJobItem name='Zoho Backup Monthly'               time='08:00 PM Today' icon={<ZohoIcon />}       />
          </div>
          <div className='flex items-center gap-2 mt-4 pt-4 border-t border-gray-100'>
            <button className='flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition'>Run All</button>
            <button className='flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-lg hover:bg-gray-50 transition'>Pause</button>
            <button className='flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-lg hover:bg-gray-50 transition'>Manage</button>
          </div>
        </div>
      </div>
    </div>
  );
}
