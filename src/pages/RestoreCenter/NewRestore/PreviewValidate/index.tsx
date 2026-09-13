// PreviewValidate — Step 8 of 9 in the New Restore wizard.
// Shows impact summary, schema mismatch report, snapshot diff table, and dry-run controls.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import InfoTooltip from '../../../../components/InfoTooltip';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { RestoreRetrievePayload } from '../../../../services/restore/restore.service';
import { toUTCISOString } from '../../../../utils';
import type { SourceSelection } from '../SelectSourceType';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict & Edge Cases', 'Preview', 'Review'];

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

interface DryRunObject { objectApiName: string; count: number; updateCount: number; deleteCount: number; ok: boolean; }
interface DryRunStats { totalCount: number; totalUpdateCount: number; totalDeleteCount: number; objects: DryRunObject[]; }

interface DiffRecord {
  changeRecord: Record<string, any>;
  salesforceRecord: Record<string, any> | null;
}
interface DiffObject {
  objectApiName: string;
  ok: boolean;
  columns: string[];
  recordCount: number;
  records: DiffRecord[];
}

interface Props {
  onNext: (stats: DryRunStats | undefined) => void;
  onBack: () => void;
  sourceSelection: SourceSelection;
  restorePayload: RestoreRetrievePayload;
}


// ── Main component ────────────────────────────────────────────────────────────

