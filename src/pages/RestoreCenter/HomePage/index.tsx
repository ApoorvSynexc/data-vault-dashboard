import type { ReactNode } from 'react';
import Typography from '../../../components/Typography';
import Table from '../../../components/Table';
import type { TableColumn } from '../../../components/Table';

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftRestore = {
  id: string;
  name: string;
  tags: string;
  sourceType: 'Backup' | 'Archive';
  sourceLabel: string;
  started: string;
  lastEdited: string;
};

type RecentRestore = {
  id: string;
  name: string;
  date: string;
  sourceType: 'Backup' | 'Archive';
  status: 'DONE' | 'PARTIAL' | 'FAILED' | 'RUNNING';
  records: number;
};

type PinnedTemplate = {
  id: string;
  name: string;
  description: string;
};

// ── Stub data (replace with API calls) ───────────────────────────────────────

const DRAFT_RESTORES: DraftRestore[] = [
  { id: '1', name: 'Untitled — May 27, 10:30 AM', tags: 'No tags', sourceType: 'Backup', sourceLabel: 'May 27, 06:00 AM', started: 'Today 10:30', lastEdited: '12 min ago' },
  { id: '2', name: 'Q1 Cleanup Restore', tags: 'cleanup, audit', sourceType: 'Archive', sourceLabel: 'Closed Cases — 18mo', started: 'May 24, 09:14 AM', lastEdited: '3 days ago' },
];

const RECENT_RESTORES: RecentRestore[] = [
  { id: '1', name: 'INC-4711 Recovery', date: 'Today 10:30', sourceType: 'Backup', status: 'DONE', records: 8423 },
  { id: '2', name: 'Weekly Archive Pull', date: 'Yesterday', sourceType: 'Archive', status: 'DONE', records: 2100 },
  { id: '3', name: 'Leads Restore Q1', date: 'May 25', sourceType: 'Backup', status: 'PARTIAL', records: 15000 },
  { id: '4', name: 'Sandbox Refresh UAT', date: 'May 22', sourceType: 'Backup', status: 'FAILED', records: 0 },
];

const PINNED_TEMPLATES: PinnedTemplate[] = [
  { id: '1', name: "Restore Yesterday's Deleted Leads", description: 'Backup → Same Org · Deleted-only mode' },
  { id: '2', name: 'Roll Back Bulk Opportunity Update', description: 'Backup → Same Org · Overwrite mode' },
  { id: '3', name: 'Refresh UAT Sandbox (Masked)', description: 'Backup → Sandbox · PII masked' },
];

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

function SourceBadge({ type }: { type: 'Backup' | 'Archive' }) {
  return type === 'Backup'
    ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>Backup</span>
    : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700'>Archive</span>;
}

