// EdgeCases — Step 7 of 9 in the New Restore wizard.
// Edge Case Handling + Field Defaults configuration.

import { useState } from 'react';
import { Link } from 'react-router-dom';

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

// ── Tooltip helper ────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  return (
    <span className='relative group inline-flex items-center ml-1 cursor-help align-middle'>
      <span className='w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center'>i</span>
      <span className='absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-60 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 z-50 shadow-lg pointer-events-none'>
        {text}
      </span>
    </span>
  );
}

// ── Field defaults data ───────────────────────────────────────────────────────

const FIELD_DEFAULTS = [
  { field: 'Account.Industry',      sub: 'Picklist · Required', type: 'Picklist', options: ['Other', 'Technology', 'Finance', 'Healthcare'] },
  { field: 'Account.Type',          sub: 'Picklist · Required', type: 'Picklist', options: ['Customer', 'Prospect', 'Partner', 'Other'] },
  { field: 'Contact.Email',         sub: 'Email · Required',    type: 'Email',    options: [] },
  { field: 'Opportunity.StageName', sub: 'Picklist · Required', type: 'Picklist', options: ['Prospecting', 'Qualification', 'Closed Lost'] },
  { field: 'Case.Status',           sub: 'Picklist · Required', type: 'Picklist', options: ['New', 'Working', 'Escalated', 'Closed'] },
];

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onNext: () => void; onBack: () => void; scopeMode: string; restoreMode: string; }

export default function EdgeCases({ onNext, onBack, scopeMode, restoreMode }: Props) {
  const [ecDuplicate,    setEcDuplicate]    = useState('Use destination if newer ✓ Recommended');
  const [ecMissingField, setEcMissingField] = useState('Skip the field ✓ Recommended');
  const [ecOwner,        setEcOwner]        = useState('Reassign to specified user ✓ Recommended');
  const [ecParent,       setEcParent]       = useState('Restore parent first ✓ Recommended');
  const [ecRecordType,   setEcRecordType]   = useState('Map to default ✓ Recommended');
  const [ecMissRequired, setEcMissRequired] = useState('Use specified default per field ✓ Recommended');
  const [fallbackOwner,  setFallbackOwner]  = useState('DataVault Service Account');

  type CustomRow = { id: number; field: string; type: string; value: string };
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [addedMsg, setAddedMsg] = useState(false);

  const addCustomRow = () => {
    const id = Date.now();
    setCustomRows((prev) => [...prev, { id, field: '', type: 'Text', value: '' }]);
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 2500);
  };

  const removeCustomRow = (id: number) => setCustomRows((prev) => prev.filter((r) => r.id !== id));
  const updateCustomRow = (id: number, patch: Partial<CustomRow>) =>
    setCustomRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));

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
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 7 of 9</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>
                Edge Case Handling
                <Tip text='Define how the restore job should behave when it encounters problematic scenarios — duplicates, missing fields, inactive owners, orphaned records, and mandatory field gaps.' />
              </h1>
              <p className='text-gray-500 mt-1 text-sm'>Configure fallback behaviour for edge cases and set default values for mandatory fields.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>7</span> of 9
            </span>
          </div>
          <div className='mt-4'>
            <ProgressBar active={7} />
          </div>
        </div>

        <div className='flex flex-col gap-4'>

          {/* Edge Case Handling */}
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
            <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3 rounded-t-xl'>
              <span className='text-sm font-semibold text-gray-800'>Edge Case Handling</span>
              <Tip text="What to do when something doesn't line up cleanly — duplicate Id, missing field in destination, owner no longer active, parent record missing, or record type missing." />
            </div>
            <div className='p-4 flex flex-col divide-y divide-gray-100'>
              {!(scopeMode === 'full' && (restoreMode === 'append' || restoreMode === 'skip' || restoreMode === 'replace')) && (
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
              )}
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

          {/* Field Defaults — only when "Use specified default per field" is selected */}
          {ecMissRequired === 'Use specified default per field ✓ Recommended' && <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
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
                    <th className='w-8' />
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
                          <input type='text' defaultValue='noreply@acme.com' className='h-8 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 w-full max-w-[160px]' style={{ border: '1px solid #E2E8F0' }} />
                        )}
                      </td>
                      <td className='py-3 px-3 w-8' />
                    </tr>
                  ))}
                  {customRows.map((row) => (
                    <tr key={row.id} className='border-b border-blue-50 bg-blue-50/40'>
                      <td className='py-2 px-4'>
                        <input
                          value={row.field}
                          onChange={(e) => updateCustomRow(row.id, { field: e.target.value })}
                          placeholder='Object.Field (e.g. Account.Type)'
                          className='h-8 w-full px-3 rounded-lg text-xs border border-blue-200 bg-white text-gray-800 outline-none focus:border-blue-400'
                        />
                      </td>
                      <td className='py-2 px-3'>
                        <select
                          value={row.type}
                          onChange={(e) => updateCustomRow(row.id, { type: e.target.value })}
                          className='h-8 text-xs border border-blue-200 rounded-lg px-2 bg-white text-gray-700 outline-none'
                        >
                          <option>Text</option>
                          <option>Picklist</option>
                          <option>Email</option>
                          <option>Number</option>
                          <option>Date</option>
                          <option>Checkbox</option>
                        </select>
                      </td>
                      <td className='py-2 px-3'>
                        <input
                          value={row.value}
                          onChange={(e) => updateCustomRow(row.id, { value: e.target.value })}
                          placeholder='Default value'
                          className='h-8 w-full max-w-[160px] px-3 rounded-lg text-xs border border-blue-200 bg-white text-gray-800 outline-none focus:border-blue-400'
                        />
                      </td>
                      <td className='py-2 px-3 w-8'>
                        <button onClick={() => removeCustomRow(row.id)} className='text-gray-400 hover:text-red-500 transition-colors'>
                          <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className='relative px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400'>
              Mandatory fields are detected automatically from the destination schema.{' '}
              <button onClick={addCustomRow} className='text-blue-600 hover:underline font-medium'>+ Add custom default rule</button>
              {addedMsg && (
                <span className='ml-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-800 bg-gray-900 text-white px-3 py-1.5 rounded-lg'>
                  ✓ Custom default row added — fill in the field, type, and value.
                </span>
              )}
            </div>
          </div>}

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
