import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../../services/archival/archival.service';
import { useBackupConfigService } from '../../../services/backup-config/backup-config.service';
import type { BackupJobItem } from '../../../services/backup-config/backup-config.service';
import { formatBytes } from '../../../utils';
import ArchiveJobDetailsModal from './ArchiveJobDetailsModal';

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

const TABS = ['Archive Details', 'Filters & Schedule', 'Activity Logs'] as const;
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

// ── Job helpers ───────────────────────────────────────────────────────────────

function calcDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt || !completedAt) return '--';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return '--';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function fmtJobTime(iso?: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}



export default function ArchiveDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const archivalService = useArchivalService();
  const backupConfigService = useBackupConfigService();
  const [activeTab, setActiveTab] = useState<Tab>('Archive Details');
  const [recordSearch, setRecordSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [logSearch, setLogSearch] = useState('');
  const [logFromDate, setLogFromDate] = useState('');
  const [logToDate, setLogToDate] = useState('');
  const [logCursor, setLogCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [logPageIndex, setLogPageIndex] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobsResponse, isLoading: jobsLoading } = useQuery({
    queryKey: ['archival-jobs', slug, logCursor],
    queryFn: () => backupConfigService.listBackupJobs(slug!, true, logCursor ?? undefined, 20),
    staleTime: 30_000,
    enabled: !!slug,
  });

  const jobRows: BackupJobItem[] = (jobsResponse as any)?.data ?? [];
  const jobsMeta = (jobsResponse as any)?.meta ?? {};
  const nextCursor: string | null = jobsMeta?.nextCursor ?? null;
  const totalJobRecords: number = jobsMeta?.totalRecords ?? jobRows.length;

  const handleLogNext = () => {
    if (!nextCursor) return;
    const newHistory = [...cursorHistory, nextCursor];
    setCursorHistory(newHistory);
    setLogPageIndex(logPageIndex + 1);
    setLogCursor(nextCursor);
  };

  const handleLogPrev = () => {
    if (logPageIndex === 0) return;
    const newHistory = cursorHistory.slice(0, -1);
    setCursorHistory(newHistory);
    const prevCursor = newHistory[newHistory.length - 1] ?? null;
    setLogPageIndex(logPageIndex - 1);
    setLogCursor(prevCursor);
  };

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

          {/* ── Filters & Schedule ── */}
          {activeTab === 'Filters & Schedule' && (() => {
            const objects: any[] = item?.objects ?? [];
            const rootSc = item?.scheduleConfig ?? null;

            // Flatten tree preserving last-child info for tree lines
            type TreeRow = { obj: any; depth: number; isLastAtDepth: boolean[] };
            const treeRows: TreeRow[] = [];
            const walk = (items: any[], depth: number, parentIsLast: boolean[]) => {
              items.forEach((o, i) => {
                const isLast = i === items.length - 1;
                treeRows.push({ obj: o, depth, isLastAtDepth: [...parentIsLast, isLast] });
                if (o.children?.length) walk(o.children, depth + 1, [...parentIsLast, isLast]);
              });
            };
            walk(objects, 0, []);

            const parentCount = objects.length;
            const childCount  = treeRows.length - parentCount;
            const totalFilters = treeRows.reduce((acc, { obj }) => acc + (obj.field?.length ?? 0), 0);

            return (
              <div className='flex flex-col gap-4'>

                {/* Stats row */}
                <div className='flex items-center gap-3'>
                  {[
                    { label: 'Parent Objects', value: parentCount, color: '#155DFC', bg: 'rgba(21,93,252,0.07)' },
                    { label: 'Child Objects',  value: childCount,  color: '#6366f1', bg: 'rgba(99,102,241,0.07)' },
                    { label: 'Total Filters',  value: totalFilters, color: '#059669', bg: 'rgba(5,150,105,0.07)' },
                  ].map(c => (
                    <div key={c.label} className='flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border'
                      style={{ background: c.bg, borderColor: c.bg.replace('0.07', '0.15') }}>
                      <p className='text-lg font-bold leading-none' style={{ color: c.color }}>{c.value}</p>
                      <p className='text-[11px] font-medium text-gray-500'>{c.label}</p>
                    </div>
                  ))}
                  {rootSc && (
                    <div className='ml-auto flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5'>
                      <svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' className='h-3.5 w-3.5 flex-shrink-0'>
                        <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                      </svg>
                      <div>
                        <p className='text-[10px] text-gray-400 leading-none'>Default schedule</p>
                        <p className='text-[11px] font-bold text-blue-700 leading-tight mt-0.5 uppercase'>
                          {rootSc?.scheduling?.frequency ?? '--'}
                          {rootSc?.scheduling?.startTime ? ` · ${rootSc.scheduling.startTime}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tree grid */}
                {treeRows.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-14 rounded-xl border border-gray-100 bg-gray-50/40'>
                    <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 border border-gray-100'>
                      <svg viewBox='0 0 24 24' fill='none' stroke='#9ca3af' strokeWidth='1.5' className='h-5 w-5'>
                        <ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'/><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'/>
                      </svg>
                    </div>
                    <p className='text-sm font-medium text-gray-500'>No objects configured</p>
                  </div>
                ) : (
                  <div className='rounded-xl border border-gray-100 overflow-hidden'>
                    {/* Sticky header */}
                    <div className='grid sticky top-0 z-10 bg-gray-50 border-b border-gray-100 px-4 py-2.5'
                      style={{ gridTemplateColumns: '260px 1fr 220px' }}>
                      <span className='text-[11px] font-semibold text-gray-400 uppercase tracking-wide'>Object / Relationship</span>
                      <span className='text-[11px] font-semibold text-gray-400 uppercase tracking-wide'>Field Filters</span>
                      <span className='text-[11px] font-semibold text-gray-400 uppercase tracking-wide'>Schedule</span>
                    </div>

                    {treeRows.map(({ obj, depth, isLastAtDepth }, idx) => {
                      const fields: any[] = obj.field ?? [];
                      const isParent = depth === 0;
                      const osc = isParent ? (obj.scheduleConfig ?? rootSc) : null;
                      const isObjSchedule = isParent && !!obj.scheduleConfig;
                      const oscFreq = osc?.scheduling?.frequency;
                      const oscTime = osc?.scheduling?.startTime ?? null;
                      const oscTz   = osc?.timeZone ?? null;
                      const oscDate = osc?.scheduling?.startDate ?? null;
                      const conditionType: string = obj.condition?.type ?? 'AND';
                      const hasChildren = !!(obj.children?.length);

                      return (
                        <div
                          key={obj.id ?? idx}
                          className={[
                            'grid border-b last:border-0 transition-colors',
                            isParent
                              ? 'bg-white hover:bg-blue-50/30 border-gray-100'
                              : 'bg-gray-50/40 hover:bg-indigo-50/30 border-gray-50',
                          ].join(' ')}
                          style={{ gridTemplateColumns: '260px 1fr 220px' }}
                        >
                          {/* Object column */}
                          <div className='flex items-center gap-0 py-3 pr-3' style={{ paddingLeft: '16px' }}>
                            {/* Tree lines — border-based, reliable in any row height */}
                            {Array.from({ length: depth }).map((_, di) => {
                              const isCurrentLevel = di === depth - 1;
                              const ancestorContinues = !isLastAtDepth[di];
                              return (
                                <div
                                  key={di}
                                  className='self-stretch flex-shrink-0 relative'
                                  style={{ width: 18 }}
                                >
                                  {/* Vertical line — full height for pass-through, half-height for last connector */}
                                  {(isCurrentLevel || ancestorContinues) && (
                                    <div
                                      className='absolute'
                                      style={{
                                        left: 8,
                                        top: 0,
                                        width: 1,
                                        bottom: isCurrentLevel && isLastAtDepth[di] ? '50%' : 0,
                                        background: '#e2e8f0',
                                      }}
                                    />
                                  )}
                                  {/* Horizontal elbow at the connector level */}
                                  {isCurrentLevel && (
                                    <div
                                      className='absolute'
                                      style={{ left: 8, top: '50%', width: 10, height: 1, background: '#e2e8f0' }}
                                    />
                                  )}
                                </div>
                              );
                            })}

                            {/* Icon */}
                            <div
                              className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md mr-2'
                              style={{ background: isParent ? 'rgba(21,93,252,0.08)' : 'rgba(99,102,241,0.08)' }}
                            >
                              <svg viewBox='0 0 24 24' fill='none' stroke={isParent ? '#155DFC' : '#6366f1'} strokeWidth='2' className='h-3 w-3'>
                                <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
                              </svg>
                            </div>

                            {/* Name + meta */}
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-center gap-1.5 flex-wrap'>
                                <p className='text-xs font-semibold text-gray-800 truncate'>{obj.name ?? '--'}</p>
                                {isParent && hasChildren && (() => {
                                  const countDesc = (children: any[]): number =>
                                    children.reduce((n, c) => n + 1 + (c.children?.length ? countDesc(c.children) : 0), 0);
                                  const total = countDesc(obj.children);
                                  return (
                                    <span className='rounded-full border px-1.5 py-px text-[9px] font-semibold'
                                      style={{ background: 'rgba(21,93,252,0.06)', borderColor: 'rgba(21,93,252,0.15)', color: '#155DFC' }}>
                                      {total} child{total !== 1 ? 'ren' : ''}
                                    </span>
                                  );
                                })()}
                                {fields.length > 0 && (
                                  <span className='rounded-full border px-1.5 py-px text-[9px] font-semibold'
                                    style={{ background: 'rgba(5,150,105,0.06)', borderColor: 'rgba(5,150,105,0.2)', color: '#059669' }}>
                                    {fields.length} filter{fields.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {obj.fieldApiName && (
                                <p className='text-[10px] text-gray-400 truncate mt-0.5'>
                                  <span className='text-gray-300'>via</span> {obj.fieldApiName}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Filters column */}
                          <div className='px-4 py-3 flex flex-col gap-1.5 justify-center border-l border-gray-100'>
                            {fields.length === 0 ? (
                              <span className='text-[11px] text-gray-300 italic'>—</span>
                            ) : (
                              <>
                                {fields.map((f: any, fi: number) => (
                                  <div key={fi} className='flex items-center gap-1.5 flex-wrap'>
                                    <span className='text-[11px] font-medium text-gray-700'>{f.name}</span>
                                    <span className='rounded border border-blue-200 bg-blue-50 px-1.5 py-px text-[9px] font-bold text-blue-600 uppercase tracking-wide'>{f.filter?.operator ?? '='}</span>
                                    <span className='rounded border border-gray-200 bg-white px-2 py-px text-[11px] font-medium text-gray-700 shadow-sm font-mono'>{f.filter?.value ?? '--'}</span>
                                    {fi < fields.length - 1 && (
                                      <span className='text-[9px] font-bold px-1 py-px rounded'
                                        style={{ background: conditionType === 'AND' ? 'rgba(21,93,252,0.08)' : 'rgba(217,119,6,0.08)', color: conditionType === 'AND' ? '#155DFC' : '#D97706' }}>
                                        {conditionType}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>

                          {/* Schedule column */}
                          <div className='px-4 py-3 flex flex-col justify-center border-l border-gray-100'>
                            {!isParent ? (
                              <span className='text-[11px] text-gray-200'>—</span>
                            ) : osc ? (
                              <div className='flex flex-col gap-0.5'>
                                <div className='flex items-center gap-1.5 flex-wrap'>
                                  <span className='rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border'
                                    style={{ background: isObjSchedule ? 'rgba(21,93,252,0.08)' : 'rgba(148,163,184,0.1)', borderColor: isObjSchedule ? 'rgba(21,93,252,0.2)' : '#e2e8f0', color: isObjSchedule ? '#155DFC' : '#64748b' }}>
                                    {oscFreq}
                                  </span>
                                  {!isObjSchedule && (
                                    <span className='text-[9px] text-gray-400 italic'>inherited</span>
                                  )}
                                </div>
                                {(oscTime || oscTz) && (
                                  <p className='text-[10px] text-gray-500 leading-tight mt-0.5'>
                                    {oscTime && <span className='font-medium'>{oscTime}</span>}
                                    {oscTime && oscTz && <span className='text-gray-300'> · </span>}
                                    {oscTz && <span>{oscTz}</span>}
                                  </p>
                                )}
                                {oscDate && (
                                  <p className='text-[10px] text-gray-400'>from {oscDate}</p>
                                )}
                              </div>
                            ) : (
                              <span className='text-[11px] text-gray-400 italic'>Not set</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Activity Logs ── */}
          {activeTab === 'Activity Logs' && (
            <div className='flex flex-col flex-1 min-h-0'>
              {/* Filter bar */}
              <div className='flex items-center gap-2 mb-4 flex-shrink-0'>
                <div className='relative flex-1 max-w-xs'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400'>
                    <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
                  </svg>
                  <input type='text' value={logSearch} onChange={(e) => setLogSearch(e.target.value)}
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
                <button type='button' onClick={() => { setLogSearch(''); setLogFromDate(''); setLogToDate(''); setLogCursor(null); setCursorHistory([null]); setLogPageIndex(0); }}
                  className='h-9 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600'>
                  Clear
                </button>
              </div>

              {/* Single table — sticky thead keeps headers aligned with rows */}
              <div className='flex-1 min-h-0 overflow-y-auto'>
                <table className='w-full border-collapse'>
                  <thead className='sticky top-0 z-10 bg-white'>
                    <tr className='border-b-2 border-gray-100'>
                      <th className='pb-2.5 pt-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide pr-4 whitespace-nowrap'>Start Time</th>
                      <th className='pb-2.5 pt-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide pr-4 whitespace-nowrap'>Status</th>
                      <th className='pb-2.5 pt-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide pr-4 whitespace-nowrap'>Duration</th>
                      <th className='pb-2.5 pt-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide pr-4 whitespace-nowrap'>Records Uploaded</th>
                      <th className='pb-2.5 pt-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide pr-4 whitespace-nowrap'>Records Deleted</th>
                      <th className='pb-2.5 pt-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide pr-4 whitespace-nowrap'>Data Size</th>
                      <th className='pb-2.5 pt-1 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsLoading ? (
                      <tr><td colSpan={7} className='py-12 text-center'>
                        <div className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600' />
                      </td></tr>
                    ) : jobRows.length === 0 ? (
                      <tr><td colSpan={7} className='py-12 text-center text-sm font-medium text-gray-500'>No activity logs found</td></tr>
                    ) : jobRows.map((job, i) => {
                      const jobStatus = job.status?.toUpperCase() ?? '';
                      const statusColor: Record<string, string> = {
                        SUCCESS: 'border-green-200 bg-green-50 text-green-700',
                        COMPLETED: 'border-green-200 bg-green-50 text-green-700',
                        FAILED: 'border-red-200 bg-red-50 text-red-700',
                        RUNNING: 'border-blue-200 bg-blue-50 text-blue-700',
                        PENDING: 'border-yellow-200 bg-yellow-50 text-yellow-700',
                      };
                      const dotColor: Record<string, string> = {
                        SUCCESS: 'bg-green-500', COMPLETED: 'bg-green-500',
                        FAILED: 'bg-red-500', RUNNING: 'bg-blue-500', PENDING: 'bg-yellow-400',
                      };
                      const recordsUploaded = job.object?.reduce((acc, o) => acc + (o.completedRecordCount ?? 0), 0) ?? (job.recordCount ?? 0);
                      const recordsDeleted  = job.object?.reduce((acc, o) => acc + ((o as any).deletedSuccessRecordCount ?? 0), 0) ?? 0;
                      const totalSizeBytes  = job.object?.reduce((acc, o) => acc + (o.sizeInBytes ?? 0), 0) ?? (job.sizeInBytes ?? 0);
                      return (
                        <tr key={job.backupJobId ?? i} className='border-b border-gray-50 hover:bg-blue-50/30 transition-colors group'>
                          <td className='py-3 pr-4 whitespace-nowrap'>
                            <span className='text-xs font-medium text-gray-700'>{fmtJobTime(job.startedAt)}</span>
                          </td>
                          <td className='py-3 pr-4'>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusColor[jobStatus] ?? 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${dotColor[jobStatus] ?? 'bg-gray-400'}`} />
                              {job.status ?? '--'}
                            </span>
                          </td>
                          <td className='py-3 pr-4'>
                            <span className='text-xs font-semibold text-blue-600'>{calcDuration(job.startedAt, job.completedAt)}</span>
                          </td>
                          <td className='py-3 pr-4'>
                            <span className='text-xs font-semibold text-green-600'>{recordsUploaded.toLocaleString()}</span>
                          </td>
                          <td className='py-3 pr-4'>
                            <span className='text-xs font-semibold text-blue-600'>{recordsDeleted.toLocaleString()}</span>
                          </td>
                          <td className='py-3 pr-4'>
                            <span className='text-xs font-medium text-gray-600'>{formatBytes(totalSizeBytes || undefined)}</span>
                          </td>
                          <td className='py-3'>
                            <div className='flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity'>
                              <button type='button' onClick={() => setSelectedJobId(job.backupJobId ?? null)}
                                className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'>
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-3.5 w-3.5'>
                                  <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className='flex-shrink-0 mt-3 flex items-center justify-between border-t border-gray-100 pt-3'>
                <span className='text-xs text-gray-500'>
                  Showing <span className='font-semibold text-gray-700'>{totalJobRecords === 0 ? 0 : logPageIndex * 20 + 1}</span> to <span className='font-semibold text-gray-700'>{Math.min((logPageIndex + 1) * 20, totalJobRecords)}</span> of <span className='font-semibold text-gray-700'>{totalJobRecords}</span> logs
                </span>
                <div className='flex items-center gap-1'>
                  <button type='button' onClick={handleLogPrev} disabled={logPageIndex === 0}
                    className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&lt;</button>
                  <span className='flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-sm'>
                    {logPageIndex + 1}
                  </span>
                  <button type='button' onClick={handleLogNext} disabled={!nextCursor}
                    className='flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-500 transition hover:bg-gray-100 disabled:opacity-30'>&gt;</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archive Job Details Modal */}
      {selectedJobId && slug && (
        <ArchiveJobDetailsModal
          backupJobId={selectedJobId}
          configSlug={slug}
          onClose={() => setSelectedJobId(null)}
        />
      )}

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
