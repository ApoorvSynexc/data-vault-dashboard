// Audit Logs page — matches HTML reference screen-audit

import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity  = 'success' | 'info' | 'warning' | 'danger';
type EventType = 'restore' | 'backup' | 'archive' | 'pii' | 'config' | 'rollback';
type Range     = '24h' | '7d' | '30d' | '90d' | 'custom';
type SortKey   = 'ts' | 'sev' | 'user';

interface AuditRow {
  type:    EventType;
  sev:     Severity;
  icon:    'check' | 'alert' | 'shield' | 'revert' | 'clock';
  bg:      string;
  col:     string;
  event:   string;
  detail:  string;
  user:    string;
  job:     string;
  objects: string;
  ts:      string;
  tsRank:  number;
}

// ── Static data ───────────────────────────────────────────────────────────────

const AUDIT_DATA: AuditRow[] = [
  { type:'restore',  sev:'success', icon:'check',  bg:'#dcfce7', col:'#16a34a', event:'Retrieval Completed',            detail:'8,423 records restored · Account, Contact, Opportunity · INC-4711',        user:'Sarah Johnson', job:'RJ-20260527-4711', objects:'Account, Contact, Op…', ts:'Today 10:28', tsRank:1028  },
  { type:'pii',      sev:'warning', icon:'shield', bg:'#ede9fe', col:'#7c3aed', event:'PII Fields Accessed',             detail:'Account.SSN, Contact.BirthDate · 312 PII-tagged records surfaced',          user:'Sarah Johnson', job:'RJ-20260527-4711', objects:'Account, Contact',      ts:'Today 10:24', tsRank:1024  },
  { type:'restore',  sev:'warning', icon:'clock',  bg:'#fef3c7', col:'#d97706', event:'Retrieval Requested',             detail:'Snapshot May 26 · 8,435 records · Overwrite mode · INC-4711',              user:'Sarah Johnson', job:'RJ-20260527-4711', objects:'Account, Contact, Op…', ts:'Today 10:15', tsRank:1015  },
  { type:'backup',   sev:'success', icon:'check',  bg:'#dcfce7', col:'#16a34a', event:'Real-Time Sync Completed',        detail:'Lead sync · 2,133 records · 0.3 GB · Continuous',                          user:'System',        job:'BK-RT-20260527',   objects:'Lead',                  ts:'Today 09:42', tsRank: 942  },
  { type:'backup',   sev:'success', icon:'check',  bg:'#dcfce7', col:'#16a34a', event:'Full Backup Completed',           detail:'5.2 GB · 412,400 records · 4m 20s · All 200 objects',                      user:'System',        job:'BK-20260527-0601', objects:'All (200)',              ts:'Today 06:04', tsRank: 604  },
  { type:'backup',   sev:'success', icon:'check',  bg:'#dcfce7', col:'#16a34a', event:'Backup Policy Created',           detail:'Contacts Weekly Backup · Scheduled · Every Monday 06:00 AM',               user:'Mike Chen',     job:'BK-POL-20260501',  objects:'Contact',               ts:'May 01 09:30', tsRank:-10930 },
  { type:'config',   sev:'warning', icon:'alert',  bg:'#fef3c7', col:'#d97706', event:'Retention Policy Changed',        detail:'Backup retention updated by admin · Affects new snapshots going forward',  user:'Mike Chen',     job:'ADMIN-CONFIG',     objects:'Global',                ts:'May 05 10:00', tsRank:-51000 },
  { type:'restore',  sev:'info',    icon:'clock',  bg:'#dbeafe', col:'#2563eb', event:'Restore Preview Generated',       detail:'Dry-run complete · 0 conflicts detected · Safe to proceed',                user:'Sarah Johnson', job:'RJ-20260506-3900', objects:'Opportunity',           ts:'May 06 15:30', tsRank:-61530 },
  { type:'pii',      sev:'warning', icon:'shield', bg:'#ede9fe', col:'#7c3aed', event:'PII Export Detected',             detail:'SSN fields exported to CSV · Flagged for compliance review',               user:'Sarah Johnson', job:'RJ-20260509-4050', objects:'Contact',               ts:'May 09 11:15', tsRank:-91115 },
  { type:'archive',  sev:'info',    icon:'clock',  bg:'#dbeafe', col:'#0891b2', event:'Archive Dry Run Passed',          detail:'9,125 eligible records · 2 warnings found · No errors',                    user:'Mike Chen',     job:'AV-20260514-0200', objects:'Account, Contact',      ts:'May 14 01:50', tsRank:-140150 },
  { type:'archive',  sev:'success', icon:'check',  bg:'#ede9fe', col:'#7c3aed', event:'Archive Policy Created',          detail:'9,125 records archived to S3 Hot tier · 4.2 GB',                           user:'Mike Chen',     job:'AV-20260514-0201', objects:'Account, Contact, Op…', ts:'May 14 02:18', tsRank:-140218 },
  { type:'backup',   sev:'danger',  icon:'alert',  bg:'#fee2e2', col:'#dc2626', event:'Backup Failed',                   detail:'Schema mismatch on Email field · Job aborted · 0 records backed up',       user:'System',        job:'BK-20260525-0601', objects:'Contact',               ts:'May 25 06:01', tsRank:-250601 },
  { type:'rollback', sev:'danger',  icon:'revert', bg:'#fee2e2', col:'#dc2626', event:'Rollback Executed',               detail:'Contact recovery rolled back · Pre-job snapshot restored · 422 reverted',  user:'Admin',         job:'RJ-20260519-3900', objects:'Contact',               ts:'May 20 09:12', tsRank:-200912 },
  { type:'restore',  sev:'success', icon:'check',  bg:'#dcfce7', col:'#16a34a', event:'Selective Restore Completed',     detail:'312 Contact records restored · Field-level restore · INC-4500',            user:'Sarah Johnson', job:'RJ-20260428-3500', objects:'Contact',               ts:'Apr 28 14:10', tsRank:-281410 },
  { type:'pii',      sev:'danger',  icon:'shield', bg:'#fee2e2', col:'#dc2626', event:'Unauthorised PII Access Attempt', detail:'Blocked · User lacked PII clearance · Security alert raised',              user:'Guest User',    job:'SEC-20260425',     objects:'Account, Contact',      ts:'Apr 25 08:33', tsRank:-250833 },
  { type:'config',   sev:'info',    icon:'check',  bg:'#dbeafe', col:'#2563eb', event:'AWS S3 Connection Tested',        detail:'Connection health check passed · us-east-1 · 42ms latency',                user:'System',        job:'CONN-20260420',    objects:'AWS S3',                ts:'Apr 20 03:00', tsRank:-200300 },
];

