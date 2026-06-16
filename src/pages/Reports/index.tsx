// Reports & Analytics — matches HTML reference screen-reports

import { useState } from 'react';

// ── Bar chart (backup volume sparkline) ───────────────────────────────────────

const BAR_HEIGHTS = [20,15,22,18,12,30,25,14,18,22,16,28,20,15,12,35,22,18,24,20,16,28,18,22,20,30,14,18,22,24];

function BackupVolumeChart() {
  const max = Math.max(...BAR_HEIGHTS);
  return (
    <div className='flex items-end gap-0.5 h-20 w-full'>
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className='flex-1 rounded-sm transition-opacity hover:opacity-80'
          style={{
            height: `${(h / max) * 100}%`,
            background: '#155DFC',
            opacity: 0.3 + (h / max) * 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ── Progress bar row ──────────────────────────────────────────────────────────

function ProgressRow({ label, sub, pct, color, height = 8 }: { label: string; sub: string; pct: number; color: string; height?: number }) {
  return (
    <div>
      <div className='flex items-center justify-between mb-1' style={{ fontSize: '12.5px' }}>
        <span className='font-semibold text-gray-800'>{label}</span>
        <span className='text-gray-400'>{sub}</span>
      </div>
      <div className='w-full bg-gray-200 rounded-full' style={{ height }}>
        <div className='h-full rounded-full transition-all' style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Reports() {
  const [dateRange, setDateRange] = useState('Last 30 days');

  const KPI_CARDS = [
    { value: '99.8%', label: 'Backup SLA',     color: '#16a34a' },
    { value: '156 GB', label: 'Data Protected', color: '#155DFC' },
    { value: '12',     label: 'Restores',       color: '#111827' },
    { value: '1',      label: 'Failures',       color: '#dc2626' },
    { value: '2m 14s', label: 'Avg Restore',    color: '#d97706' },
  ];

  return (
    <div className='flex flex-col gap-5 p-4 sm:p-6 w-full'>

      {/* ── Page Header ── */}
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <div>
          <h2 className='text-base font-bold text-gray-900'>Reports &amp; Analytics</h2>
          <p className='text-sm text-gray-500 mt-0.5'>Usage trends, SLA compliance, and data protection insights</p>
        </div>
        <div className='flex items-center gap-2'>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className='h-8 px-3 rounded-lg text-xs outline-none bg-white'
            style={{ border: '1px solid #E2E8F0', color: '#33363F', minWidth: '130px' }}
          >
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
          </select>
          <button className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors'>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
        {KPI_CARDS.map(({ value, label, color }) => (
          <div key={label} className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3 text-center'>
            <p className='text-xl font-bold' style={{ color }}>{value}</p>
            <p className='text-[10px] text-gray-500 mt-1'>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column row 1: Backup Volume + Job Outcomes ── */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>

        {/* Backup Volume */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between px-5 py-3.5 border-b border-gray-100'>
            <span className='text-sm font-semibold text-gray-800'>Backup Volume (30 days)</span>
            <span className='text-xs text-gray-400'>GB per day</span>
          </div>
          <div className='p-5'>
            <BackupVolumeChart />
            <div className='flex items-center justify-between mt-1' style={{ fontSize: '10px', color: '#9ca3af' }}>
              <span>Apr 28</span>
              <span>May 28</span>
            </div>
            <div className='grid grid-cols-2 gap-2 mt-3'>
              <div className='bg-gray-50 rounded-lg p-2 text-center'>
                <p className='text-sm font-bold text-gray-900'>5.2 GB</p>
                <p className='text-[10px] text-gray-500 mt-0.5'>Latest</p>
              </div>
              <div className='bg-gray-50 rounded-lg p-2 text-center'>
                <p className='text-sm font-bold text-green-600'>↑ 6%</p>
                <p className='text-[10px] text-gray-500 mt-0.5'>vs last month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Outcomes */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between px-5 py-3.5 border-b border-gray-100'>
            <span className='text-sm font-semibold text-gray-800'>Job Outcomes (30 days)</span>
          </div>
          <div className='p-5 flex flex-col gap-4'>
            <ProgressRow label='Backup Completed'   sub='23 jobs · 100%'  pct={100} color='#16a34a' />
            <ProgressRow label='Archive Completed'  sub='6 jobs · 100%'   pct={100} color='#7c3aed' />
            <ProgressRow label='Restores Completed' sub='11/12 · 91.7%'   pct={92}  color='#0891b2' />
            <ProgressRow label='Failed Jobs'        sub='1 job'           pct={4}   color='#dc2626' />
          </div>
        </div>

      </div>

      {/* ── Two-column row 2: API Consumption + Most Active Objects ── */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>

        {/* API Consumption */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between px-5 py-3.5 border-b border-gray-100'>
            <span className='text-sm font-semibold text-gray-800'>API Consumption</span>
            <span className='text-xs text-gray-400'>Daily Salesforce API calls</span>
          </div>
          <div className='p-5 flex flex-col gap-4'>
            {/* Used today progress */}
            <div>
              <div className='flex items-center justify-between mb-1.5 text-xs'>
                <span className='text-gray-700'>Used today</span>
                <span className='font-semibold text-gray-800'>1,123 / 15,000 (7.5%)</span>
              </div>
              <div className='w-full bg-gray-200 rounded-full h-2.5'>
                <div className='h-2.5 rounded-full bg-green-500' style={{ width: '7.5%' }} />
              </div>
            </div>
            {/* Breakdown rows */}
            <div className='flex flex-col gap-2'>
              {[
                { label: 'Backup calls',  value: '842'                  },
                { label: 'Archive calls', value: '198'                  },
                { label: 'Restore calls', value: '83'                   },
                { label: 'Peak day',      value: 'May 23 · 1,440 calls' },
              ].map(({ label, value }) => (
                <div key={label} className='flex items-center justify-between text-xs'>
                  <span className='text-gray-400'>{label}</span>
                  <span className='font-medium text-gray-700'>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Active Objects */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between px-5 py-3.5 border-b border-gray-100'>
            <span className='text-sm font-semibold text-gray-800'>Most Active Objects</span>
          </div>
          <div className='p-5 flex flex-col gap-3'>
            {[
              { label: 'Contact',     pct: 38, bar: 76 },
              { label: 'Account',     pct: 27, bar: 54 },
              { label: 'Opportunity', pct: 21, bar: 42 },
              { label: 'Lead',        pct: 9,  bar: 18 },
              { label: 'Case',        pct: 5,  bar: 10 },
            ].map(({ label, pct, bar }) => (
              <ProgressRow key={label} label={label} sub={`${pct}%`} pct={bar} color='#155DFC' height={6} />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