function StatusBadge({ status }: { status: RecentRestore['status'] }) {
  const map: Record<RecentRestore['status'], { cls: string; label: string }> = {
    DONE:    { cls: 'bg-green-100 text-green-700', label: '✓ Done' },
    PARTIAL: { cls: 'bg-yellow-100 text-yellow-700', label: '⚠ Partial' },
    FAILED:  { cls: 'bg-red-100 text-red-700', label: '✗ Failed' },
    RUNNING: { cls: 'bg-blue-100 text-blue-700', label: '● Running' },
  };
  const { cls, label } = map[status];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className='flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='flex items-center gap-3 border-b border-gray-100 px-5 py-3 flex-shrink-0'>
        <div className='min-w-0'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>{title}</Typography>
          {subtitle && <Typography variant='bodySm' color='muted' className='mt-0.5'>{subtitle}</Typography>}
        </div>
        {action && <div className='ml-auto flex-shrink-0'>{action}</div>}
      </div>
      {children}
    </section>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onNewRestore: () => void;
  onViewHistory: () => void;
  onViewDrafts: () => void;
  onViewTemplates: () => void;
  onViewJob: () => void;
  onArchiveRestore?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RestoreCenterHomePage({ onNewRestore, onViewHistory, onViewDrafts, onViewTemplates, onViewJob, onArchiveRestore }: Props) {

  // ── Draft table columns ───────────────────────────────────────────────────
  const draftColumns: TableColumn<DraftRestore>[] = [
    {
      key: 'name',
      header: 'Job Name',
      render: (row) => (
        <div>
          <p className='text-sm font-semibold text-gray-900'>{row.name}</p>
          <p className='text-xs text-gray-400 mt-0.5'>{row.tags}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => (
        <div className='flex items-center gap-1.5 flex-wrap'>
          <SourceBadge type={row.sourceType} />
          <span className='text-xs text-gray-500'>{row.sourceLabel}</span>
        </div>
      ),
    },
    {
      key: 'started',
      header: 'Started',
      render: (row) => <span className='text-xs text-gray-600'>{row.started}</span>,
    },
    {
      key: 'lastEdited',
      header: 'Last Edited',
      render: (row) => <span className='text-xs text-gray-500'>{row.lastEdited}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700'>
          📝 Draft
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <div className='flex items-center gap-2'>
          <button
            onClick={onNewRestore}
            className='text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors'
            style={{ background: '#155DFC' }}
          >
            Resume →
          </button>
          <button className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
            Discard
          </button>
        </div>
      ),
    },
  ];

  // ── Recent restores columns ───────────────────────────────────────────────
  const recentColumns: TableColumn<RecentRestore>[] = [
    {
      key: 'name',
      header: 'Job Name',
      render: (row) => (
        <div>
          <p className='text-sm font-semibold text-gray-900'>{row.name}</p>
          <p className='text-xs text-gray-400 mt-0.5'>{row.date}</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => <SourceBadge type={row.sourceType} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'records',
      header: 'Records',
      render: (row) => <span className='text-sm tabular-nums text-gray-700'>{row.records.toLocaleString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <button
          onClick={onViewJob}
          className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          View
        </button>
      ),
    },
  ];

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
        <button
          onClick={onArchiveRestore}
          className='flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-opacity hover:opacity-90 border-2 border-dashed border-purple-300 bg-purple-50'
        >
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100'>
            <svg width='20' height='20' fill='none' stroke='#7C3AED' strokeWidth='2' viewBox='0 0 24 24'>
              <path d='M5 8l4 4 4-4'/><rect x='3' y='3' width='18' height='18' rx='2'/>
            </svg>
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-purple-900 whitespace-nowrap'>Archive Restore</p>
            <p className='text-xs text-purple-600 mt-0.5 leading-relaxed whitespace-nowrap'>Restore from vault entries</p>
          </div>
          <svg width='16' height='16' fill='none' stroke='#7C3AED' strokeWidth='2' viewBox='0 0 24 24' className='ml-2 flex-shrink-0'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
        </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm flex-shrink-0'>
          <Typography as='h3' variant='sectionTitle' color='secondary' className='mb-2.5'>Restore Status</Typography>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <MetricCard label='Total Restores' value={24}
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-.29-4.36'/></svg>}
            />
            <MetricCard label='Running Now' value='01'
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>}
            />
            <MetricCard label='Failed (30d)' value='02'
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>}
            />
            <MetricCard label='Records Restored' value='1.2M'
              icon={<svg viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-5 w-5'><polyline points='20 6 9 17 4 12'/></svg>}
            />
          </div>
        </div>

        {/* ── Draft Restores Table ── */}
        <div className='flex-shrink-0'>
          <Panel
            title='Draft Restores'
            subtitle='Unfinished restore jobs you can resume'
            action={
              <button onClick={onViewDrafts} className='text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1'>
                View All Drafts
              </button>
            }
          >
            <Table
              columns={draftColumns}
              rows={DRAFT_RESTORES}
              getRowKey={(r) => r.id}
              borderless
              headerVariant='uppercase'
              cellPaddingClassName='px-5 py-3'
              rowClassName='border-b border-gray-50 hover:bg-gray-50 transition-colors'
              emptyState={<span className='text-sm text-gray-400'>No draft restores.</span>}
            />
          </Panel>
        </div>

        {/* ── Recent Restores + Pinned Templates ── */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0'>

          {/* Recent Restores */}
          <Panel
            title='Recent Restores'
            subtitle='Last 5 jobs'
            action={
              <button onClick={onViewHistory} className='text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1'>
                View All
              </button>
            }
          >
            <Table
              columns={recentColumns}
              rows={RECENT_RESTORES}
              getRowKey={(r) => r.id}
              borderless
              headerVariant='uppercase'
              cellPaddingClassName='px-5 py-3'
              rowClassName='border-b border-gray-50 hover:bg-gray-50 transition-colors'
              emptyState={<span className='text-sm text-gray-400'>No recent restores.</span>}
            />
          </Panel>

          {/* Pinned Templates */}
          <Panel
            title='Pinned Templates'
            subtitle='Frequently used restores'
            action={
              <button onClick={onViewTemplates} className='text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1'>
                All Templates
              </button>
            }
          >
            <div className='flex flex-col gap-2 p-4'>
              {PINNED_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={onNewRestore}
                  className='w-full text-left rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 hover:border-gray-200 transition-all'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-sm font-semibold text-gray-900 truncate'>{t.name}</p>
                    <span className='flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700'>
                      ★ Pinned
                    </span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>{t.description}</p>
                </button>
              ))}
            </div>
          </Panel>

        </div>

      </div>
    </div>
  );
}
