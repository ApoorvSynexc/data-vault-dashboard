// ReviewSubmit — Step 9 of 9 (Final Step) in the New Restore wizard.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { RestoreRetrievePayload } from '../../../../services/restore/restore.service';
import type { SourceSelection } from '../SelectSourceType';
import type { Destination } from '../../../../services/destination/destination.service';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function scopeTypeLabel(restorePayload: RestoreRetrievePayload): string {
  const scope = restorePayload.selection?.restoreScope;
  if (!scope) return '—';
  switch (scope.type) {
    case 'ALL':          return 'Full Restore';
    case 'OBJECT':       return `By Object (${scope.objects?.length ?? 0} selected)`;
    case 'RECORD':       return `By Record`;
    case 'FIELD':        return `By Field`;
    case 'FILTER':       return 'Custom Filter';
    case 'CHANGE_SINCE': return 'Changed Since';
    case 'DELETED_ONLY': return 'Deleted Only';
    case 'BULK_CSV':     return 'Bulk via CSV';
    default:             return '—';
  }
}

function sourceTypeLabel(sourceSelection: SourceSelection): string {
  if (!sourceSelection.type) return sourceSelection.configType === 'ARCHIVAL' ? 'Archive Vault' : 'Backup Snapshot';
  switch (sourceSelection.type) {
    case 'ENTIRE':          return 'Full Backup (Entire)';
    case 'PARTIAL':         return 'Partial Backup';
    case 'CHANGED_BETWEEN': return sourceSelection.startDate && sourceSelection.endDate
      ? `Changed Between ${sourceSelection.startDate} → ${sourceSelection.endDate}`
      : 'Changed Between';
    default: return sourceSelection.type;
  }
}

function restoreModeLabel(mode?: string): string {
  switch (mode) {
    case 'OVERWRITE':              return 'Overwrite Existing';
    case 'APPEND_NEW':             return 'Append New Only';
    case 'REPLACE_ENTIRE_OBJECT':  return 'Replace Entire Object';
    case 'SKIP':                   return 'Skip Conflicts';
    default:                       return mode ?? '—';
  }
}

function destinationLabel(restorePayload: RestoreRetrievePayload, sourceSelection: SourceSelection): string {
  if (restorePayload.destination?.type === 'SAME') {
    return sourceSelection.crmName ?? 'Same Org (Source)';
  }
  return sourceSelection.crmName ?? 'Different Org';
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onComplete: () => void;
  restorePayload: RestoreRetrievePayload;
  updatePayload: (patch: Partial<RestoreRetrievePayload>) => void;
  dryRunStats?: { insertCount: number; updateCount: number; totalRowsRaw: number };
  sourceSelection: SourceSelection;
  selectedConnection: Destination | null;
}

