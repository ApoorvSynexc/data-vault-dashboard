// DefineRestorePolicy — Step 5 of 8 in the New Restore wizard.
// Captures the restore job name, description, and tags before the user
// selects a source. Mirrors the pattern used by DefineArchive in AddArchive.

import { useState } from 'react';
import { Link } from 'react-router-dom';

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
  onNext: (jobDetail: { name: string; description: string; tags: string[] }) => void;
  onBack: () => void;
  crmName?: string;
  crmUsername?: string;
  connectionName?: string;
}

export default function DefineRestorePolicy({ onNext, onBack, crmName, crmUsername, connectionName }: Props) {
  const [policyName, setPolicyName]   = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags]               = useState('');

  const canProceed = policyName.trim().length > 0;

  const sourceLabel = connectionName || '—';
  const destLabel   = [crmName, crmUsername ? `(${crmUsername})` : ''].filter(Boolean).join(' ') || '—';

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
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 5 of 8</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Define Restore Policy</h1>
              <p className='text-gray-500 mt-1 text-sm'>Name this restore job and add optional context.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>5</span> of 8
            </span>
          </div>
          <div className='mt-4'>
            <ProgressBar active={5} />
          </div>
        </div>

        {/* Form card */}
        <div
          className='bg-white rounded-xl p-6 flex flex-col gap-6 flex-shrink-0'
          style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          {/* Row 1: Restore Source + Destination (read-only, from prior steps) */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>
                <span className='text-red-500'>* </span>
                <span style={{ color: '#33363F' }}>Restore Source</span>
              </label>
              <input
                type='text'
                value={sourceLabel}
                readOnly
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none cursor-default'
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>
                <span className='text-red-500'>* </span>
                <span style={{ color: '#33363F' }}>Destination</span>
              </label>
              <input
                type='text'
                value={destLabel}
                readOnly
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none cursor-default capitalize'
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
              />
            </div>
          </div>

          {/* Row 2: Policy Name + Tags */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium'>
                <span className='text-red-500'>* </span>
                <span style={{ color: '#33363F' }}>Restore Job Name</span>
              </label>
              <input
                type='text'
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder='Enter restore job name'
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-gray-700'>
                Tags <span className='text-gray-400 font-normal'>(Optional)</span>
              </label>
              <input
                type='text'
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder='e.g. INC-4711, compliance, q2-audit'
                className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
                style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
              />
            </div>
          </div>

          {/* Row 3: Description (full width) */}
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium text-gray-700'>
              Description <span className='text-gray-400 font-normal'>(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Describe the purpose of this restore (e.g. reverting accidental bulk delete of Q1 leads)'
              rows={4}
              className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none'
              style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
            />
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
          {/* DEMO_HIDDEN: <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>💾 Save as Draft</button> END DEMO_HIDDEN */}
          <button
            onClick={() => onNext({ name: policyName, description, tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [] })}
            disabled={!canProceed}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            style={{ background: '#155DFC' }}
          >
            Next: Configure Conflict →
          </button>
        </div>
      </div>
    </div>
  );
}
