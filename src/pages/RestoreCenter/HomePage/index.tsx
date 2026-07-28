import type { ReactNode } from 'react';
import Typography from '../../../components/Typography';
import RestoreHistory from '../RestoreHistory';

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className='rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center gap-3 min-w-0'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(21,93,252,0.08)' }}>
        {icon}
      </div>
      <div className='min-w-0'>
        <p className='text-xl font-bold leading-tight text-gray-900'>{value}</p>
        <p className='mt-0.5 text-xs text-gray-500 leading-tight'>{label}</p>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onNewRestore: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RestoreCenterHomePage({ onNewRestore }: Props) {
  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0'>

        {/* ── Header card ── */}
        <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm flex-shrink-0'>
          <div>
            <Typography as='h2' variant='pageTitle'>Restore Center</Typography>
            <Typography variant='bodySm' color='muted' className='mt-0.5'>Recover data from backups and archives</Typography>
          </div>
          <button
            onClick={onNewRestore}
            className='inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap bg-blue-600'
          >
            + New Restore
          </button>
        </div>

        {/* ── Recovery Readiness Banner ── */}
        <div className='flex-shrink-0 flex items-start gap-3 rounded-xl px-4 py-3 text-sm' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <svg width='16' height='16' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
            <circle cx='12' cy='12' r='10' /><line x1='12' y1='16' x2='12' y2='12' /><line x1='12' y1='8' x2='12.01' y2='8' />
          </svg>
          <p className='text-blue-800 text-xs leading-relaxed'>
            <span className='font-semibold'>Recovery Readiness: </span>
            Last successful backup <strong>Today, 06:00 AM</strong> · Last verified snapshot <strong>Yesterday, 11:59 PM</strong> · Last successful restore <strong>3 days ago</strong>
          </p>
        </div>

        {/* ── Quick Actions ── */}
        <div className='flex-shrink-0 flex gap-3'>
          <button
            onClick={onNewRestore}
            className='flex-1 flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-opacity hover:opacity-90'
            style={{ background: '#155DFC' }}
          >
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg width='20' height='20' fill='none' stroke='white' strokeWidth='2.5' viewBox='0 0 24 24'>
                <polyline points='23 4 23 10 17 10' /><path d='M20.49 15a9 9 0 1 1-.29-4.36' />
              </svg>
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-white'>⚡ Quick Recover Yesterday</p>
              <p className='text-xs text-blue-100 mt-0.5 leading-relaxed'>Opens the wizard pre-filled with yesterday's snapshot → same org → overwrite mode · You'll review before running.</p>
            </div>
            <svg width='16' height='16' fill='none' stroke='rgba(255,255,255,0.7)' strokeWidth='2' viewBox='0 0 24 24' className='ml-auto flex-shrink-0'>
              <polyline points='9 18 15 12 9 6' />
            </svg>
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm flex-shrink-0'>
          <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-2.5'>Restore Status</Typography>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <MetricCard label='Total Restores' value={24}
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='23 4 23 10 17 10' /><path d='M20.49 15a9 9 0 1 1-.29-4.36' /></svg>}
            />
            <MetricCard label='Running Now' value='01'
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' /></svg>}
            />
            <MetricCard label='Failed (30d)' value='02'
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><circle cx='12' cy='12' r='10' /><line x1='15' y1='9' x2='9' y2='15' /><line x1='9' y1='9' x2='15' y2='15' /></svg>}
            />
            <MetricCard label='Records Restored' value='1.2M'
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='20 6 9 17 4 12' /></svg>}
            />
          </div>
        </div>

        {/* ── Restore History ── */}
        <div className='flex-shrink-0 min-h-[500px] flex flex-col'>
          <RestoreHistory embedded onNewRestore={onNewRestore} />
        </div>
      </div>
    </div>
  );
}
