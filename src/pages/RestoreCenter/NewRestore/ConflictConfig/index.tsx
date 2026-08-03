// ConflictConfig — Step 6 of 8 in the New Restore wizard.
// Two-column layout:
//   Left  — Restore Mode, Edge Case Handling, Field Defaults
//   Right — CRM Automation Controls

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

// ── Tooltip helper ────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  return (
    <span className='relative group inline-flex items-center ml-1 cursor-help align-middle'>
      <span className='w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center'>i</span>
      <span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-60 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 z-50 shadow-lg pointer-events-none'>
        {text}
      </span>
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RestoreMode = 'overwrite' | 'append' | 'merge' | 'skip' | 'replace';

const RESTORE_MODES: { id: RestoreMode; title: string; desc: string; recommended?: boolean; danger?: boolean }[] = [
  { id: 'overwrite', title: 'Overwrite Existing',    desc: 'Source record replaces destination — every field overwritten', recommended: true },
  { id: 'append',    title: 'Append as New Records', desc: 'Always insert — creates duplicates if record already exists' },
];

const RESTORE_MODES_FULL: { id: RestoreMode; title: string; desc: string; recommended?: boolean; danger?: boolean }[] = [
  { id: 'merge',   title: 'Merge (per-field rule)', desc: 'Configurable per-field winner — best for partial / safety-first recovery' },
  { id: 'skip',    title: 'Skip if Exists',          desc: 'Do not touch records already in destination' },
  { id: 'replace', title: 'Replace Entire Object',   desc: 'Delete all destination records, then insert from source', danger: true },
];

const FIELD_DEFAULTS = [
  { field: 'Account.Industry',      sub: 'Picklist · Required', type: 'Picklist', options: ['Other', 'Technology', 'Finance', 'Healthcare'] },
  { field: 'Account.Type',          sub: 'Picklist · Required', type: 'Picklist', options: ['Customer', 'Prospect', 'Partner', 'Other'] },
  { field: 'Contact.Email',         sub: 'Email · Required',    type: 'Email',    options: [] },
  { field: 'Opportunity.StageName', sub: 'Picklist · Required', type: 'Picklist', options: ['Prospecting', 'Qualification', 'Closed Lost'] },
  { field: 'Case.Status',           sub: 'Picklist · Required', type: 'Picklist', options: ['New', 'Working', 'Escalated', 'Closed'] },
];


// ── Main component ────────────────────────────────────────────────────────────

interface Props { onNext: () => void; onBack: () => void; }

