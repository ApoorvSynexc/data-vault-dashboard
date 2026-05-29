import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../../services/archival/archival.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return '--';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = {
    ACTIVE: 'bg-green-500', SUCCESS: 'bg-green-500', RUNNING: 'bg-blue-500',
    PENDING: 'bg-yellow-400', DRAFT: 'bg-yellow-400', PAUSED: 'bg-gray-400', FAILED: 'bg-red-500',
  };
  const label: Record<string, string> = {
    ACTIVE: 'Active', SUCCESS: 'Success', RUNNING: 'Running',
    PENDING: 'Pending', DRAFT: 'Draft', PAUSED: 'Paused', FAILED: 'Failed',
  };
  const key = status?.toUpperCase() ?? 'DRAFT';
  return (
    <span className='flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700'>
      <span className={`h-1.5 w-1.5 rounded-full ${color[key] ?? 'bg-gray-400'}`} />
      {label[key] ?? status}
    </span>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['Archive Details', 'Filter Details', 'Schedule Details', 'Activity Logs'] as const;
type Tab = typeof TABS[number];


// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className='flex flex-1 items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl' style={{ background: 'rgba(21,93,252,0.08)' }}>
        {icon}
      </div>
      <div>
        <p className='text-xl font-bold leading-tight text-gray-900'>{value}</p>
        <p className='mt-0.5 text-xs text-gray-500'>{label}</p>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconArchive = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
    <polyline points='21 8 21 21 3 21 3 8' /><rect x='1' y='3' width='22' height='5' /><line x1='10' y1='12' x2='14' y2='12' />
  </svg>
);
const IconRecords = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><polyline points='14 2 14 8 20 8' />
    <line x1='16' y1='13' x2='8' y2='13' /><line x1='16' y1='17' x2='8' y2='17' />
  </svg>
);
const IconStorage = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
    <ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' /><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' />
  </svg>
);
const IconPlatform = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'>
    <rect x='2' y='2' width='8' height='8' rx='1.5' /><rect x='14' y='2' width='8' height='8' rx='1.5' />
    <rect x='2' y='14' width='8' height='8' rx='1.5' /><rect x='14' y='14' width='8' height='8' rx='1.5' />
  </svg>
);

// ── Dummy archived records ────────────────────────────────────────────────────