const SEV_RANK: Record<Severity, number> = { danger: 0, warning: 1, info: 2, success: 3 };
const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function SevBadge({ sev }: { sev: Severity }) {
  const map: Record<Severity, string> = {
    success: 'bg-green-100 text-green-700',
    info:    'bg-blue-100 text-blue-600',
    warning: 'bg-amber-100 text-amber-700',
    danger:  'bg-red-100 text-red-600',
  };
  const label: Record<Severity, string> = { success: 'Success', info: 'Info', warning: 'Warning', danger: 'Critical' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[sev]}`}>{label[sev]}</span>;
}

function EventIcon({ icon, bg, col }: { icon: AuditRow['icon']; bg: string; col: string }) {
  const paths: Record<AuditRow['icon'], React.ReactNode> = {
    check:  <polyline points='20 6 9 17 4 12' />,
    alert:  <><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/></>,
    shield: <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />,
    revert: <><polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-.29-4.36'/></>,
    clock:  <><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></>,
  };
  return (
    <div className='w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0' style={{ background: bg }}>
      <svg width='14' height='14' fill='none' stroke={col} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' viewBox='0 0 24 24'>
        {paths[icon]}
      </svg>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AuditLogs() {
  const [search,   setSearch]   = useState('');
  const [typeFilter, setType]   = useState<EventType | 'all'>('all');
  const [sevFilter,  setSev]    = useState<Severity | 'all'>('all');
  const [userFilter, setUser]   = useState('all');
  const [range,    setRange]    = useState<Range>('30d');
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo,   setDateTo]   = useState('2026-05-31');
  const [sortKey,  setSortKey]  = useState<SortKey>('ts');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');
  const [page,     setPage]     = useState(1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return AUDIT_DATA.filter((r) => {
      const mt = typeFilter === 'all' || r.type === typeFilter;
      const ms = sevFilter  === 'all' || r.sev  === sevFilter;
      const mu = userFilter === 'all' || r.user  === userFilter;
      const mq = !q || [r.event, r.user, r.job, r.objects, r.detail].some((v) => v.toLowerCase().includes(q));
      return mt && ms && mu && mq;
    });
  }, [search, typeFilter, sevFilter, userFilter]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'ts')   return (a.tsRank - b.tsRank) * dir;
      if (sortKey === 'sev')  return (SEV_RANK[a.sev] - SEV_RANK[b.sev]) * dir;
      if (sortKey === 'user') return a.user.localeCompare(b.user) * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  const TYPE_CHIPS: { key: EventType | 'all'; label: string }[] = [
    { key: 'all',      label: 'All'            },
    { key: 'restore',  label: 'Restore'        },
    { key: 'backup',   label: 'Backup'         },
    { key: 'archive',  label: 'Archive'        },
    { key: 'pii',      label: 'PII Access'     },
    { key: 'config',   label: 'Config Changes' },
    { key: 'rollback', label: 'Rollback'       },
  ];

  return (
    <div className='flex flex-col gap-5 p-4 sm:p-6 w-full'>

      {/* ── Page Header ── */}
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <h2 className='text-lg font-bold text-gray-900'>Audit Logs</h2>
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors'>
            <svg width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
            Export CSV
          </button>
          <button className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors'>
            <svg width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-.29-4.36'/></svg>
            Export SIEM
          </button>
          <button className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90' style={{ background: '#155DFC' }}>
            <svg width='12' height='12' fill='none' stroke='white' strokeWidth='2' viewBox='0 0 24 24'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { value: '142', label: 'Total Events',   sub: 'Last 30 days',       subColor: 'text-gray-400',  valColor: 'text-gray-900',  onClick: () => setType('all')     },
          { value: '38',  label: 'Restore Events', sub: '↑ 4 this week',      subColor: 'text-green-600', valColor: 'text-blue-600',  onClick: () => setType('restore') },
          { value: '61',  label: 'Backup Events',  sub: 'Scheduled + manual', subColor: 'text-gray-400',  valColor: 'text-purple-600',onClick: () => setType('backup')  },
          { value: '12',  label: 'PII Access',     sub: 'Requires review',    subColor: 'text-amber-500', valColor: 'text-amber-500', onClick: () => setType('pii')     },
        ].map(({ value, label, sub, subColor, valColor, onClick }) => (
          <button key={label} onClick={onClick}
            className='rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3.5 text-left hover:border-blue-300 transition-colors'
          >
            <p className={`text-2xl font-bold ${valColor}`}>{value}</p>
            <p className='text-xs text-gray-500 mt-1'>{label}</p>
            <p className={`text-[10px] mt-0.5 ${subColor}`}>{sub}</p>
          </button>
        ))}
      </div>

      {/* ── Main Log Card ── */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>

        {/* Toolbar */}
        <div className='flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 flex-wrap gap-y-2'>
          <div className='flex items-center gap-2 flex-wrap'>
            {/* Search */}
            <div className='relative'>
              <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
              </svg>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder='Search by user, job ID, object…'
                className='pl-8 pr-3 h-8 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 w-52'
                style={{ border: '1px solid #E2E8F0' }}
              />
            </div>
            {/* Event type select */}
            <select value={typeFilter} onChange={(e) => { setType(e.target.value as EventType | 'all'); setPage(1); }}
              className='h-8 px-2 rounded-lg text-xs outline-none bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
              <option value='all'>All Event Types</option>
              <option value='restore'>Restore</option>
              <option value='backup'>Backup</option>
              <option value='archive'>Archive</option>
              <option value='pii'>PII Access</option>
              <option value='config'>Config Changes</option>
              <option value='rollback'>Rollback</option>
            </select>
            {/* Severity select */}
            <select value={sevFilter} onChange={(e) => { setSev(e.target.value as Severity | 'all'); setPage(1); }}
              className='h-8 px-2 rounded-lg text-xs outline-none bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
              <option value='all'>All Severities</option>
              <option value='danger'>Critical / Failed</option>
              <option value='warning'>Warning</option>
              <option value='info'>Info</option>
              <option value='success'>Success</option>
            </select>
            {/* User select */}
            <select value={userFilter} onChange={(e) => { setUser(e.target.value); setPage(1); }}
              className='h-8 px-2 rounded-lg text-xs outline-none bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
              <option value='all'>All Users</option>
              <option>Sarah Johnson</option>
              <option>Mike Chen</option>
              <option>Admin</option>
              <option>System</option>
            </select>
          </div>
          <div className='flex items-center gap-2'>
            <span className='inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>
              {filtered.length} events
            </span>
            <button onClick={() => setPage(1)} className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors'>
              ↺ Refresh
            </button>
          </div>
        </div>

        {/* Date range chips */}
        <div className='flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
          <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-widest mr-1'>Range</span>
          {(['24h','7d','30d','90d','custom'] as Range[]).map((r) => (
            <Chip key={r} label={r === '24h' ? 'Last 24h' : r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : r === '90d' ? 'Last 90 days' : 'Custom'}
              active={range === r} onClick={() => { setRange(r); setPage(1); }} />
          ))}
          {range === 'custom' && (
            <div className='flex items-center gap-2 ml-1'>
              <input
                type='date'
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className='h-7 px-2 rounded-lg text-xs outline-none bg-white'
                style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
              />
              <span className='text-gray-400 text-xs'>→</span>
              <input
                type='date'
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className='h-7 px-2 rounded-lg text-xs outline-none bg-white'
                style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
              />
            </div>
          )}
        </div>

        {/* Event type chips */}
        <div className='flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 flex-wrap'>
          {TYPE_CHIPS.map(({ key, label }) => (
            <Chip key={key} label={label} active={typeFilter === key} onClick={() => { setType(key); setPage(1); }} />
          ))}
        </div>

        {/* Table */}
        <div className='overflow-x-auto'>
          <table className='w-full text-xs' style={{ minWidth: '860px', borderCollapse: 'collapse' }}>
            <thead>
              <tr className='border-b-2 border-gray-200 bg-gray-50'>
                <th className='w-12 py-2.5 pl-4' />
                <th className='py-2.5 px-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Event</th>
                <th onClick={() => toggleSort('sev')}
                  className='py-2.5 px-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px] cursor-pointer hover:text-gray-700 select-none whitespace-nowrap'>
                  Severity{sortArrow('sev')}
                </th>
                <th onClick={() => toggleSort('user')}
                  className='py-2.5 px-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px] cursor-pointer hover:text-gray-700 select-none whitespace-nowrap'>
                  User{sortArrow('user')}
                </th>
                <th className='py-2.5 px-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap'>Job / Reference</th>
                <th className='py-2.5 px-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Objects</th>
                <th onClick={() => toggleSort('ts')}
                  className='py-2.5 px-3 text-right font-semibold uppercase tracking-wide text-[10px] cursor-pointer hover:text-gray-700 select-none whitespace-nowrap'
                  style={{ color: sortKey === 'ts' ? '#155DFC' : '#6b7280' }}>
                  Timestamp{sortArrow('ts')}
                </th>
                <th className='py-2.5 pr-4 text-right' />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={i} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                  <td className='py-3 pl-4'>
                    <EventIcon icon={row.icon} bg={row.bg} col={row.col} />
                  </td>
                  <td className='py-3 px-3'>
                    <p className='font-semibold text-gray-800'>{row.event}</p>
                    <p className='text-gray-400 mt-0.5 text-[11px]'>{row.detail}</p>
                  </td>
                  <td className='py-3 px-3'><SevBadge sev={row.sev} /></td>
                  <td className='py-3 px-3 font-medium text-gray-700 whitespace-nowrap'>{row.user}</td>
                  <td className='py-3 px-3'>
                    <span className='font-mono text-[11px] font-semibold' style={{ color: '#155DFC' }}>{row.job}</span>
                  </td>
                  <td className='py-3 px-3 text-gray-600'>{row.objects}</td>
                  <td className='py-3 px-3 text-right text-gray-400 whitespace-nowrap'>{row.ts}</td>
                  <td className='py-3 pr-4 text-right'>
                    <button className='px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap'>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={8} className='py-10 text-center text-sm text-gray-400'>No events match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className='flex items-center justify-between px-4 py-3 border-t border-gray-100'>
          <span className='text-xs text-gray-400'>
            Showing {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} entries
          </span>
          <div className='flex items-center gap-1'>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                  p === page ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={p === page ? { background: '#155DFC' } : {}}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
