// Storage & Retention page — matches HTML reference screen-storage

import { useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: 'Hot' | 'Cold' | 'Warm' }) {
  if (tier === 'Hot')
    return <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold' style={{ background: '#fef3c7', color: '#92400e' }}>Hot</span>;
  if (tier === 'Warm')
    return <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold' style={{ background: '#fef3c7', color: '#92400e' }}>Warm</span>;
  return <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold' style={{ background: '#dbeafe', color: '#1e40af' }}>Cold</span>;
}

function HealthBadge() {
  return <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700'>Healthy</span>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors ${value ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-200'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────

const BACKUP_POLICIES = [
  { name: 'Salesforce Full Backup',  schedule: 'Daily 06:00',        records: '2.10M', storage: '42 GB', compression: '4.8×', lastRun: 'Today, 06:00 AM' },
  { name: 'Opportunity Backup',      schedule: 'Scheduled · Daily',  records: '720K',  storage: '14 GB', compression: '5.1×', lastRun: 'Today, 06:00 AM' },
  { name: 'Cases Hourly Snapshot',   schedule: 'Hourly',             records: '540K',  storage: '8 GB',  compression: '4.2×', lastRun: '1 hour ago'      },
  { name: 'Leads Real-Time Sync',    schedule: 'Real-Time',          records: '410K',  storage: '7 GB',  compression: '4.6×', lastRun: 'Just now'        },
  { name: 'Contacts Weekly',         schedule: 'Scheduled · Weekly', records: '220K',  storage: '6 GB',  compression: '4.5×', lastRun: 'May 26'          },
];

const ARCHIVE_POLICIES: { name: string; object: string; records: string; sfFreed: string; dvUsed: string; tier: 'Hot' | 'Cold' | 'Warm' }[] = [
  { name: 'Closed Cases — 18 months',     object: 'Case',          records: '820K', sfFreed: '186 GB', dvUsed: '38 GB', tier: 'Hot'  },
  { name: 'Closed-Lost Opportunities',    object: 'Opportunity',   records: '240K', sfFreed: '68 GB',  dvUsed: '14 GB', tier: 'Cold' },
  { name: 'Old Activities — 24 months',   object: 'Task, Event',   records: '180K', sfFreed: '58 GB',  dvUsed: '12 GB', tier: 'Cold' },
  { name: 'Cold Leads — 12 months',       object: 'Lead',          records: '120K', sfFreed: '42 GB',  dvUsed: '9 GB',  tier: 'Hot'  },
  { name: 'Resolved Tickets — 12 months', object: 'Custom Object', records: '95K',  sfFreed: '28 GB',  dvUsed: '6 GB',  tier: 'Cold' },
];

// ── SVG Area Chart ────────────────────────────────────────────────────────────

function AreaChart() {
  const path = 'M0,130 L40,120 L100,108 L160,98 L220,88 L280,72 L340,60 L400,50 L460,38 L520,28 L580,18 L640,10 L700,5';
  const area = path + ' L700,140 L0,140 Z';
  return (
    <svg viewBox='0 0 700 140' className='w-full h-24' preserveAspectRatio='none'>
      <defs>
        <linearGradient id='archGrad' x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0%'   stopColor='#16a34a' stopOpacity='0.35' />
          <stop offset='100%' stopColor='#16a34a' stopOpacity='0'    />
        </linearGradient>
      </defs>
      <path d={area} fill='url(#archGrad)' />
      <path d={path} fill='none' stroke='#16a34a' strokeWidth='2' strokeLinejoin='round' />
      <line x1='0' y1='130' x2='700' y2='130' stroke='#e5e7eb' strokeWidth='1' />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Storage() {
  const [backupRetention,    setBackupRetention]    = useState('90 days');
  const [archiveRetention,   setArchiveRetention]   = useState('Forever');
  const [defaultArchiveTier, setDefaultArchiveTier] = useState('Hot (immediate access)');
  const [autoTransition,     setAutoTransition]     = useState('90 days');
  const [autoDelete,         setAutoDelete]         = useState(true);

  const selectCls = 'h-9 w-full px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30 bg-white';
  const selectSty = { border: '1px solid #E2E8F0', color: '#33363F' };

  return (
    <div className='flex flex-col gap-5 p-4 sm:p-6 w-full'>

      {/* ── Page Header ── */}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-base font-bold text-gray-900'>Storage</h2>
          <p className='text-sm text-gray-500 mt-1'>Recovery coverage, archive savings, and how long we keep your data.</p>
        </div>
        <button className='flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90' style={{ background: '#155DFC' }}>
          Save Changes
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3.5'>
          <p className='text-xs text-gray-500'>DataVault Storage Used</p>
          <p className='text-xl font-bold mt-1' style={{ color: '#155DFC' }}>156 GB</p>
          <p className='text-xs mt-1 text-green-600'>↑ 8 GB this month</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3.5'>
          <p className='text-xs text-gray-500'>Records Protected</p>
          <p className='text-xl font-bold mt-1 text-gray-900'>4.82M</p>
          <p className='text-xs mt-1 text-gray-400'>Across 12 backup policies</p>
        </div>
        <div className='rounded-xl shadow-sm px-4 py-3.5' style={{ background: 'linear-gradient(180deg,#eef9f1,#fff)', border: '1px solid #16a34a' }}>
          <p className='text-xs font-semibold text-green-700'>Salesforce Storage Saved</p>
          <p className='text-xl font-bold mt-1 text-green-700'>312 GB</p>
          <p className='text-xs mt-1 text-gray-400'>Freed by Archive Vault</p>
        </div>
        <div className='rounded-xl shadow-sm px-4 py-3.5' style={{ background: 'linear-gradient(180deg,#eef9f1,#fff)', border: '1px solid #16a34a' }}>
          <p className='text-xs font-semibold text-green-700'>Cost Saved / Year</p>
          <p className='text-xl font-bold mt-1 text-green-700'>~$4,800</p>
          <p className='text-xs mt-1 text-gray-400'>Est. Salesforce storage bill avoided</p>
        </div>
      </div>

      {/* ── Storage Breakdown Bar ── */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-sm font-semibold text-gray-800'>Where the 156 GB lives</span>
          <span className='text-xs text-gray-400'>DataVault storage breakdown</span>
        </div>
        <div className='flex w-full h-3.5 rounded-full overflow-hidden mb-3'>
          <div style={{ width: '45%', background: '#3b82f6' }} />
          <div style={{ width: '28%', background: '#7c3aed' }} />
          <div style={{ width: '18%', background: '#0891b2' }} />
          <div style={{ width: '9%',  background: '#d1d5db' }} />
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs'>
          {[
            { color: '#3b82f6', label: 'Backup Snapshots', val: '70 GB · 45%' },
            { color: '#7c3aed', label: 'Archive (Hot)',     val: '44 GB · 28%' },
            { color: '#0891b2', label: 'Archive (Cold)',    val: '28 GB · 18%' },
            { color: '#d1d5db', label: 'Logs & Indexes',   val: '14 GB · 9%'  },
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
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5'>
            {[
              { label: 'Records protected',       value: '3.58M'         },
              { label: 'Last successful backup',  value: 'Today, 06:00 AM' },
              { label: 'Avg. Recovery Time (RTO)', value: '~3 min'       },
            ].map(({ label, value }) => (
              <div key={label} className='rounded-lg border border-gray-200 px-4 py-3'>
                <p className='text-xs text-gray-400 mb-1'>{label}</p>
                <p className='text-lg font-bold text-gray-900'>{value}</p>
              </div>
            ))}
          </div>
          {/* Table header */}
          <div className='flex items-center justify-between mb-3'>
            <span className='text-xs font-semibold text-gray-700'>Top 5 backup policies by storage</span>
            <span className='text-xs text-gray-400'>Ranked by DataVault storage used</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-xs min-w-[520px]'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Backup Policy</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Records</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>DataVault Storage</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Compression</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Last Run</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Health</th>
                  <th className='py-2 px-3' />
                </tr>
              </thead>
              <tbody>
                {BACKUP_POLICIES.map((p) => (
                  <tr key={p.name} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                    <td className='py-2.5 px-3'>
                      <p className='font-semibold text-gray-800'>{p.name}</p>
                      <p className='text-gray-400 mt-0.5'>{p.schedule}</p>
                    </td>
                    <td className='py-2.5 px-3 text-gray-700'>{p.records}</td>
                    <td className='py-2.5 px-3 text-gray-700'>{p.storage}</td>
                    <td className='py-2.5 px-3 text-gray-700'>{p.compression}</td>
                    <td className='py-2.5 px-3 text-gray-500'>{p.lastRun}</td>
                    <td className='py-2.5 px-3'><HealthBadge /></td>
                    <td className='py-2.5 px-3'>
                      <button className='text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap'>View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='flex items-center justify-between mt-3 text-xs'>
            <span className='text-gray-400'>Showing 5 of 12 policies</span>
            <button className='font-semibold text-blue-600 hover:underline'>View all in Backup Management →</button>
          </div>
        </div>
      </div>

      {/* ── Archive Savings ── */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden' style={{ borderLeft: '4px solid #16a34a' }}>
        <div className='px-5 py-4 border-b border-gray-100'>
          <p className='text-sm font-semibold text-gray-800'>💰 Archive Savings</p>
          <p className='text-xs text-gray-400 mt-0.5'>How much DataVault has freed up in your CRM org — this is the real storage saving.</p>
        </div>
        <div className='px-5 py-4'>

          {/* Hero savings */}
          <div className='rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 mb-5' style={{ background: 'linear-gradient(135deg,#eef9f1,#d4f4dd)', border: '1px solid #16a34a' }}>
            {[
              { label: 'Salesforce Storage Freed',        value: '312 GB'  },
              { label: 'Est. Cost Saved / Year',          value: '~$4,800' },
              { label: 'Records Moved Out of Salesforce', value: '1.24M'   },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className='text-xs font-semibold text-green-700'>{label}</p>
                <p className='text-2xl font-bold text-green-700 mt-1'>{value}</p>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 mb-5'>
            <div className='flex items-start justify-between mb-1'>
              <div>
                <p className='text-xs font-semibold text-gray-700'>Salesforce storage freed — last 12 months</p>
                <p className='text-xs text-gray-400'>Cumulative GB freed by archive policies</p>
              </div>
              <span className='text-xs font-semibold text-green-600 flex-shrink-0'>↑ 312 GB total · 28 GB last month</span>
            </div>
            <AreaChart />
            <div className='flex justify-between mt-1'>
              {['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'].map((m) => (
                <span key={m} className='text-[10px] text-gray-400'>{m}</span>
              ))}
            </div>
          </div>

          {/* Archive table */}
          <div className='flex items-center justify-between mb-3'>
            <span className='text-xs font-semibold text-gray-700'>Top 5 archive sets by Salesforce storage freed</span>
            <span className='text-xs text-gray-400'>Ranked by GB removed from your CRM org</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-xs min-w-[520px]'>
              <thead>
                <tr className='border-b border-gray-100 bg-gray-50'>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Archive Policy</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Source Object</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Records</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>SF Storage Freed</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>DataVault Used</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Tier</th>
                  <th className='py-2 px-3' />
                </tr>
              </thead>
              <tbody>
                {ARCHIVE_POLICIES.map((p) => (
                  <tr key={p.name} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                    <td className='py-2.5 px-3 font-semibold text-gray-800'>{p.name}</td>
                    <td className='py-2.5 px-3 text-gray-600'>{p.object}</td>
                    <td className='py-2.5 px-3 text-gray-700'>{p.records}</td>
                    <td className='py-2.5 px-3 font-semibold text-green-600'>{p.sfFreed}</td>
                    <td className='py-2.5 px-3 text-gray-600'>{p.dvUsed}</td>
                    <td className='py-2.5 px-3'><TierBadge tier={p.tier} /></td>
                    <td className='py-2.5 px-3'>
                      <button className='text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap'>View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='flex items-center justify-between mt-3 text-xs'>
            <span className='text-gray-400'>Showing 5 of 8 archive sets</span>
            <button className='font-semibold text-blue-600 hover:underline'>View all in Archive Vault →</button>
          </div>
        </div>
      </div>

      {/* ── Retention ── */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='px-5 py-4 border-b border-gray-100'>
          <p className='text-sm font-semibold text-gray-800'>⏱ Retention</p>
          <p className='text-xs text-gray-400 mt-0.5'>How long we keep your data.</p>
        </div>
        <div className='p-5'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-0 sm:divide-x divide-gray-100'>

            {/* Backup retention */}
            <div className='flex flex-col gap-4 sm:pr-6 pb-6 sm:pb-0'>
              <p className='text-sm font-semibold text-gray-700'>Backup retention</p>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-gray-600'>Keep backup snapshots for</label>
                <select value={backupRetention} onChange={(e) => setBackupRetention(e.target.value)} className={selectCls} style={selectSty}>
                  {['30 days','60 days','90 days','1 year','Forever'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-sm font-medium text-gray-700'>Auto-delete expired snapshots</p>
                  <p className='text-xs text-gray-400 mt-0.5'>Purge backups beyond the retention window automatically</p>
                </div>
                <Toggle value={autoDelete} onChange={setAutoDelete} />
              </div>
            </div>

            {/* Archive retention */}
            <div className='flex flex-col gap-4 sm:pl-6 pt-6 sm:pt-0 border-t sm:border-t-0 border-gray-100'>
              <p className='text-sm font-semibold text-gray-700'>Archive retention</p>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-gray-600'>Keep archived records for</label>
                <select value={archiveRetention} onChange={(e) => setArchiveRetention(e.target.value)} className={selectCls} style={selectSty}>
                  {['1 year','3 years','7 years','Forever'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-gray-600'>Default archive tier</label>
                <select value={defaultArchiveTier} onChange={(e) => setDefaultArchiveTier(e.target.value)} className={selectCls} style={selectSty}>
                  {['Hot (immediate access)','Warm (1–5 min restore)','Cold (1–12 hr restore)'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-gray-600'>Auto-transition Hot → Cold after</label>
                <select value={autoTransition} onChange={(e) => setAutoTransition(e.target.value)} className={selectCls} style={selectSty}>
                  {['Never','90 days','180 days','365 days'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

          </div>

          {/* Footer note */}
          <div className='mt-5 rounded-lg px-4 py-3 bg-gray-50' style={{ border: '1px solid #f1f5f9' }}>
            <p className='text-xs text-gray-500 italic'>
              Pre-job snapshots for rollback are kept for 7 days. Audit logs are kept for 7 years. These are system defaults and cannot be changed.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
