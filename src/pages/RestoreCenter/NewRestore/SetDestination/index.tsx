// SetDestination — Step 4 of 8 in the New Restore wizard.
// Lets the user pick where the restored data should land:
// The configuration panel below the type cards adapts to the selection.

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

// ── Types ─────────────────────────────────────────────────────────────────────


// ── Tooltip helper ────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  return (
    <span className='relative group inline-flex items-center ml-1 cursor-help align-middle'>
      <span className='w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center'>i</span>
      <span className='absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-56 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 z-[9999] shadow-lg pointer-events-none'>
        {text}
      </span>
    </span>
  );
}

// ── Sub-configs ───────────────────────────────────────────────────────────────

function SameOrgConfig({ crmName, crmUsername }: { crmName?: string; crmUsername?: string }) {
  const [tag, setTag] = useState('Restored via DataVault {job-id}');

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
        <span className='text-base'>🏠</span>
        <span className='text-sm font-semibold text-gray-800'>Same Org Configuration</span>
      </div>
      <div className='p-5 flex flex-col gap-5'>
        {/* Info callout */}
        <div className='flex items-start gap-3 rounded-lg px-4 py-3 text-xs' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <svg width='14' height='14' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
            <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/>
          </svg>
          <p className='text-blue-800 leading-relaxed'>Same-org restore. Schemas always match — no object or field mapping required.</p>
        </div>

        {/* Destination Org */}
        <div className='flex flex-col gap-1.5'>
          <label className='text-sm font-medium text-gray-700'>Destination Org</label>
          <div className='flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm' style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 flex-shrink-0'>🔒 Locked</span>
            <span className='text-gray-600'>
              Same as source:{' '}
              <strong className='text-gray-800 capitalize'>{crmName ?? '—'}</strong>
              {crmUsername && <span className='ml-2 text-xs text-gray-500'>({crmUsername})</span>}
            </span>
          </div>
        </div>

        <div className='flex flex-col gap-1.5'>
          <label className='text-sm font-medium text-gray-700'>
            Tag Restored Records
            <Tip text="When restored records arrive in the destination, this label is written to a custom field on each one so you can easily find and report on them later. The destination field name and default value are configurable." />
          </label>
          <input
            type='text'
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder='e.g. Restored from {snapshot} on {date}'
            className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
            style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
          />
          <p className='text-xs text-gray-400'>Written to a custom field on each restored record</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onNext: () => void; onBack: () => void; backupConfigId: string; configType: 'BACKUP' | 'ARCHIVAL'; crmName?: string; crmUsername?: string; }

export default function SetDestination({ onNext, onBack, crmName, crmUsername }: Props) {

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
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 4 of 8</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Set Destination &amp; Mapping</h1>
              <p className='text-gray-500 mt-1 text-sm'>Pick a destination type — the fields below adapt to your choice.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>4</span> of 8
            </span>
          </div>
          <div className='mt-4'>
            <ProgressBar active={4} />
          </div>
        </div>

        {/* Destination Type tab hidden for demo */}

        {/* Sub-config panel */}
        <SameOrgConfig crmName={crmName} crmUsername={crmUsername} />

      </div>

      {/* Footer */}
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
            onClick={onNext}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors'
            style={{ background: '#155DFC' }}
          >
            Next: Define Policy →
          </button>
        </div>
      </div>
    </div>
  );
}