export default function ConflictConfig({ onNext, onBack }: Props) {
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('overwrite');
  const [mergeDefault,   setMergeDefault]   = useState('Newest LastModifiedDate wins');
  const [ecDuplicate,    setEcDuplicate]    = useState('Use destination if newer ✓ Recommended');
  const [ecMissingField, setEcMissingField] = useState('Skip the field ✓ Recommended');
  const [ecOwner,        setEcOwner]        = useState('Reassign to specified user ✓ Recommended');
  const [ecParent,       setEcParent]       = useState('Restore parent first ✓ Recommended');
  const [ecRecordType,   setEcRecordType]   = useState('Map to default ✓ Recommended');
  const [ecMissRequired, setEcMissRequired] = useState('Use specified default per field ✓ Recommended');
  const [fallbackOwner,  setFallbackOwner]  = useState('DataVault Service Account');
  const selectClass = 'h-9 w-full px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white';
  const selectStyle = { border: '1px solid #E2E8F0', color: '#33363F' };

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
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 6 of 8</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>
                Conflict &amp; Automation Configuration
                <Tip text='Decide how to handle records that already exist in the destination, and which automation to disable during the job. Recommended defaults are pre-selected.' />
              </h1>
              <p className='text-gray-500 mt-1 text-sm'>Define merge behaviour and CRM automation controls. Recommended defaults are pre-selected.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>6</span> of 8
            </span>
          </div>
          <div className='mt-4'>
            <ProgressBar active={6} />
          </div>
        </div>

        {/* Single-column layout */}
        <div className='flex flex-col gap-4'>

          {/* Restore Mode */}
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Restore Mode (per job)</span>
                <Tip text='How to handle a source record when a record with the same Id (or external Id) already exists in the destination. Pick one mode for the whole job — you can override per object later.' />
              </div>
              <div className='p-4 flex flex-col gap-2'>
                {RESTORE_MODES.map((m) => {
                  const active = restoreMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setRestoreMode(m.id)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                        active
                          ? m.danger ? 'border-red-500 bg-red-50' : 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-center gap-2'>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          active
                            ? m.danger ? 'border-red-500 bg-red-500' : 'border-blue-600 bg-blue-600'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {active && <span className='w-1.5 h-1.5 rounded-full bg-white inline-block' />}
                        </div>
                        <span className={`text-sm font-semibold ${active ? (m.danger ? 'text-red-600' : 'text-blue-600') : 'text-gray-800'}`}>
                          {m.title}
                        </span>
                        {m.recommended && (
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700'>Recommended</span>
                        )}
                        {m.danger && (
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600'>⚠ Destructive</span>
                        )}
                      </div>
                      <p className='mt-0.5 text-xs text-gray-500 pl-6'>{m.desc}</p>
                    </button>
                  );
                })}

                {restoreMode === 'merge' && (
                  <div className='mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3'>
                    <p className='text-xs font-semibold text-blue-800'>
                      ⚖ Per-field merge rules
                      <Tip text='When a record exists in both source and destination, decide which side wins for each field. Default applies to all fields; add per-field overrides for exceptions.' />
                    </p>
                    <div className='flex items-center gap-3'>
                      <span className='text-xs font-semibold text-gray-700 w-40 flex-shrink-0'>Default for all fields</span>
                      <select value={mergeDefault} onChange={(e) => setMergeDefault(e.target.value)} className={selectClass} style={selectStyle}>
                        <option>Newest LastModifiedDate wins</option>
                        <option>Source always wins</option>
                        <option>Destination always wins</option>
                      </select>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-xs text-gray-600 w-40 flex-shrink-0'>Account.AnnualRevenue</span>
                      <select defaultValue='Source always wins' className={selectClass} style={selectStyle}>
                        <option>Use default</option>
                        <option>Source always wins</option>
                        <option>Destination always wins</option>
                      </select>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-xs text-gray-600 w-40 flex-shrink-0'>Account.OwnerId</span>
                      <select defaultValue='Destination always wins' className={selectClass} style={selectStyle}>
                        <option>Use default</option>
                        <option>Source always wins</option>
                        <option>Destination always wins</option>
                      </select>
                    </div>
                    <button className='text-xs font-semibold text-blue-600 hover:underline self-start'>+ Add per-field override</button>
                  </div>
                )}
              </div>
            </div>

            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Edge Case Handling</span>
                <Tip text="What to do when something doesn't line up cleanly — duplicate Id, missing field in destination, owner no longer active, parent record missing, or record type missing." />
              </div>
              <div className='p-4 flex flex-col divide-y divide-gray-100'>
                <div className='py-3 flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>
                    On duplicate records <Tip text='Triggered when a record with the same Id (or external Id) already exists. Overwrite = source wins. Use destination if newer = safer, compares LastModifiedDate. Create new copy = inserts parallel with " (copy)" suffix.' />
                  </span>
                  <select value={ecDuplicate} onChange={(e) => setEcDuplicate(e.target.value)} className={selectClass} style={selectStyle}>
                    <option>Overwrite</option>
                    <option>Skip</option>
                    <option>Create new copy with suffix</option>
                    <option>Use destination if newer ✓ Recommended</option>
                  </select>
                </div>
                <div className='py-3 flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>
                    Missing fields in dest <Tip text='Triggered when the source has fields the destination does not have. Skip = drop that one field. Map to existing = route to a different field. Fail = reject the whole record.' />
                  </span>
                  <select value={ecMissingField} onChange={(e) => setEcMissingField(e.target.value)} className={selectClass} style={selectStyle}>
                    <option>Skip the field ✓ Recommended</option>
                    <option>Map to existing field</option>
                    <option>Fail the record</option>
                  </select>
                </div>
                <div className='py-3 flex flex-col gap-2'>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>
                      Owner inactive/deleted <Tip text='Triggered when the original record owner no longer exists or is deactivated.' />
                    </span>
                    <select value={ecOwner} onChange={(e) => setEcOwner(e.target.value)} className={selectClass} style={selectStyle}>
                      <option>Reassign to specified user ✓ Recommended</option>
                      <option>Reassign to manager</option>
                      <option>Reassign to queue</option>
                      <option>Skip record</option>
                    </select>
                  </div>
                  {ecOwner.startsWith('Reassign to specified user') && (
                    <div className='ml-0 sm:ml-48 flex flex-col gap-1'>
                      <span className='text-xs text-gray-500'>Fallback owner</span>
                      <input
                        value={fallbackOwner}
                        onChange={(e) => setFallbackOwner(e.target.value)}
                        placeholder='Search users…'
                        className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30'
                        style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                      />
                    </div>
                  )}
                </div>
                <div className='py-3 flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>
                    Parent missing (orphan) <Tip text="Triggered when the record's parent reference points to a missing/deleted parent." />
                  </span>
                  <select value={ecParent} onChange={(e) => setEcParent(e.target.value)} className={selectClass} style={selectStyle}>
                    <option>Re-parent to placeholder</option>
                    <option>Restore parent first ✓ Recommended</option>
                    <option>Skip</option>
                  </select>
                </div>
                <div className='py-3 flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>
                    Record type missing <Tip text="Triggered when the source record uses a RecordType that doesn't exist in the destination." />
                  </span>
                  <select value={ecRecordType} onChange={(e) => setEcRecordType(e.target.value)} className={selectClass} style={selectStyle}>
                    <option>Map to default ✓ Recommended</option>
                    <option>Map manually</option>
                    <option>Skip</option>
                  </select>
                </div>
                <div className='py-3 flex flex-col sm:flex-row sm:items-center gap-2'>
                  <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>
                    Missing required field value <Tip text='Triggered when the destination has a mandatory field and the source record value is blank or missing.' />
                  </span>
                  <select value={ecMissRequired} onChange={(e) => setEcMissRequired(e.target.value)} className={selectClass} style={selectStyle}>
                    <option>Use specified default per field ✓ Recommended</option>
                    <option>Use last known value from history</option>
                    <option>Skip the record</option>
                    <option>Skip the object</option>
                  </select>
                </div>
              </div>
            </div>

            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-base'>🏷</span>
                  <span className='text-sm font-semibold text-gray-800'>Field Defaults</span>
                  <Tip text='For each mandatory field in your selected objects, define a fallback value to use when the source record does not have one. Only fills in when the field is blank in source — existing values are not overwritten.' />
                </div>
                <span className='text-xs text-gray-400'>5 mandatory fields detected</span>
              </div>
              <div className='flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
                <span className='text-xs font-semibold text-gray-600'>Filter:</span>
                <select className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 outline-none'>
                  <option>All objects</option><option>Account</option><option>Contact</option><option>Opportunity</option><option>Case</option>
                </select>
                <input placeholder='Search fields…' className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none flex-1 sm:w-40 sm:flex-none' />
                <span className='ml-auto text-xs text-gray-400 hidden sm:inline'>Showing 5 of 5 mandatory fields</span>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='border-b border-gray-100 bg-gray-50'>
                      <th className='text-left py-2 px-4 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Field</th>
                      <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Type</th>
                      <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Default Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_DEFAULTS.map((row) => (
                      <tr key={row.field} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                        <td className='py-3 px-4'>
                          <p className='font-semibold text-gray-800'>{row.field}</p>
                          <p className='text-gray-400 mt-0.5'>{row.sub}</p>
                        </td>
                        <td className='py-3 px-3'>
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600'>{row.type}</span>
                        </td>
                        <td className='py-3 px-3'>
                          {row.options.length > 0 ? (
                            <select className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 outline-none w-full max-w-[160px]'>
                              {row.options.map((o) => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type='text'
                              defaultValue='noreply@acme.com'
                              className='h-8 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 w-full max-w-[160px]'
                              style={{ border: '1px solid #E2E8F0' }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className='px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400'>
                Mandatory fields are detected automatically from the destination schema.{' '}
                <button className='text-blue-600 hover:underline'>+ Add custom default rule</button>
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
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>💾 Save as Draft</button>
          <button
            onClick={onNext}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors'
            style={{ background: '#155DFC' }}
          >
            Next: Preview &amp; Validate →
          </button>
        </div>
      </div>
    </div>
  );
}
