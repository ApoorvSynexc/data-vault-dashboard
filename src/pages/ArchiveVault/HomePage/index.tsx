import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

type ArchiveStatus = 'Running' | 'Scheduled' | 'One Time' | 'Draft' | 'Paused' | 'Failed';

type ArchivePolicy = {
  id: string;
  name: string;
  platform: 'Salesforce' | 'HubSpot' | 'Zoho';
  platformEnv: string;
  status: ArchiveStatus;
  createdOn: string;
  records: number;
  dataSize: string;
};

// ── Dummy Data ────────────────────────────────────────────────────────────────

const DUMMY_POLICIES: ArchivePolicy[] = [
  { id: '1', name: 'Salesforce Old Cases',                   platform: 'Salesforce', platformEnv: 'Production', status: 'Running',   createdOn: 'April 20, 2025\n04:00 PM', records: 40545, dataSize: '2 GB'   },
  { id: '2', name: 'Leads Records- Last Year',               platform: 'Salesforce', platformEnv: 'Production', status: 'Scheduled', createdOn: 'April 20, 2025\n08:00 PM', records: 7545,  dataSize: '1.1 GB' },
  { id: '3', name: 'Salesforce - 5 years old records',       platform: 'Salesforce', platformEnv: 'Sandbox',    status: 'One Time',  createdOn: 'April 14, 2025\n02:00 PM', records: 3545,  dataSize: '900 MB' },
  { id: '4', name: 'All Cases- 5years old archive-closed-status', platform: 'Salesforce', platformEnv: 'Sandbox', status: 'Scheduled', createdOn: 'April 10, 2025\n10:00 AM', records: 44545, dataSize: '4.2 GB' },
  { id: '5', name: 'All Contact- 4 years older',             platform: 'HubSpot',    platformEnv: 'Production', status: 'Draft',     createdOn: 'April 6, 2025\n12:32 PM',  records: 645,   dataSize: '200 MB' },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function ArchiveIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
      <polyline points='21 8 21 21 3 21 3 8' />
      <rect x='1' y='3' width='22' height='5' />
      <line x1='10' y1='12' x2='14' y2='12' />
    </svg>
  );
}

function RecordsIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
      <ellipse cx='12' cy='5' rx='9' ry='3' />
      <path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' />
      <path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' />
    </svg>
  );
}

function StorageIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
      <rect x='2' y='2' width='20' height='8' rx='2' ry='2' />
      <rect x='2' y='14' width='20' height='8' rx='2' ry='2' />
      <line x1='6' y1='6' x2='6.01' y2='6' />
      <line x1='6' y1='18' x2='6.01' y2='18' />
    </svg>
  );
}

function PlatformConnectionIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
      <circle cx='18' cy='5' r='3' />
      <circle cx='6' cy='12' r='3' />
      <circle cx='18' cy='19' r='3' />
      <line x1='8.59' y1='13.51' x2='15.42' y2='17.49' />
      <line x1='15.41' y1='6.51' x2='8.59' y2='10.49' />
    </svg>
  );
}

function SalesforceLogo() {
  return (
    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00A1E0]'>
      <svg viewBox='0 0 48 48' className='h-4 w-4' fill='white'>
        <path d='M20 8c-2.8 0-5.2 1.6-6.4 4C12.4 11.4 11.2 11 10 11c-3.9 0-7 3.1-7 7 0 1.2.3 2.4.9 3.3C2.7 22.4 2 23.9 2 25.5 2 29 4.9 32 8.5 32H38c3.3 0 6-2.7 6-6 0-2.8-1.9-5.2-4.5-5.8.3-.7.5-1.5.5-2.2 0-3.3-2.7-6-6-6-.8 0-1.5.2-2.2.4C30.5 10 27.5 8 24 8c-1.5 0-2.9.4-4 1.1V8z' />
      </svg>
    </div>
  );
}

