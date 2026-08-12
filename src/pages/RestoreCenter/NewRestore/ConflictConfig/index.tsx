// ConflictConfig — Step 6 of 9 in the New Restore wizard.
// Restore Mode + CRM Automation Controls.

import { useState } from 'react';
import { Link } from 'react-router-dom';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict', 'Edge Cases', 'Preview', 'Review'];

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
      <span className='w-4 h-4 rounded-full bg-blue-100 border border-blue-300 text-blue-600 text-[9px] font-bold flex items-center justify-center'>i</span>
      <span className='absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-60 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 z-50 shadow-lg pointer-events-none'>
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
  { id: 'skip',    title: 'Skip if Exists',          desc: 'Do not touch records already in destination' },
  { id: 'replace', title: 'Replace Entire Object',   desc: 'Delete all destination records, then insert from source', danger: true },
  { id: 'merge',   title: 'Merge (per-field rule)', desc: 'Configurable per-field winner — best for partial / safety-first recovery' },
];

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onNext: (restoreMode: string) => void; onBack: () => void; scopeMode: string; }

export default function ConflictConfig({ onNext, onBack, scopeMode }: Props) {
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('overwrite');
  const [mergeDefault, setMergeDefault] = useState('Newest LastModifiedDate wins');

  type MergeRow = { id: number; objectName: string; fieldName: string; rule: string };
  const [mergeRows, setMergeRows] = useState<MergeRow[]>([
    { id: 1, objectName: 'Account', fieldName: 'AnnualRevenue', rule: 'Source always wins' },
    { id: 2, objectName: 'Account', fieldName: 'OwnerId',       rule: 'Destination always wins' },
  ]);
  const addMergeRow = () =>
    setMergeRows((p) => [...p, { id: Date.now(), objectName: '', fieldName: '', rule: 'Use default' }]);
  const removeMergeRow = (id: number) =>
    setMergeRows((p) => p.filter((r) => r.id !== id));
  const updateMergeRow = (id: number, patch: Partial<MergeRow>) =>
    setMergeRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));

  const MERGE_RULE_OPTIONS = [
    'Use default',
    'Source always wins',
    'Destination always wins',
    'Newest LastModifiedDate wins',
    'Use source if destination is blank',
    'Use destination if source is blank',
    'Concatenate values',
    'Use larger value',
    'Use smaller value',
  ];

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
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 6 of 9</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>
                Conflict &amp; Automation Configuration
                <Tip text='Decide how to handle records that already exist in the destination, and which automation to disable during the job. Recommended defaults are pre-selected.' />
              </h1>
              <p className='text-gray-500 mt-1 text-sm'>Define merge behaviour and CRM automation controls. Recommended defaults are pre-selected.</p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>6</span> of 9
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
                {[...RESTORE_MODES, ...RESTORE_MODES_FULL].filter((m) => {
                  if (scopeMode === 'record' && m.id === 'replace') return false;
                  if (scopeMode === 'field' && (m.id === 'replace' || m.id === 'append')) return false;
                  if (scopeMode === 'filter' && m.id === 'replace') return false;
                  if (scopeMode === 'deleted' && (m.id === 'skip' || m.id === 'merge' || m.id === 'replace')) return false;
                  if (scopeMode === 'changed' && m.id === 'replace') return false;
                  if (scopeMode === 'csv' && m.id === 'replace') return false;
                  return true;
                }).map((m) => {
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

                    {/* Column headers */}
                    <div className='grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center'>
                      <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Object</span>
                      <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Field</span>
                      <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Rule</span>
                      <span />
                    </div>

                    {/* Default row */}
                    <div className='grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center'>
                      <span className='text-xs font-semibold text-gray-700 col-span-2'>Default for all fields</span>
                      <select
                        value={mergeDefault}
                        onChange={(e) => setMergeDefault(e.target.value)}
                        className={selectClass} style={selectStyle}
                      >
                        {MERGE_RULE_OPTIONS.filter((o) => o !== 'Use default').map((o) => <option key={o}>{o}</option>)}
                      </select>
                      <span className='w-6' />
                    </div>

                    {/* Per-field override rows */}
                    {mergeRows.map((row) => (
                      <div key={row.id} className='grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center'>
                        <input
                          value={row.objectName}
                          onChange={(e) => updateMergeRow(row.id, { objectName: e.target.value })}
                          placeholder='Object API name'
                          className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white'
                          style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                        />
                        <input
                          value={row.fieldName}
                          onChange={(e) => updateMergeRow(row.id, { fieldName: e.target.value })}
                          placeholder='Field API name'
                          className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white'
                          style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                        />
                        <select
                          value={row.rule}
                          onChange={(e) => updateMergeRow(row.id, { rule: e.target.value })}
                          className={selectClass} style={selectStyle}
                        >
                          {MERGE_RULE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <button
                          onClick={() => removeMergeRow(row.id)}
                          className='w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:text-white hover:bg-red-500 transition-colors text-[11px] font-bold flex-shrink-0'
                        >×</button>
                      </div>
                    ))}

                    <button
                      onClick={addMergeRow}
                      className='text-xs font-semibold text-blue-600 hover:underline self-start'
                    >+ Add per-field override</button>
                  </div>
                )}
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
            onClick={() => onNext(restoreMode)}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors'
            style={{ background: '#155DFC' }}
          >
            Next: Edge Cases →
          </button>
        </div>
      </div>
    </div>
  );
}