const DUMMY_RECORDS = [
  { id: '006Xx0343401', name: 'Acme Corp Q4 Enterprise', object: 'Case' },
  { id: '006Xx0343402', name: 'Acme Corp', object: 'Case' },
  { id: '006Xx0343403', name: 'Acme Corp Q3 Enterprise', object: 'Case' },
  { id: '006Xx0343404', name: 'Acme Corp Q1 Enterprise', object: 'Case' },
  { id: '006Xx0343405', name: 'Global Tech Support', object: 'Case' },
  { id: '006Xx0343406', name: 'Bright Future Inc.', object: 'Case' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

// ── Dummy data ────────────────────────────────────────────────────────────────

type ActivityLog = {
  startTime: string;
  startedAt: string;
  status: string;
  duration: string;
  newRecords: number;
  totalRecords: number;
  dataSize: string;
  archiveType: string;
};

const DUMMY_ACTIVITY_LOGS: ActivityLog[] = [
  { startTime: 'Apr 24, 2026, 02:00 AM', startedAt: 'Apr 24, 2026\n02:00 AM', status: 'Completed', duration: '1m 10s', newRecords: 6,    totalRecords: 40545, dataSize: '2 GB',   archiveType: 'Scheduled' },
  { startTime: 'Apr 23, 2026, 02:00 AM', startedAt: 'Apr 23, 2026\n02:00 AM', status: 'Completed', duration: '45s',    newRecords: 2,    totalRecords: 40543, dataSize: '2 GB',   archiveType: 'Scheduled' },
  { startTime: 'Apr 22, 2026, 02:00 AM', startedAt: 'Apr 22, 2026\n02:00 AM', status: 'Completed', duration: '2m 45s', newRecords: 245,  totalRecords: 40298, dataSize: '1.9 GB', archiveType: 'Scheduled' },
  { startTime: 'Apr 21, 2026, 02:00 AM', startedAt: 'Apr 21, 2026\n02:00 AM', status: 'Completed', duration: '6m 45s', newRecords: 645,  totalRecords: 39653, dataSize: '1.7 GB', archiveType: 'Scheduled' },
  { startTime: 'Apr 20, 2026, 02:00 AM', startedAt: 'Apr 20, 2026\n02:00 AM', status: 'Completed', duration: '1m 4s',  newRecords: 0,    totalRecords: 39653, dataSize: '1.7 GB', archiveType: 'Scheduled' },
  { startTime: 'Apr 19, 2026, 02:00 AM', startedAt: 'Apr 19, 2026\n02:00 AM', status: 'Completed', duration: '15m 43s',newRecords: 8012, totalRecords: 31641, dataSize: '1.1 GB', archiveType: 'Scheduled' },
  { startTime: 'Apr 19, 2026, 02:00 AM', startedAt: 'Apr 19, 2026\n02:00 AM', status: 'Completed', duration: '5m 3s',  newRecords: 20,   totalRecords: 31621, dataSize: '1.1 GB', archiveType: 'Scheduled' },
];

const DUMMY_ARCHIVED_RECORDS = [
  { name: 'Charlie Operations Case', object: 'Case', id: 'A00vsdef6ax033', lastModified: 'April 20, 2020' },
  { name: 'DMK',                     object: 'Case', id: 'A00vsdf6223Ax063', lastModified: 'April 19, 2020' },
  { name: 'DMS Suits',               object: 'Case', id: 'A00vsdef6ax089',   lastModified: 'April 20, 2020' },
  { name: 'Franklin',                object: 'Case', id: 'A00vsdf6223Ax003', lastModified: 'April 19, 2020' },
  { name: 'Robust System',           object: 'Case', id: 'A00rvs34623Ax43',  lastModified: 'April 19, 2020' },
  { name: '5S Corp',                 object: 'Case', id: 'A00rvs34623Ax43',  lastModified: 'April 19, 2020' },
];

// ── Archive History Modal ─────────────────────────────────────────────────────

function ArchiveHistoryModal({ log, onClose }: { log: ActivityLog; onClose: () => void }) {
  const [modalPage, setModalPage] = useState(1);
  const MODAL_PAGE_SIZE = 10;
  const totalModalPages = Math.max(1, Math.ceil(DUMMY_ARCHIVED_RECORDS.length / MODAL_PAGE_SIZE));
  const paginated = DUMMY_ARCHIVED_RECORDS.slice((modalPage - 1) * MODAL_PAGE_SIZE, modalPage * MODAL_PAGE_SIZE);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className='relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col' style={{ maxHeight: '90vh' }}>

        {/* Modal Header */}
        <div className='flex items-start gap-3 px-6 pt-6 pb-4 flex-shrink-0'>
          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-500'>
            <svg viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='h-6 w-6'>
              <polyline points='20 6 9 17 4 12' />
            </svg>
          </div>
          <div className='flex-1 min-w-0'>
            <h2 className='text-base font-bold text-gray-900'>Archive History - {log.startTime}</h2>
            <button type='button' className='mt-0.5 text-xs text-blue-600 hover:underline'>
              Archive job details →
            </button>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* Stats Row */}
        <div className='flex items-center gap-2 px-6 pb-4 flex-shrink-0'>
          {[
            {
              icon: (
                <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                  <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/>
                </svg>
              ),
              label: 'Status', value: log.status, valueClass: 'text-green-600 font-semibold',
            },
            {
              icon: (
                <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                  <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                </svg>
              ),
              label: 'Started At', value: log.startedAt, multiline: true,
            },
            {
              icon: (
                <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                  <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                </svg>
              ),
              label: 'Duration', value: log.duration,
            },
            {
              icon: (
                <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                  <ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'/><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'/>
                </svg>
              ),
              label: 'Data Size', value: log.dataSize,
            },
            {
              icon: (
                <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                  <rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/><rect x='3' y='14' width='7' height='7' rx='1'/><rect x='14' y='14' width='7' height='7' rx='1'/>
                </svg>
              ),
              label: 'Archive Type', value: log.archiveType,
            },
          ].map(({ icon, label, value, valueClass, multiline }) => (
            <div key={label} className='flex flex-1 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2'>
              <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg' style={{ background: 'rgba(21,93,252,0.08)' }}>
                {icon}
              </div>
              <div className='min-w-0'>
                <p className='text-[10px] text-gray-400'>{label}</p>
                {multiline ? (
                  <p className='text-xs font-semibold text-gray-800 whitespace-pre-line leading-tight'>{value}</p>
                ) : (
                  <p className={`text-xs font-semibold text-gray-800 ${valueClass ?? ''}`}>{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Records Section */}
        <div className='px-6 pb-2 flex-shrink-0'>
          <p className='text-sm font-semibold text-gray-800'>New Added Archived Records</p>
        </div>

        {/* Table Header */}
        <div className='px-6 flex-shrink-0'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-200'>
                {['Record Name', 'Object', 'ID', 'Last Modified'].map((col) => (
                  <th key={col} className='pb-2 text-left text-xs font-semibold text-gray-500'>
                    <span className='flex items-center gap-1'>
                      {col}
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3 w-3 text-gray-300'>
                        <polyline points='6 9 12 15 18 9' />
                      </svg>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable rows */}
        <div className='flex-1 overflow-y-auto px-6 min-h-0'>
          <table className='w-full'>
            <tbody className='divide-y divide-gray-50'>
              {paginated.map((rec, i) => (
                <tr key={i} className='hover:bg-gray-50/50 transition-colors'>
                  <td className='py-3 pr-4 text-xs text-gray-700'>{rec.name}</td>
                  <td className='py-3 pr-4 text-xs text-gray-600'>{rec.object}</td>
                  <td className='py-3 pr-4 text-xs text-gray-500 font-mono'>{rec.id}</td>
                  <td className='py-3 text-xs text-gray-500'>{rec.lastModified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className='flex-shrink-0 flex items-center justify-between border-t border-gray-100 px-6 py-3'>
          <span className='text-xs text-gray-500'>Showing {Math.min((modalPage - 1) * MODAL_PAGE_SIZE + 1, DUMMY_ARCHIVED_RECORDS.length)} to {Math.min(modalPage * MODAL_PAGE_SIZE, DUMMY_ARCHIVED_RECORDS.length)} of {DUMMY_ARCHIVED_RECORDS.length}</span>
          <div className='flex items-center gap-1'>
            <button type='button' onClick={() => setModalPage((p) => Math.max(1, p - 1))} disabled={modalPage === 1}
              className='flex h-7 w-7 items-center justify-center rounded text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&lt;</button>
            {Array.from({ length: totalModalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} type='button' onClick={() => setModalPage(p)}
                className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition ${modalPage === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {p}
              </button>
            ))}
            <button type='button' onClick={() => setModalPage((p) => Math.min(totalModalPages, p + 1))} disabled={modalPage === totalModalPages}
              className='flex h-7 w-7 items-center justify-center rounded text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&gt;</button>
          </div>
        </div>

      </div>
    </div>
  );
}

const ITEMS_PER_LOG_PAGE = 10;

export default function ArchiveDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const archivalService = useArchivalService();
  const [activeTab, setActiveTab] = useState<Tab>('Archive Details');
  const [recordSearch, setRecordSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [logSearch, setLogSearch] = useState('');
  const [logFromDate, setLogFromDate] = useState('');
  const [logToDate, setLogToDate] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data: rawDetail, isLoading } = useQuery({
    queryKey: ['archival-config-detail', slug],
    queryFn: () => archivalService.getDetail(slug!),
    staleTime: 30_000,
    enabled: !!slug,
  });

  const item: any = (rawDetail as any)?.data ?? rawDetail ?? null;

  // ── Mapped fields from API ─────────────────────────────────────────────────
  const platformName   = item?.crmDetail?.name ?? item?.crmDetail?.crmName ?? 'Salesforce';
  const crmName        = item?.crmDetail?.crmName ?? 'Salesforce';
  const environment    = item?.crmDetail?.environment ?? 'production';
  const objectNames: string[] = item?.objectNames ?? [];
  const dataSize       = formatBytes(item?.sizeInBytes);
  const status         = item?.backupStatus ?? item?.status ?? 'ACTIVE';

  const sc             = item?.scheduleConfig;
  const freq           = sc?.scheduling?.frequency ?? 'HOURLY';
  const startTime      = sc?.scheduling?.startTime ?? '12:00';

  const destName       = item?.destinationDetail?.destinationName ?? '--';
  const destType       = item?.destinationDetail?.type ?? '--';

  const createdAt      = item?.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
  const lastBackupAt   = item?.lastBackupAt ? new Date(item.lastBackupAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';

  const filteredRecords = DUMMY_RECORDS.filter((r) =>
    r.name.toLowerCase().includes(recordSearch.toLowerCase()) ||
    r.id.toLowerCase().includes(recordSearch.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredRecords.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
  };

  if (isLoading) {
    return (
      <div className='flex flex-1 items-center justify-center min-h-[60vh]'>
        <div className='h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600' />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 flex-1 min-h-0'>

      {/* Breadcrumb */}
      <div className='flex items-center gap-2 text-sm'>
        <Link to='/archive-vault' className='text-gray-500 hover:text-blue-600 transition-colors'>Archive Vault</Link>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3.5 w-3.5 text-gray-400'>
          <polyline points='9 18 15 12 9 6' />
        </svg>
        <span className='font-medium text-blue-600'>{item?.name ?? slug}</span>
      </div>

      {/* Header Card */}
      <div className='rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <button
              type='button'
              onClick={() => navigate('/archive-vault')}
              className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors'
            >
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                <polyline points='15 18 9 12 15 6' />
              </svg>
            </button>
            <div>
              <div className='flex items-center gap-2.5'>
                <h1 className='text-base font-bold text-gray-900'>{item?.name ?? slug}</h1>
                <StatusDot status={status} />
              </div>
              <p className='mt-1 text-xs text-gray-400'>
                {objectNames.length > 0 ? objectNames.join(', ') : '--'}
                {' · '}
                {dataSize}
                {' · '}
                {environment}
              </p>
            </div>
          </div>
          <button
            type='button'
            className='flex-shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600'
          >
            Full Restore
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className='flex gap-3'>
        <MetricCard icon={<IconArchive />} value={String(objectNames.length || '--')} label='Objects in Archive' />
        <MetricCard icon={<IconRecords />} value={lastBackupAt} label='Last Backup At' />
        <MetricCard icon={<IconStorage />} value={dataSize} label='Archived Storage' />
        <MetricCard icon={<IconPlatform />} value={crmName} label='Source Platform' />
      </div>

      {/* Tabs Card — only controls the detail rows */}
      <div className='flex flex-col flex-1 min-h-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>

        {/* Tab Bar */}
        <div className='flex border-b border-gray-100 px-6 flex-shrink-0'>
          {TABS.map((tab) => (
            <button
              key={tab}
              type='button'
              onClick={() => setActiveTab(tab)}
              className={[
                'mr-6 py-3.5 text-xs font-semibold transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`flex-1 min-h-0 px-6 py-5 ${activeTab !== 'Activity Logs' ? 'overflow-y-auto' : 'flex flex-col'}`}>

          {/* ── Archive Details ── */}
          {activeTab === 'Archive Details' && (
            <div className='grid grid-cols-1 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100'>
              {[
                { label: 'Archive Name',        value: item?.name ?? '--' },
                { label: 'Archive Source',      value: null,
                  custom: (
                    <span className='flex items-center gap-2 flex-wrap'>
                      <span className='font-medium text-gray-800'>{platformName}</span>
                      <span className='text-gray-400'>—</span>
                      <span className='capitalize text-gray-600'>{environment}</span>
                      {item?.crmDetail?.isConnected && (
                        <span className='inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-700'>
                          <span className='h-1.5 w-1.5 rounded-full bg-green-500' />Connected
                        </span>
                      )}
                    </span>
                  ),
                },
                { label: 'Archive Destination', value: null,
                  custom: (
                    <span className='flex items-center gap-2 flex-wrap'>
                      <span className='font-medium text-gray-800'>{destName}</span>
                      <span className='rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase'>{destType}</span>
                      <span className='inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700'>
                        <span className='h-1.5 w-1.5 rounded-full bg-blue-500' />Verified
                      </span>
                    </span>
                  ),
                },
                { label: 'Data Size',           value: dataSize },
                { label: 'Archive Schedule',     value: null,
                  custom: (
                    <span className='flex items-center gap-2'>
                      <span className='rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide'>{freq}</span>
                      <span className='text-gray-700'>{startTime}</span>
                    </span>
                  ),
                },
                { label: 'Object(s)',            value: null,
                  custom: (
                    <span className='flex flex-wrap gap-1.5'>
                      {(objectNames.length ? objectNames : ['--']).map((o) => (
                        <span key={o} className='rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700'>{o}</span>
                      ))}
                    </span>
                  ),
                },
                { label: 'Created At',          value: createdAt },
                { label: 'Last Backup At',       value: lastBackupAt },
              ].map(({ label, value, custom }) => (
                <div key={label} className='flex items-center gap-6 bg-white px-5 py-3.5 hover:bg-gray-50/60 transition-colors'>
                  <span className='w-44 flex-shrink-0 text-xs font-semibold text-blue-500'>{label}</span>
                  <span className='text-xs text-gray-700 flex-1'>{custom ?? value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Filter Details ── */}
          {activeTab === 'Filter Details' && (() => {
            const filters: { object: string; field: string; operator: string; value: string }[] = (item?.objects ?? []).flatMap((obj: any) =>
              (obj.field ?? []).map((f: any) => ({
                object: obj.name,
                field: f.name,
                operator: f.filter?.operator ?? '=',
                value: f.filter?.value ?? '--',
              }))
            );
            return (
              <div>
                <div className='flex items-center gap-2 mb-5'>
                  <div className='flex h-7 w-7 items-center justify-center rounded-lg' style={{ background: 'rgba(21,93,252,0.08)' }}>
                    <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-3.5 w-3.5'>
                      <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'/>
                    </svg>
                  </div>
                  <p className='text-sm font-bold text-gray-800'>Fields Level Filters</p>
                  <span className='ml-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600'>{filters.length}</span>
                </div>
                {filters.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 border border-gray-100'>
                      <svg viewBox='0 0 24 24' fill='none' stroke='#9ca3af' strokeWidth='1.5' className='h-5 w-5'>
                        <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'/>
                      </svg>
                    </div>
                    <p className='text-sm font-medium text-gray-500'>No filters applied</p>
                    <p className='text-xs text-gray-400 mt-1'>All records from selected objects will be archived</p>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {filters.map((f, i) => (
                      <div key={i} className='flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 hover:border-blue-100 hover:bg-blue-50/30 transition-colors'>
                        <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-100 shadow-sm'>
                          <svg viewBox='0 0 24 24' fill='none' stroke='#6366f1' strokeWidth='1.8' className='h-3.5 w-3.5'>
                            <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
                          </svg>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <span className='text-xs font-semibold text-gray-700'>{f.object}</span>
                          <span className='mx-1.5 text-gray-300'>·</span>
                          <span className='text-xs text-gray-500'>{f.field}</span>
                        </div>
                        <span className='rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide'>{f.operator}</span>
                        <span className='rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm min-w-[3rem] text-center'>{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Schedule Details ── */}
          {activeTab === 'Schedule Details' && (() => {
            const sc = item?.scheduleConfig;
            const freq = sc?.scheduling?.frequency ?? 'Daily';
            const runsAt = sc?.scheduling?.startTime ?? '12:00 AM';
            const tz = sc?.timeZone ?? '--';
            const startedFrom = sc?.scheduling?.startDate ?? '--';
            return (
              <div>
                {/* Summary banner */}
                <div className='mb-5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg' style={{ background: 'rgba(21,93,252,0.12)' }}>
                      <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                        <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                      </svg>
                    </div>
                    <div>
                      <p className='text-xs font-bold text-gray-800'>Currently Scheduled</p>
                      <p className='text-[11px] text-blue-600 font-medium mt-0.5'>{freq} at {runsAt} · {tz} · From {startedFrom}</p>
                    </div>
                  </div>
                  <button type='button' className='flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3 w-3'>
                      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
                    </svg>
                    Edit Schedule
                  </button>
                </div>

                {/* Fields grid */}
                <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                  {[
                    {
                      label: 'Running Frequency',
                      value: freq,
                      icon: (
                        <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                          <polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'/>
                        </svg>
                      ),
                    },
                    {
                      label: 'Runs At',
                      value: runsAt,
                      icon: (
                        <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                          <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                        </svg>
                      ),
                    },
                    {
                      label: 'Time Zone',
                      value: tz,
                      icon: (
                        <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                          <circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/>
                        </svg>
                      ),
                    },
                    {
                      label: 'Started From',
                      value: startedFrom,
                      icon: (
                        <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-4 w-4'>
                          <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                        </svg>
                      ),
                    },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className='rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 hover:border-blue-100 transition-colors'>
                      <div className='flex items-center gap-2 mb-2'>
                        <div className='flex h-6 w-6 items-center justify-center rounded-md' style={{ background: 'rgba(21,93,252,0.08)' }}>
                          {icon}
                        </div>
                        <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wide'>{label}</span>
                      </div>
                      <p className='text-sm font-bold text-gray-800 truncate'>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Activity Logs ── */}
          {activeTab === 'Activity Logs' && (() => {
            const filtered = DUMMY_ACTIVITY_LOGS.filter((l) => {
              if (logSearch && !l.startTime.toLowerCase().includes(logSearch.toLowerCase())) return false;
              return true;
            });
            const totalLogPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_LOG_PAGE));
            const paginated = filtered.slice((logPage - 1) * ITEMS_PER_LOG_PAGE, logPage * ITEMS_PER_LOG_PAGE);
            return (
              <div className='flex flex-col flex-1 min-h-0'>
                {/* Filter bar */}
                <div className='flex items-center gap-2 mb-4 flex-shrink-0'>
                  <div className='relative flex-1 max-w-xs'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400'>
                      <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
                    </svg>
                    <input type='text' value={logSearch} onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                      placeholder='Search logs...'
                      className='h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50' />
                  </div>
                  <div className='relative'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400'>
                      <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                    </svg>
                    <input type='text' value={logFromDate} onChange={(e) => setLogFromDate(e.target.value)}
                      placeholder='From Date'
                      className='h-9 w-36 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50' />
                  </div>
                  <div className='relative'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400'>
                      <rect x='3' y='4' width='18' height='18' rx='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/>
                    </svg>
                    <input type='text' value={logToDate} onChange={(e) => setLogToDate(e.target.value)}
                      placeholder='To Date'
                      className='h-9 w-36 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50' />
                  </div>
                  <button type='button' onClick={() => { setLogSearch(''); setLogFromDate(''); setLogToDate(''); setLogPage(1); }}
                    className='h-9 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600'>
                    Clear
                  </button>
                </div>

                {/* Column headers */}
                <table className='w-full flex-shrink-0'>
                  <thead>
                    <tr className='border-b-2 border-gray-100'>
                      {[
                        { label: 'Start Time', w: 'w-44' },
                        { label: 'Status', w: 'w-28' },
                        { label: 'Duration', w: 'w-24' },
                        { label: 'New Records', w: 'w-28' },
                        { label: 'Total Records', w: 'w-28' },
                        { label: 'Data Size', w: 'w-24' },
                        { label: 'Action', w: 'w-20' },
                      ].map(({ label, w }) => (
                        <th key={label} className={`pb-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${w}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                </table>

                {/* Rows */}
                <div className='flex-1 min-h-0 overflow-y-auto'>
                  <table className='w-full'>
                    <tbody>
                      {paginated.map((log, i) => (
                        <tr key={i} className='border-b border-gray-50 hover:bg-blue-50/30 transition-colors group'>
                          <td className='py-3 pr-4 w-44'>
                            <span className='text-xs font-medium text-gray-700'>{log.startTime}</span>
                          </td>
                          <td className='py-3 pr-4 w-28'>
                            <span className='inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-700'>
                              <span className='h-1.5 w-1.5 rounded-full bg-green-500' />{log.status}
                            </span>
                          </td>
                          <td className='py-3 pr-4 w-24'>
                            <span className='text-xs font-semibold text-blue-600'>{log.duration}</span>
                          </td>
                          <td className='py-3 pr-4 w-28'>
                            <span className='text-xs text-gray-700'>{log.newRecords > 0 ? <span className='font-semibold text-indigo-600'>+{log.newRecords}</span> : <span className='text-gray-400'>0</span>}</span>
                          </td>
                          <td className='py-3 pr-4 w-28'>
                            <span className='text-xs text-gray-600'>{log.totalRecords.toLocaleString()}</span>
                          </td>
                          <td className='py-3 pr-4 w-24'>
                            <span className='text-xs font-medium text-gray-600'>{log.dataSize}</span>
                          </td>
                          <td className='py-3 w-20'>
                            <div className='flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity'>
                              <button type='button' onClick={() => setSelectedLog(log)}
                                className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'>
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-3.5 w-3.5'>
                                  <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>
                                </svg>
                              </button>
                              <button type='button'
                                className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:bg-gray-50'>
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-3.5 w-3.5'>
                                  <circle cx='12' cy='5' r='1' fill='currentColor'/><circle cx='12' cy='12' r='1' fill='currentColor'/><circle cx='12' cy='19' r='1' fill='currentColor'/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className='flex-shrink-0 mt-3 flex items-center justify-between border-t border-gray-100 pt-3'>
                  <span className='text-xs text-gray-500'>
                    Showing <span className='font-semibold text-gray-700'>{Math.min((logPage - 1) * ITEMS_PER_LOG_PAGE + 1, filtered.length)}</span> to <span className='font-semibold text-gray-700'>{Math.min(logPage * ITEMS_PER_LOG_PAGE, filtered.length)}</span> of <span className='font-semibold text-gray-700'>{filtered.length}</span> logs
                  </span>
                  <div className='flex items-center gap-1'>
                    <button type='button' onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logPage === 1}
                      className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&lt;</button>
                    {Array.from({ length: totalLogPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} type='button' onClick={() => setLogPage(p)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${logPage === p ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                        {p}
                      </button>
                    ))}
                    <button type='button' onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))} disabled={logPage === totalLogPages}
                      className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&gt;</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Archive History Modal */}
      {selectedLog && <ArchiveHistoryModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Archived Records — commented out, revisit later */}
      {false && <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between px-5 py-3 border-b border-gray-100'>
          <span className='text-sm font-semibold text-gray-700'>Archived Records</span>
          <div className='relative'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400'>
              <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
            </svg>
            <input
              type='text'
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder='Search Record'
              className='h-8 w-48 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100'
            />
          </div>
        </div>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-gray-100 bg-gray-50/50'>
              <th className='w-10 px-5 py-3'>
                <input
                  type='checkbox'
                  checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                  onChange={toggleAll}
                  className='h-4 w-4 rounded accent-blue-600 cursor-pointer'
                />
              </th>
              {['Record ID', 'Record Name', 'Object', 'Action'].map((col) => (
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
        </table>
        <div className='overflow-y-auto' style={{ maxHeight: '220px' }}>
          <table className='w-full'>
            <tbody className='divide-y divide-gray-50'>
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className='hover:bg-gray-50/50 transition-colors'>
                  <td className='w-10 px-5 py-3'>
                    <input
                      type='checkbox'
                      checked={selectedIds.has(rec.id)}
                      onChange={() => toggleSelect(rec.id)}
                      className='h-4 w-4 rounded accent-blue-600 cursor-pointer'
                    />
                  </td>
                  <td className='px-5 py-3 text-xs text-gray-600 font-mono'>{rec.id}</td>
                  <td className='px-5 py-3 text-xs text-gray-700'>{rec.name}</td>
                  <td className='px-5 py-3 text-xs text-gray-500'>{rec.object}</td>
                  <td className='px-5 py-3'>
                    <button type='button' className='text-xs font-semibold text-blue-600 hover:underline'>
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

    </div>
  );
}
