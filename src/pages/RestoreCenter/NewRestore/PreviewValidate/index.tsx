// PreviewValidate — Step 7 of 8 in the New Restore wizard.
// Shows impact summary, schema mismatch report, validation & trigger impact,
// snapshot diff table, and dry-run controls before final submission.

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

interface Props { onNext: () => void; onBack: () => void; }

// ── Static mock data ──────────────────────────────────────────────────────────

const SCHEMA_ISSUES = [
  { msg: 'Account.Industry — picklist value "Aerospace" not in destination. Will be set to null.' },
  { msg: 'Contact.Legacy_ID__c — field exists in source but not destination. Will be skipped.' },
  { msg: '3 inactive owners — will be reassigned to queue per conflict rule.' },
];

const TRIGGER_ROWS = [
  { label: 'Validation Rules',      sub: '2 rules would fire — disabled per job config',    badge: 'Disabled',  color: 'green' },
  { label: 'Flows / Process Builder', sub: '4 flows active — disabled per job config',       badge: 'Disabled',  color: 'green' },
  { label: 'API Calls Estimated',   sub: '',                                                 badge: '+1,240',    color: 'blue'  },
  { label: 'Storage Delta',         sub: '',                                                 badge: '+320 MB',   color: 'blue'  },
  { label: 'Estimated Run Time',    sub: '',                                                 badge: '~4 min',    color: 'gray'  },
];

const DIFF_ROWS = [
  { id: '001xx001', field: 'Account.Stage',  before: 'Closed',    after: 'Active',      action: 'MOD',  actionColor: 'amber' },
  { id: '003xx299', field: 'Contact.Email',  before: '—',          after: 'j@acme.com',  action: 'NEW',  actionColor: 'green' },
  { id: '006xx122', field: 'Opp.Amount',     before: '$50,000',   after: '$75,000',     action: 'MOD',  actionColor: 'amber' },
  { id: '001xx055', field: 'Account.Name',   before: 'No change', after: 'No change',   action: 'SKIP', actionColor: 'gray'  },
];

const ACTION_BADGE: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  gray:  'bg-gray-100 text-gray-500',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function PreviewValidate({ onNext, onBack }: Props) {
  const [dryRunDone, setDryRunDone] = useState(true);

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
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 7 of 8</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Preview &amp; Validate</h1>
              <p className='text-gray-500 mt-1 text-sm'>Review impact before committing — no data has been written yet.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>7</span> of 8
            </span>
          </div>
          <div className='mt-4'>
            <ProgressBar active={7} />
          </div>
        </div>

        {/* Impact summary stats */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0'>
          {[
            { label: 'To Create',          value: '4,821', color: '#16A34A' },
            { label: 'To Update',          value: '3,602', color: '#D97706' },
            { label: 'To Delete',          value: '0',     color: '#374151' },
            { label: 'Skipped (Conflicts)',value: '12',    color: '#374151' },
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

        {/* Two-column body */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>

          {/* ── LEFT COLUMN ── */}
          <div className='flex flex-col gap-4'>

            {/* Schema Mismatch Report */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
                <div className='flex items-center gap-2'>
                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#D97706' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/>
                    <line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
                  </svg>
                  <span className='text-sm font-semibold text-gray-800'>Schema Mismatch Report</span>
                </div>
                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700'>
                  {SCHEMA_ISSUES.length} Issues
                </span>
              </div>
              <div className='p-4 flex flex-col gap-2'>
                {SCHEMA_ISSUES.map((issue, i) => (
                  <div key={i} className='flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs' style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#D97706' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/>
                      <line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
                    </svg>
                    <span className='text-amber-900 leading-relaxed'>{issue.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DEMO_HIDDEN: Validation & Trigger Impact — uncomment to restore
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Validation &amp; Trigger Impact</span>
              </div>
              <div className='divide-y divide-gray-100'>
                {TRIGGER_ROWS.map((row) => (
                  <div key={row.label} className='flex items-center justify-between gap-4 px-5 py-3.5'>
                    <div>
                      <p className='text-sm text-gray-700'>{row.label}</p>
                      {row.sub && <p className='text-xs text-gray-400 mt-0.5'>{row.sub}</p>}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      row.color === 'green' ? 'bg-green-100 text-green-700' :
                      row.color === 'blue'  ? 'bg-blue-100 text-blue-700'  :
                                              'bg-gray-100 text-gray-600'
                    }`}>
                      {row.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            END DEMO_HIDDEN */}

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className='flex flex-col gap-4'>

            {/* Snapshot vs Current Diff */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Snapshot vs Current Diff (Sample)</span>
                <button className='text-xs font-semibold text-blue-600 hover:underline flex-shrink-0'>Full Diff →</button>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='border-b border-gray-100 bg-gray-50'>
                      <th className='text-left py-2 px-4 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Record ID</th>
                      <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Field</th>
                      <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Before</th>
                      <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>After</th>
                      <th className='text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIFF_ROWS.map((row) => (
                      <tr key={row.id + row.field} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                        <td className='py-3 px-4 font-mono text-gray-700'>{row.id}</td>
                        <td className='py-3 px-3 text-gray-700'>{row.field}</td>
                        <td className='py-3 px-3 text-gray-500'>{row.before}</td>
                        <td className='py-3 px-3 text-gray-800 font-medium'>{row.after}</td>
                        <td className='py-3 px-3'>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[row.actionColor]}`}>
                            {row.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dry-Run Mode */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Dry-Run Mode</span>
                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700'>Recommended</span>
              </div>
              <div className='p-4 flex flex-col gap-3'>
                <p className='text-xs text-gray-500 leading-relaxed'>
                  Execute the full job pipeline without writing any data. Produces a complete preview report.
                </p>
                <button
                  onClick={() => setDryRunDone(true)}
                  className='w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors'
                >
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <polygon points='5 3 19 12 5 21 5 3'/>
                  </svg>
                  Run Dry-Run
                </button>
                {dryRunDone && (
                  <div className='flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold' style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <polyline points='20 6 9 17 4 12'/>
                    </svg>
                    Last dry-run: May 26 · 0 blocking errors found
                  </div>
                )}
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
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
            💾 Save as Draft
          </button>
          <button
            onClick={onNext}
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