export default function ReviewSubmit({ onBack, onComplete, restorePayload, dryRunStats, sourceSelection, selectedConnection }: Props) {
  const restoreService = useRestoreService();
  const [isSuccess, setIsSuccess] = useState(false);

  // Editable job detail fields pre-filled from restorePayload
  const [jobName, setJobName]     = useState(restorePayload.jobDetail?.name ?? '');
  const [jobDesc, setJobDesc]     = useState(restorePayload.jobDetail?.description ?? '');
  const [jobTags, setJobTags]     = useState((restorePayload.jobDetail?.tags ?? []).join(', '));

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => onComplete(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const createJobMutation = useMutation({
    mutationFn: () => restoreService.createRestoreJob({
      ...restorePayload,
      jobDetail: {
        name: jobName,
        description: jobDesc || undefined,
        tags: jobTags ? jobTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      },
    }),
    onSuccess: () => setIsSuccess(true),
    onError: (err) => console.error('[RestoreJob] createRestoreJob failed:', err),
  });

  const handleRun = () => {
    createJobMutation.mutate();
  };

  const totalAffected = dryRunStats ? dryRunStats.insertCount + dryRunStats.updateCount : null;

  if (isSuccess) {
    return (
      <div className='flex-1 min-h-0 bg-gray-50 flex flex-col items-center justify-center'>
        <div className='text-center'>
          <div className='relative mb-6'>
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='w-24 h-24 bg-green-100 rounded-full animate-pulse' />
            </div>
            <div className='relative w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center'>
              <svg className='w-12 h-12 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
              </svg>
            </div>
          </div>
          <h1 className='text-3xl font-bold text-green-600 mb-2'>Restore Job Created Successfully</h1>
          <p className='text-gray-500 text-sm'>Redirecting to Restore Center in 2s…</p>
        </div>
      </div>
    );
  }

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
          <Link to='/restore-center' className='text-sm text-gray-500 hover:text-blue-600 transition-colors'>New Restore</Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>Review &amp; Submit</span>
        </div>

        {/* Step header + progress */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <div className='flex items-start justify-between gap-4 mb-4'>
            <div>
              <p className='text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1'>Final Step</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Review &amp; Submit</h1>
              <p className='text-gray-500 mt-1 text-sm'>Confirm all settings before executing.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>9</span> of 9
            </span>
          </div>
          <ProgressBar active={9} />
        </div>

        {/* Warning banner */}
        {totalAffected !== null && (
          <div className='flex-shrink-0 rounded-xl overflow-hidden' style={{ border: '1px solid #FECACA', background: '#FEF2F2' }}>
            <div className='flex items-center gap-3 px-5 py-3'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0'>
                <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/>
                <line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
              </svg>
              <p className='text-sm font-semibold text-red-700'>
                You are about to overwrite {totalAffected.toLocaleString()} records in {destinationLabel(restorePayload, sourceSelection)}
              </p>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>

          {/* ── LEFT COLUMN ── */}
          <div className='flex flex-col gap-4'>

            {/* Source & Destination */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Source &amp; Destination</span>
              </div>
              <div className='p-5 grid grid-cols-2 gap-x-6 gap-y-4'>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Connection</p>
                  <p className='text-sm font-semibold text-gray-800'>{selectedConnection?.name ?? '—'}</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Destination Org</p>
                  <p className='text-sm font-semibold text-gray-800'>{destinationLabel(restorePayload, sourceSelection)}</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Source Type</p>
                  <p className='text-sm font-semibold text-gray-800'>{sourceTypeLabel(sourceSelection)}</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>CRM User</p>
                  <p className='text-sm font-semibold text-gray-800 truncate' title={sourceSelection.crmUsername}>{sourceSelection.crmUsername ?? '—'}</p>
                </div>
              </div>
            </div>

            {/* Scope & Conflict */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Scope &amp; Conflict</span>
              </div>
              <div className='p-5 grid grid-cols-2 gap-x-6 gap-y-4'>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Scope Type</p>
                  <p className='text-sm font-semibold text-gray-800'>{scopeTypeLabel(restorePayload)}</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Restore Mode</p>
                  <p className='text-sm font-semibold text-gray-800'>{restoreModeLabel(restorePayload.conflict?.restoreMode)}</p>
                </div>
                {dryRunStats && (
                  <>
                    <div>
                      <p className='text-xs text-gray-400 mb-0.5'>To Insert</p>
                      <p className='text-sm font-semibold text-green-700'>{dryRunStats.insertCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-400 mb-0.5'>To Update</p>
                      <p className='text-sm font-semibold text-amber-600'>{dryRunStats.updateCount.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className='flex flex-col gap-4'>

            {/* Job Details */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Job Details</span>
              </div>
              <div className='p-5 flex flex-col gap-4'>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                    Job Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder='e.g. INC-4711 Emergency Recovery'
                    className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                    style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                  />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Description</label>
                  <input
                    type='text'
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    placeholder='Optional description'
                    className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                    style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                  />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Tags</label>
                  <input
                    type='text'
                    value={jobTags}
                    onChange={(e) => setJobTags(e.target.value)}
                    placeholder='e.g. Incident, production, Q2'
                    className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                    style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                  />
                </div>
              </div>
            </div>

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
        <div className='flex items-center gap-3'>
          <button
            className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
          >
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
            </svg>
            Schedule for Later
          </button>
          <button
            onClick={handleRun}
            disabled={createJobMutation.isPending || !jobName.trim()}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed'
            style={{ background: '#155DFC' }}
          >
            <svg width='13' height='13' viewBox='0 0 24 24' fill='currentColor'>
              <polygon points='5 3 19 12 5 21 5 3'/>
            </svg>
            {createJobMutation.isPending ? 'Running…' : 'Run Restore'}
          </button>
        </div>
      </div>
    </div>
  );
}
