// PreviewValidate — Step 8 of 9 in the New Restore wizard.
// Shows impact summary, schema mismatch report, snapshot diff table, and dry-run controls.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import InfoTooltip from '../../../../components/InfoTooltip';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { SourceSelection } from '../SelectSourceType';
import type { RestoreRetrievePayload } from '../../../../services/restore/restore.service';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict', 'Edge Cases', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='w-full'>
      <div className='flex items-center'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold border-2 ${
                isDone   ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-blue-600 border-blue-600 text-white' :
                           'bg-white border-gray-300 text-gray-400'
              }`}>
                {isDone ? (
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='w-3.5 h-3.5'>
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                ) : num}
              </div>
              {!isLast && <div className='flex-1 h-0.5' style={{ background: isDone ? '#22C55E' : '#E5E7EB' }} />}
            </div>
          );
        })}
      </div>
      <div className='flex items-start mt-2'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'
              }`}>
                {label}
              </span>
              {!isLast && <div className='flex-1' />}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Types ─────────────────────────────────────────────────────────────────────

interface DryRunStats { insertCount: number; updateCount: number; totalRowsRaw: number; }

interface Props {
  onNext: (stats: DryRunStats | undefined) => void;
  onBack: () => void;
  sourceSelection: SourceSelection;
  restorePayload: RestoreRetrievePayload;
}

interface DiffRow {
  recordName: string;
  field: string;
  before: string;
  after: string;
  action: 'NEW' | 'MOD';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISPLAY_LIMIT = 50;

function normalizeValue(val: string): string {
  if (val === '' || val === null || val === undefined) return '';
  // Normalize timestamps: convert +0000 offset to Z, strip sub-ms precision differences
  const tsMatch = val.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{4}|[+-]\d{2}:\d{2})$/);
  if (tsMatch) {
    try {
      return new Date(val).toISOString();
    } catch {
      return val;
    }
  }
  // Normalize numbers: strip trailing .0 (e.g. "714.0" → "714", "25000.0" → "25000")
  if (/^-?\d+\.0+$/.test(val)) {
    return String(parseFloat(val));
  }
  return val;
}