function HubSpotLogo() {
  return (
    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100'>
      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='#ff7a59'>
        <circle cx='12' cy='12' r='3' />
        <line x1='12' y1='3' x2='12' y2='9' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
        <line x1='12' y1='15' x2='12' y2='21' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
        <line x1='3' y1='12' x2='9' y2='12' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
        <line x1='15' y1='12' x2='21' y2='12' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
      </svg>
    </div>
  );
}

function PlatformLogo({ platform }: { platform: ArchivePolicy['platform'] }) {
  if (platform === 'HubSpot') return <HubSpotLogo />;
  return <SalesforceLogo />;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ArchiveStatus }) {
  const styles: Record<ArchiveStatus, { bg: string; text: string; dot: string }> = {
    Running:    { bg: 'border border-green-300 bg-white',   text: 'text-green-600',  dot: 'bg-green-500'  },
    Scheduled:  { bg: 'border border-blue-300 bg-white',    text: 'text-blue-600',   dot: 'bg-blue-500'   },
    'One Time': { bg: 'border border-yellow-300 bg-white',  text: 'text-yellow-600', dot: 'bg-yellow-400' },
    Draft:      { bg: 'border border-gray-300 bg-white',    text: 'text-gray-500',   dot: 'bg-gray-400'   },
    Paused:     { bg: 'border border-orange-300 bg-white',  text: 'text-orange-600', dot: 'bg-orange-400' },
    Failed:     { bg: 'border border-red-300 bg-white',     text: 'text-red-600',    dot: 'bg-red-500'    },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ── Action Dropdown ───────────────────────────────────────────────────────────

function ActionDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className='relative' ref={ref}>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex items-center justify-center rounded p-1 text-gray-400 transition hover:text-gray-600'
      >
        <svg viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'>
          <circle cx='12' cy='5' r='1.5' />
          <circle cx='12' cy='12' r='1.5' />
          <circle cx='12' cy='19' r='1.5' />
        </svg>
      </button>
      {open && (
        <div className='absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'>
          {[
            { label: 'View Details', danger: false },
            { label: 'Edit Policy',  danger: false },
            { label: 'Pause',        danger: false },
            { label: 'Delete',       danger: true  },
          ].map((item) => (
            <button
              key={item.label}
              type='button'
              onClick={() => setOpen(false)}
              className={`flex w-full items-center px-3 py-2 text-left text-xs font-medium transition ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50'>
        {icon}
      </div>
      <div>
        <p className='text-lg font-bold text-blue-600'>{value}</p>
        <p className='text-xs text-gray-400'>{label}</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 5;

export default function ArchiveVaultHomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All Platform');
  const [objectFilter, setObjectFilter] = useState('All Objects');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = DUMMY_POLICIES.filter((p) => {
    if (platformFilter !== 'All Platform' && p.platform !== platformFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const selectCls = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 appearance-none pr-7 cursor-pointer';

  return (
    <div className='flex w-full min-w-0 flex-col gap-5'>

      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <h2 className='text-xl font-bold text-gray-900'>Archive Vault</h2>
          <p className='mt-0.5 text-sm text-gray-500'>
            Long-term, immutable storage for retired records with field-level filtering and record-level restore.
          </p>
        </div>
        <button
          type='button'
          onClick={() => navigate('/archive-vault/new')}
          className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 whitespace-nowrap'
        >
          + New Archive
        </button>
      </div>

      {/* Stat Cards */}
      <div className='grid grid-cols-2 gap-4 xl:grid-cols-4'>
        <StatCard icon={<ArchiveIcon />}            value='134'     label='Total archives across all platform' />
        <StatCard icon={<RecordsIcon />}            value='356,142' label='Total records' />
        <StatCard icon={<StorageIcon />}            value='2.6 TB'  label='Across 3 platforms' />
        <StatCard icon={<PlatformConnectionIcon />} value='3'       label='Platform connections' />
      </div>

      {/* Table Panel */}
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>

        {/* Table header */}
        <div className='flex items-center justify-between px-5 py-4'>
          <h3 className='text-sm font-semibold text-gray-800'>All Archives ({filtered.length})</h3>
        </div>

        {/* Filters */}
        <div className='flex items-center gap-3 border-b border-gray-100 px-5 pb-4'>
          {/* Search */}
          <div className='relative'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400'>
              <circle cx='11' cy='11' r='8' />
              <line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
            <input
              type='text'
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder='Search Archive'
              className='h-9 w-52 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-600 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
            />
          </div>

          {/* Platform filter */}
          <div className='relative'>
            <select
              value={platformFilter}
              onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
              className={selectCls}
              style={{ minWidth: 130 }}
            >
              <option>All Platform</option>
              <option>Salesforce</option>
              <option>HubSpot</option>
              <option>Zoho</option>
            </select>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400'>
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </div>

          {/* Object filter */}
          <div className='relative'>
            <select
              value={objectFilter}
              onChange={(e) => { setObjectFilter(e.target.value); setCurrentPage(1); }}
              className={selectCls}
              style={{ minWidth: 130 }}
            >
              <option>All Objects</option>
            </select>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400'>
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </div>

          {/* More Filter */}
          <button
            type='button'
            className='flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-500 transition hover:border-gray-300'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-3.5 w-3.5'>
              <line x1='4' y1='6' x2='20' y2='6' />
              <line x1='8' y1='12' x2='16' y2='12' />
              <line x1='11' y1='18' x2='13' y2='18' />
            </svg>
            More Filter
          </button>

          {/* Clear Filter */}
          <button
            type='button'
            onClick={() => { setSearch(''); setPlatformFilter('All Platform'); setObjectFilter('All Objects'); setCurrentPage(1); }}
            className='flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-500 transition hover:border-gray-300'
          >
            Clear Filter
          </button>
        </div>

        {/* Table */}
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-100'>
                {['Archive Policy', 'Platform', 'Status', 'Created On', 'Records', 'Data Size', 'Action'].map((col) => (
                  <th key={col} className='px-5 py-3 text-left text-xs font-semibold text-gray-500'>
                    <span className='flex items-center gap-1'>
                      {col}
                      {col !== 'Action' && (
                        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3 w-3 text-gray-300'>
                          <polyline points='6 9 12 15 18 9' />
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-5 py-12 text-center text-sm text-gray-400'>
                    No archive policies match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((policy) => (
                  <tr key={policy.id} className='border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50/50'>
                    <td className='px-5 py-3'>
                      <div className='flex items-center gap-3'>
                        <PlatformLogo platform={policy.platform} />
                        <span className='text-sm font-medium text-gray-800'>{policy.name}</span>
                      </div>
                    </td>
                    <td className='px-5 py-3'>
                      <p className='text-xs font-medium text-gray-700'>{policy.platform}</p>
                      <p className='text-xs text-gray-400'>{policy.platformEnv}</p>
                    </td>
                    <td className='px-5 py-3'>
                      <StatusBadge status={policy.status} />
                    </td>
                    <td className='px-5 py-3'>
                      {policy.createdOn.split('\n').map((line, i) => (
                        <p key={i} className={`text-xs ${i === 0 ? 'font-medium text-gray-700' : 'text-gray-400'}`}>{line}</p>
                      ))}
                    </td>
                    <td className='px-5 py-3 text-sm text-gray-700'>{policy.records.toLocaleString()}</td>
                    <td className='px-5 py-3 text-sm text-gray-700'>{policy.dataSize}</td>
                    <td className='px-5 py-3'>
                      <ActionDropdown />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className='flex items-center justify-between border-t border-gray-100 px-5 py-3'>
          <p className='text-xs text-gray-400'>
            Showing {paginated.length} of {filtered.length} Backups
          </p>
          <div className='flex items-center gap-1'>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type='button'
                onClick={() => setCurrentPage(page)}
                className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition ${
                  currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            {totalPages > 3 && (
              <>
                <span className='px-1 text-xs text-gray-400'>...</span>
                <button
                  type='button'
                  onClick={() => setCurrentPage(totalPages)}
                  className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition ${
                    currentPage === totalPages ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
