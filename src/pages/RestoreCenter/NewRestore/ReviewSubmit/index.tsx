// ReviewSubmit — Step 8 of 8 (Final Step) in the New Restore wizard.
// Summarises all settings and provides Run Restore / Schedule for Later actions.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { RestoreRetrievePayload } from '../../../../services/restore/restore.service';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='w-full'>
      {/* Row 1: circles + connector lines */}
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
      {/* Row 2: labels — same flex structure mirrors row 1 so each label is under its circle */}
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

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onComplete: () => void;
  restorePayload: RestoreRetrievePayload;
  updatePayload: (patch: Partial<RestoreRetrievePayload>) => void;
}

export default function ReviewSubmit({ onBack, onComplete, restorePayload }: Props) {
  const restoreService = useRestoreService();
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => onComplete(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const createJobMutation = useMutation({
    mutationFn: () => restoreService.createRestoreJob(restorePayload),
    onSuccess: () => setIsSuccess(true),
    onError: (err) => console.error('[RestoreJob] createRestoreJob failed:', err),
  });

  const handleRun = () => {
    console.log('[RestoreJob] Submitting payload:', JSON.stringify(restorePayload, null, 2));
    createJobMutation.mutate();
  };
  const [jobName, setJobName]               = useState('INC-4711 Emergency Recovery – Accounts');
  const [tags, setTags]                     = useState('');
  const [justification, setJustification]   = useState(
    "Accounts accidentally overwritten during bulk data load INC-4711. Restoring to state as of this morning's backup."
  );

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
              Step <span className='text-blue-600'>8</span> of 8
            </span>
          </div>
          <ProgressBar active={8} />
        </div>

        {/* Two-column layout */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>

          {/* ── LEFT COLUMN ── */}
          <div className='flex flex-col gap-4'>

            {/* Source & Destination */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Source &amp; Destination</span>
                <button className='text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
                  Edit
                </button>
              </div>
              <div className='p-5 grid grid-cols-2 gap-x-6 gap-y-4'>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Source</p>
                  <p className='text-sm font-semibold text-gray-800'>Backup · May 26, 06:00 AM</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Destination</p>
                  <p className='text-sm font-semibold text-gray-800'>Salesforce Production</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Objects</p>
                  <p className='text-sm font-semibold text-gray-800'>Account, Contact, Opportunity</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Est. Records</p>
                  <p className='text-sm font-semibold text-gray-800'>8,435</p>
                </div>
              </div>
            </div>

            {/* Conflict & Automation */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Conflict &amp; Automation</span>
                <button className='text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
                  Edit
                </button>
              </div>
              <div className='p-5 grid grid-cols-2 gap-x-6 gap-y-4'>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Restore Mode</p>
                  <p className='text-sm font-semibold text-gray-800'>Overwrite Existing</p>
                </div>
                <div>
                  <p className='text-xs text-gray-400 mb-0.5'>Automation</p>
                  <p className='text-sm font-semibold' style={{ color: '#155DFC' }}>5 controls disabled</p>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Job Details</span>
              </div>
              <div className='p-5 flex flex-col gap-4'>
                {/* Job Name */}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-sm font-medium text-gray-700'>
                    Job Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                    style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                  />
                </div>
                {/* Tags */}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-sm font-medium text-gray-700'>Tags</label>
                  <input
                    type='text'
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder='e.g. Incident, production, Q2'
                    className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                    style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                  />
                </div>
                {/* Justification */}
                <div className='flex flex-col gap-1.5'>
                  <label className='text-sm font-medium text-gray-700'>Justification</label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={4}
                    className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none'
                    style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className='flex flex-col gap-4'>

            {/* Warning banner */}
            <div className='rounded-xl overflow-hidden' style={{ border: '1px solid #FECACA', background: '#FEF2F2' }}>
              <div className='flex items-start gap-3 px-5 py-4'>
                <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                  <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/>
                  <line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
                </svg>
                <div>
                  <p className='text-sm font-semibold text-red-700'>You are about to overwrite 8,435 records in Production</p>
                  <p className='text-xs text-red-500 mt-1 leading-relaxed'>
                    This action will be fully logged and is reversible within the rollback window (7 days). A pre-job snapshot will be taken automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Execute card */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Execute</span>
              </div>
              <div className='p-5 flex flex-col gap-3'>
                {/* Save as template checkbox */}
                <label className='flex items-center gap-2.5 cursor-pointer select-none'>
                  <input
                    type='checkbox'
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className='w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600'
                  />
                  <span className='text-sm text-gray-600'>
                    <span className='mr-1'>💾</span>
                    Also save as template when this runs
                  </span>
                </label>

                {/* Run Restore */}
                <button
                  onClick={handleRun}
                  disabled={createJobMutation.isPending}
                  className='w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed'
                  style={{ background: '#155DFC' }}
                >
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
                    <polygon points='5 3 19 12 5 21 5 3'/>
                  </svg>
                  {createJobMutation.isPending ? 'Running…' : 'Run Restore'}
                </button>

                {/* Schedule for Later */}
                <button className='w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors'>
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                  </svg>
                  Schedule for Later
                </button>
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
        <button
          onClick={handleRun}
          disabled={createJobMutation.isPending}
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
  );
}