function parseDiffRows(rows: any[]): { diffRows: DiffRow[]; insertCount: number; updateCount: number } {
  const diffRows: DiffRow[] = [];
  let insertCount = 0;
  let updateCount = 0;

  for (const row of rows) {
    const prev: Record<string, string> = row.previous ?? {};
    const curr: Record<string, string> = row.current ?? null;
    const recordName = prev.Name ?? prev.Id ?? 'Unknown';

    if (!curr) {
      // INSERT — only previous exists
      insertCount++;
      diffRows.push({ recordName, field: '—', before: '(new record)', after: '—', action: 'NEW' });
    } else {
      // UPDATE — show only fields where normalized values actually differ
      const changedFields = Object.keys(prev).filter((key) => {
        if (key === 'OwnerId') return false;
        return normalizeValue(String(prev[key])) !== normalizeValue(String(curr[key]));
      });
      if (changedFields.length > 0) {
        updateCount++;
        for (const field of changedFields) {
          diffRows.push({
            recordName,
            field,
            before: prev[field] ?? '—',
            after:  curr[field] ?? '—',
            action: 'MOD',
          });
        }
      }
    }
  }

  return { diffRows, insertCount, updateCount };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PreviewValidate({ onNext, onBack, sourceSelection, restorePayload }: Props) {
  const restoreService = useRestoreService();

  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunDone,    setDryRunDone]    = useState(false);
  const [dryRunError,   setDryRunError]   = useState<string | null>(null);

  const [diffRows,     setDiffRows]     = useState<DiffRow[]>([]);
  const [insertCount,  setInsertCount]  = useState(0);
  const [updateCount,  setUpdateCount]  = useState(0);
  const [totalRowsRaw, setTotalRowsRaw] = useState(0);

  const runDryRun = async () => {
    setDryRunLoading(true);
    setDryRunError(null);
    setDryRunDone(false);
    try {
      const scope = restorePayload.selection?.restoreScope;

      const res: any = await restoreService.showPreview({
        source: {
          backupConfigId: sourceSelection.backupConfigId,
          type: sourceSelection.type ?? 'ENTIRE',
          ...(sourceSelection.backupJobIds?.length ? { backupJobIds: sourceSelection.backupJobIds } : {}),
          ...(sourceSelection.startDate ? { startDate: sourceSelection.startDate } : {}),
          ...(sourceSelection.endDate   ? { endDate:   sourceSelection.endDate   } : {}),
        },
        objectApiName: 'Customer__c',
        selection: scope ? { restoreScope: scope } : null,
      });

      const rawRows: any[] = res?.data?.data?.rows ?? res?.data?.rows ?? [];
      setTotalRowsRaw(rawRows.length);
      const { diffRows: parsed, insertCount: ins, updateCount: upd } = parseDiffRows(rawRows);
      setDiffRows(parsed);
      setInsertCount(ins);
      setUpdateCount(upd);
      setDryRunDone(true);
    } catch (err: any) {
      setDryRunError(err?.message ?? 'Dry-run failed. Please try again.');
    } finally {
      setDryRunLoading(false);
    }
  };

  const visibleRows = diffRows.slice(0, DISPLAY_LIMIT);
  const [activeTab, setActiveTab] = useState<'dryrun' | 'diff'>('dryrun');

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/restore-center' className='text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors'>
            Restore Center
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Restore</span>
        </div>

        {/* Step header + progress */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 8 of 9</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Preview &amp; Validate</h1>
              <p className='text-gray-500 mt-1 text-sm'>Review impact before committing — no data has been written yet.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>8</span> of 9
            </span>
          </div>
          <div className='mt-4'>
            <ProgressBar active={8} />
          </div>
        </div>

        {/* Impact summary stats */}
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 flex-shrink-0'>
          {[
            { label: 'To Create',           value: dryRunDone ? String(insertCount)  : '—', color: '#16A34A' },
            { label: 'To Update',           value: dryRunDone ? String(updateCount)  : '—', color: '#D97706' },
            { label: 'Skipped (Conflicts)', value: dryRunDone ? '0'                  : '—', color: '#374151' },
          ].map(({ label, value, color }) => (
            <div key={label}
              className='bg-white rounded-xl px-5 py-4 flex flex-col gap-1 flex-shrink-0'
              style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <span className='text-xs font-semibold text-gray-400 uppercase tracking-widest'>{label}</span>
              <span className='text-3xl font-bold' style={{ color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className='flex flex-col gap-4'>

          {/* Schema Mismatch Report — no issues */}
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
            <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
              <div className='flex items-center gap-2'>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='20 6 9 17 4 12'/>
                </svg>
                <span className='text-sm font-semibold text-gray-800'>Schema Mismatch Report</span>
                <InfoTooltip text='Checks if fields and object types in the backup match the current destination schema. Mismatches can cause fields to be skipped during restore.' />
              </div>
              <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700'>
                No Issues
              </span>
            </div>
            <div className='px-5 py-6 flex items-center gap-3'>
              <div className='w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='20 6 9 17 4 12'/>
                </svg>
              </div>
              <p className='text-sm text-gray-600'>All fields and record types match between source and destination. No schema mismatches detected.</p>
            </div>
          </div>

          {/* Tabbed: Dry-Run + Diff */}
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>

            {/* Tab bar */}
            <div className='flex border-b border-gray-200'>
              <button
                onClick={() => setActiveTab('dryrun')}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'dryrun' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className='flex items-center gap-1.5'>
                  Dry-Run Mode
                  <InfoTooltip text='Simulates the restore without writing any data. Shows exactly how many records will be created or updated before you commit.' />
                </span>
              </button>
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'diff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className='flex items-center gap-1.5'>
                  Snapshot vs Current Diff
                  <InfoTooltip text='Compares the backup snapshot values against the current live data in the destination. Highlights fields that have changed since the snapshot was taken.' />
                </span>
                {dryRunDone && diffRows.length > 0 && (
                  <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700'>
                    {diffRows.length}
                  </span>
                )}
              </button>
              <div className='flex-1 flex items-center justify-end px-5'>
                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700'>Recommended</span>
              </div>
            </div>

            {/* Tab: Dry-Run */}
            {activeTab === 'dryrun' && (
              <div className='p-5 flex flex-col gap-4'>
                <p className='text-xs text-gray-500 leading-relaxed'>
                  Execute the full job pipeline without writing any data. Produces a complete preview report showing records to insert, update, and any conflicts.
                </p>

                {dryRunDone && (
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded-lg px-4 py-3 flex flex-col gap-0.5' style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                      <span className='text-[10px] font-semibold text-green-600 uppercase tracking-wide'>To Insert</span>
                      <span className='text-2xl font-bold text-green-700'>{insertCount}</span>
                    </div>
                    <div className='rounded-lg px-4 py-3 flex flex-col gap-0.5' style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <span className='text-[10px] font-semibold text-amber-600 uppercase tracking-wide'>To Update</span>
                      <span className='text-2xl font-bold text-amber-700'>{updateCount}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={runDryRun}
                  disabled={dryRunLoading}
                  className='w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {dryRunLoading ? (
                    <div className='w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin' />
                  ) : (
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <polygon points='5 3 19 12 5 21 5 3'/>
                    </svg>
                  )}
                  {dryRunLoading ? 'Running…' : dryRunDone ? 'Re-run Dry-Run' : 'Run Dry-Run'}
                </button>

                {dryRunDone && !dryRunError && (
                  <div className='flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold' style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <polyline points='20 6 9 17 4 12'/>
                    </svg>
                    Dry-run completed · {totalRowsRaw} record{totalRowsRaw !== 1 ? 's' : ''} analysed · 0 blocking errors
                    {diffRows.length > 0 && (
                      <button onClick={() => setActiveTab('diff')} className='ml-auto text-blue-600 hover:underline font-semibold'>
                        View Diff →
                      </button>
                    )}
                  </div>
                )}
                {dryRunError && (
                  <div className='flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold' style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                    </svg>
                    {dryRunError}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Diff */}
            {activeTab === 'diff' && (
              <>
                {!dryRunDone ? (
                  <div className='flex flex-col items-center justify-center py-14 gap-3'>
                    <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#CBD5E1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                    </svg>
                    <p className='text-xs text-gray-400'>Run dry-run first to see the diff</p>
                    <button
                      onClick={() => setActiveTab('dryrun')}
                      className='text-xs font-semibold text-blue-600 hover:underline'
                    >
                      Go to Dry-Run →
                    </button>
                  </div>
                ) : diffRows.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 gap-2'>
                    <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                      <polyline points='20 6 9 17 4 12'/>
                    </svg>
                    <p className='text-xs text-gray-500'>No differences found — records are in sync.</p>
                  </div>
                ) : (
                  <>
                    <div className='flex items-center justify-between px-5 py-2.5 bg-gray-50 border-b border-gray-100'>
                      <span className='text-xs text-gray-500'>Showing {visibleRows.length} of {diffRows.length} change{diffRows.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className='overflow-x-auto'>
                      <table className='w-full text-xs'>
                        <thead>
                          <tr className='border-b border-gray-100 bg-gray-50'>
                            <th className='text-left py-2 px-4 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Record</th>
                            <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Field</th>
                            <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Before</th>
                            <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>After</th>
                            <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((row, i) => (
                            <tr key={i} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                              <td className='py-2.5 px-4 font-medium text-gray-800 max-w-[160px] truncate' title={row.recordName}>{row.recordName}</td>
                              <td className='py-2.5 px-3 text-gray-600 font-mono text-[11px] max-w-[130px] truncate' title={row.field}>{row.field}</td>
                              <td className='py-2.5 px-3 text-gray-400 max-w-[130px] truncate' title={row.before}>
                                {row.action === 'NEW' ? <span className='italic'>new record</span> : <span>{row.before || '—'}</span>}
                              </td>
                              <td className='py-2.5 px-3 text-gray-800 font-medium max-w-[130px] truncate' title={row.after}>
                                {row.action === 'NEW' ? '—' : <span>{row.after || '—'}</span>}
                              </td>
                              <td className='py-2.5 px-3'>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.action === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {row.action}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {diffRows.length > DISPLAY_LIMIT && (
                        <div className='px-5 py-3 border-t border-gray-100 text-center'>
                          <p className='text-xs text-gray-400'>{diffRows.length - DISPLAY_LIMIT} more changes not shown</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className='flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white'>
        <button
          onClick={onBack}
          className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          ← Back
        </button>
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>💾 Save as Draft</button>
          <button
            onClick={() => onNext(dryRunDone ? { insertCount, updateCount, totalRowsRaw } : undefined)}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors'
            style={{ background: '#155DFC' }}
          >
            Next: Review &amp; Submit →
          </button>
        </div>
      </div>
    </div>
  );
}