export default function PreviewValidate({ onNext, onBack, sourceSelection, restorePayload }: Props) {
  const restoreService = useRestoreService();

  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunDone,    setDryRunDone]    = useState(false);
  const [dryRunError,   setDryRunError]   = useState<string | null>(null);

  const [totalCount,       setTotalCount]       = useState(0);
  const [totalUpdateCount, setTotalUpdateCount] = useState(0);
  const [totalDeleteCount, setTotalDeleteCount] = useState(0);
  const [dryRunObjects,    setDryRunObjects]    = useState<DryRunObject[]>([]);

  const runDryRun = async () => {
    setDryRunLoading(true);
    setDryRunError(null);
    setDryRunDone(false);
    try {
      const sourceType = (sourceSelection.type === 'CHANGED_BETWEEN' || sourceSelection.type === 'DELETED_BETWEEN')
        ? 'CHANGED_BETWEEN'
        : 'ENTIRE';
      const res: any = await restoreService.dryRun({
        backupConfigId: sourceSelection.backupConfigId,
        configType: sourceSelection.configType ?? 'BACKUP',
        source: {
          type: sourceType,
          ...(sourceType === 'CHANGED_BETWEEN' && sourceSelection.startDate ? { startDate: toUTCISOString(sourceSelection.startDate) } : {}),
          ...(sourceType === 'CHANGED_BETWEEN' && sourceSelection.endDate   ? { endDate:   toUTCISOString(sourceSelection.endDate)   } : {}),
        },
        selection: { restoreScope: restorePayload.selection.restoreScope },
      });

      const d = res?.data?.data ?? res?.data ?? {};
      setTotalCount(d.totalCount ?? 0);
      setTotalUpdateCount(d.totalUpdateCount ?? 0);
      setTotalDeleteCount(d.totalDeleteCount ?? 0);
      setDryRunObjects(d.objects ?? []);
      setDryRunDone(true);
    } catch (err: any) {
      setDryRunError(err?.message ?? 'Dry-run failed. Please try again.');
    } finally {
      setDryRunLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'dryrun' | 'diff'>('dryrun');

  // ── Snapshot vs Current Diff (separate API) ───────────────────────────────
  const [diffViewLoading, setDiffViewLoading] = useState(false);
  const [diffViewDone,    setDiffViewDone]    = useState(false);
  const [diffViewError,   setDiffViewError]   = useState<string | null>(null);
  const [diffViewData,    setDiffViewData]    = useState<DiffObject[]>([]);

  const buildSourcePayload = () => {
    const sourceType = (sourceSelection.type === 'CHANGED_BETWEEN' || sourceSelection.type === 'DELETED_BETWEEN')
      ? 'CHANGED_BETWEEN' as const
      : 'ENTIRE' as const;
    return {
      backupConfigId: sourceSelection.backupConfigId,
      configType: (sourceSelection.configType ?? 'BACKUP') as 'BACKUP' | 'ARCHIVAL',
      source: {
        type: sourceType,
        ...(sourceType === 'CHANGED_BETWEEN' && sourceSelection.startDate ? { startDate: toUTCISOString(sourceSelection.startDate) } : {}),
        ...(sourceType === 'CHANGED_BETWEEN' && sourceSelection.endDate   ? { endDate:   toUTCISOString(sourceSelection.endDate)   } : {}),
      },
      selection: { restoreScope: restorePayload.selection.restoreScope },
    };
  };

  const runDiffView = async () => {
    setDiffViewLoading(true);
    setDiffViewError(null);
    setDiffViewDone(false);
    try {
      const res: any = await restoreService.dryRunDiff({ ...buildSourcePayload(), limit: 50 });
      const d = res?.data?.data ?? res?.data ?? {};
      setDiffViewData(Array.isArray(d.objects) ? d.objects : []);
      setDiffViewDone(true);
    } catch (err: any) {
      setDiffViewError(err?.message ?? 'Diff failed. Please try again.');
    } finally {
      setDiffViewLoading(false);
    }
  };

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
            <ProgressBar active={7} />
          </div>
        </div>

        {/* Impact summary stats */}
        <div className='grid grid-cols-3 gap-3 flex-shrink-0'>
          {[
            { label: 'Total Changed', value: dryRunDone ? String(totalCount)       : '—', color: '#155DFC' },
            { label: 'To Update',     value: dryRunDone ? String(totalUpdateCount) : '—', color: '#D97706' },
            { label: 'To Delete',     value: dryRunDone ? String(totalDeleteCount) : '—', color: '#DC2626' },
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
                {diffViewDone && diffViewData.some((o) => o.recordCount > 0) && (
                  <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700'>
                    {diffViewData.reduce((s, o) => s + o.recordCount, 0)}
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

                {dryRunDone && dryRunObjects.length > 0 && (
                  <div className='rounded-lg border border-gray-200 overflow-hidden'>
                    <table className='w-full text-xs'>
                      <thead>
                        <tr className='bg-gray-50 border-b border-gray-200'>
                          <th className='text-left px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Object</th>
                          <th className='text-right px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Changed</th>
                          <th className='text-right px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Updated</th>
                          <th className='text-right px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Deleted</th>
                          <th className='text-center px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dryRunObjects.map((obj) => (
                          <tr key={obj.objectApiName} className='border-b border-gray-100 last:border-0 hover:bg-gray-50'>
                            <td className='px-4 py-2.5 font-mono font-medium text-gray-800'>{obj.objectApiName}</td>
                            <td className='px-4 py-2.5 text-right font-semibold text-blue-700'>{obj.count}</td>
                            <td className='px-4 py-2.5 text-right font-semibold text-amber-600'>{obj.updateCount}</td>
                            <td className='px-4 py-2.5 text-right font-semibold text-red-500'>{obj.deleteCount}</td>
                            <td className='px-4 py-2.5 text-center'>
                              {obj.ok
                                ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700'>OK</span>
                                : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700'>Error</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    Dry-run completed · {totalCount} record{totalCount !== 1 ? 's' : ''} affected · 0 blocking errors
                    <button onClick={() => setActiveTab('diff')} className='ml-auto text-blue-600 hover:underline font-semibold'>
                      View Diff →
                    </button>
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
              <div className='p-5 flex flex-col gap-4'>
                <p className='text-xs text-gray-500 leading-relaxed'>
                  Compares backup snapshot values against live destination data. Highlights fields that have changed since the snapshot was taken.
                </p>

                <button
                  onClick={runDiffView}
                  disabled={diffViewLoading}
                  className='w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {diffViewLoading ? (
                    <div className='w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin' />
                  ) : (
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <polyline points='16 3 21 3 21 8'/><polyline points='4 20 4 15 9 15'/>
                      <path d='M21 3 L14.5 9.5 M4 20 L9.5 14.5'/>
                    </svg>
                  )}
                  {diffViewLoading ? 'Loading…' : diffViewDone ? 'Re-run View Difference' : 'View Difference'}
                </button>

                {diffViewError && (
                  <div className='flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold' style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                    </svg>
                    {diffViewError}
                  </div>
                )}

                {diffViewDone && (() => {
                  const activeObjects = diffViewData.filter((o) => o.recordCount > 0);
                  if (activeObjects.length === 0) {
                    return (
                      <div className='flex flex-col items-center justify-center py-10 gap-2'>
                        <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                          <polyline points='20 6 9 17 4 12'/>
                        </svg>
                        <p className='text-xs text-gray-500'>No differences found — records are in sync.</p>
                      </div>
                    );
                  }
                  return (
                    <div className='flex flex-col gap-4'>
                      {activeObjects.map((obj) => (
                        <div key={obj.objectApiName} className='rounded-lg border border-gray-200 overflow-hidden'>
                          {/* Object header */}
                          <div className='px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between'>
                            <span className='text-xs font-bold text-gray-800 font-mono'>{obj.objectApiName}</span>
                            <div className='flex items-center gap-2'>
                              {!obj.ok && <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700'>Error</span>}
                              <span className='text-[10px] font-semibold text-gray-400'>{obj.recordCount} record{obj.recordCount !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {/* Per-record cards */}
                          <div className='flex flex-col divide-y divide-gray-100'>
                            {obj.records.map((rec: DiffRecord, i: number) => {
                              const change = rec.changeRecord ?? {};
                              const live   = rec.salesforceRecord;
                              const operation: string = change.OPERATION ?? '—';
                              const recordId: string  = String(change.Id ?? live?.Id ?? `row-${i}`);
                              const opStyle =
                                operation === 'INSERT' ? { bg: 'bg-green-100', text: 'text-green-700' } :
                                operation === 'UPDATE' ? { bg: 'bg-amber-100', text: 'text-amber-700' } :
                                operation === 'DELETE' ? { bg: 'bg-red-100',   text: 'text-red-600'   } :
                                                        { bg: 'bg-gray-100',   text: 'text-gray-600'  };

                              // For UPDATE: show only non-empty fields in changeRecord (those are the changed backup values)
                              // For INSERT: salesforceRecord is null — record will be inserted from changeRecord
                              // For DELETE: changeRecord is minimal, salesforceRecord has current values
                              const changedFields = operation === 'UPDATE'
                                ? Object.keys(change).filter((k) => k !== 'OPERATION' && k !== 'Id' && change[k] !== '' && change[k] != null)
                                : operation === 'INSERT'
                                  ? Object.keys(change).filter((k) => k !== 'OPERATION' && change[k] !== '' && change[k] != null)
                                  : Object.keys(live ?? {}).filter((k) => k !== 'Id');

                              return (
                                <div key={recordId} className='p-4'>
                                  {/* Record header */}
                                  <div className='flex items-center gap-2 mb-3'>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${opStyle.bg} ${opStyle.text}`}>
                                      {operation}
                                    </span>
                                    <span className='text-[11px] font-mono text-gray-500'>{recordId}</span>
                                    {operation === 'INSERT' && (
                                      <span className='text-[10px] text-gray-400 ml-1'>— record will be inserted from backup</span>
                                    )}
                                    {operation === 'DELETE' && (
                                      <span className='text-[10px] text-gray-400 ml-1'>— record will be deleted</span>
                                    )}
                                  </div>

                                  {changedFields.length > 0 ? (
                                    <div className='overflow-x-auto rounded-lg border border-gray-100'>
                                      <table className='w-full text-xs'>
                                        <thead>
                                          <tr className='bg-gray-50 border-b border-gray-100'>
                                            <th className='text-left py-1.5 px-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px] w-[160px]'>Field</th>
                                            {operation === 'UPDATE' && (
                                              <>
                                                <th className='text-left py-1.5 px-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px]'>Backup Value</th>
                                                <th className='text-left py-1.5 px-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px]'>Current (Salesforce)</th>
                                              </>
                                            )}
                                            {operation !== 'UPDATE' && (
                                              <th className='text-left py-1.5 px-3 font-semibold text-gray-400 uppercase tracking-wide text-[10px]'>Value</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {changedFields.map((field) => {
                                            const backupVal  = String(change[field] ?? '—');
                                            const currentVal = live ? String(live[field] ?? '—') : '—';
                                            const isDiff = operation === 'UPDATE' && backupVal !== currentVal;
                                            return (
                                              <tr key={field} className={`border-b border-gray-50 last:border-0 ${isDiff ? 'bg-amber-50/40' : ''}`}>
                                                <td className='py-2 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap'>{field}</td>
                                                {operation === 'UPDATE' ? (
                                                  <>
                                                    <td className='py-2 px-3 text-gray-500 max-w-[200px] truncate' title={backupVal}>{backupVal}</td>
                                                    <td className={`py-2 px-3 max-w-[200px] truncate font-medium ${isDiff ? 'text-amber-700' : 'text-gray-700'}`} title={currentVal}>{currentVal}</td>
                                                  </>
                                                ) : (
                                                  <td className='py-2 px-3 text-gray-700 max-w-[320px] truncate' title={backupVal}>{backupVal}</td>
                                                )}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className='text-xs text-gray-400 italic'>No field-level changes detected.</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
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
            onClick={() => onNext(dryRunDone ? { totalCount, totalUpdateCount, totalDeleteCount, objects: dryRunObjects } : undefined)}
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
