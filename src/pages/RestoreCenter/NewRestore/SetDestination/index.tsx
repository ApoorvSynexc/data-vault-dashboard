// SetDestination — Step 4 of 8 in the New Restore wizard.
// Lets the user pick where the restored data should land:
//   Same Org (Source) | Different Org | Sandbox (with Masking) | Export Only
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

type DestType = 'same' | 'diff' | 'sandbox' | 'export';

const DEST_TYPES: { id: DestType; title: string; desc: string }[] = [
  { id: 'same',    title: 'Same Org (Source)',      desc: 'Default — disaster recovery to original org' },
  { id: 'diff',    title: 'Different Org',           desc: 'Cross-org migration, DR drill, or seeding' },
  { id: 'sandbox', title: 'Sandbox (with Masking)',  desc: 'PII auto-masked — sandbox seeding' },
  { id: 'export',  title: 'Export Only',             desc: 'CSV / Parquet / JSON — no restore to org' },
];

// ── Tooltip helper ────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  return (
    <span className='relative group inline-flex items-center ml-1 cursor-help align-middle'>
      <span className='w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center'>i</span>
      <span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 z-50 shadow-lg pointer-events-none'>
        {text}
      </span>
    </span>
  );
}

// ── Sub-configs ───────────────────────────────────────────────────────────────

function SameOrgConfig() {
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
            <span className='text-gray-600'>Same as source: <strong className='text-gray-800'>Production (live CRM org)</strong></span>
          </div>
        </div>

        {/* Tag Restored Records */}
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

function DifferentOrgConfig() {
  const [tag, setTag]         = useState('Restored via DataVault {job-id}');
  const [destOrg, setDestOrg] = useState('Sandbox Dev1');

  const objectRows = [
    { src: 'Account',       dst: 'Account',       status: 'ok',   statusLabel: 'Auto-matched',        needsAction: false },
    { src: 'Contact',       dst: 'Contact',       status: 'ok',   statusLabel: 'Auto-matched',        needsAction: false },
    { src: 'Opportunity',   dst: 'Opportunity',   status: 'ok',   statusLabel: 'Auto-matched',        needsAction: false },
    { src: 'Engagement__c', dst: '',              status: 'warn', statusLabel: '⚠ No auto-match',     needsAction: true },
    { src: 'LegacyNote__c', dst: '',              status: 'warn', statusLabel: '⚠ Missing in dest',   needsAction: true },
  ];

  const fieldRows = [
    { src: 'Account.Name',           dst: 'Account.Name',      type: 'Text(255)', status: 'ok',   statusLabel: 'Match',                 warn: false },
    { src: 'Account.Industry',       dst: 'Account.Industry',  type: 'Picklist',  status: 'ok',   statusLabel: 'Match',                 warn: false },
    { src: 'Account.AnnualRevenue',  dst: 'Account.Revenue__c',type: 'Currency',  status: 'warn', statusLabel: 'Renamed in destination', warn: true  },
    { src: 'Account.Legacy_ID__c',   dst: '— Skip field —',    type: 'Text(40)',  status: 'err',  statusLabel: '⚠ Not in destination',  warn: true  },
  ];

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
        <span className='text-base'>🔄</span>
        <span className='text-sm font-semibold text-gray-800'>Different Org Configuration</span>
      </div>
      <div className='p-5 flex flex-col gap-5'>

        {/* Destination Org Connection */}
        <div className='flex flex-col gap-1.5'>
          <label className='text-sm font-medium text-gray-700'>
            Destination Org Connection <span className='text-red-500'>*</span>
          </label>
          <select
            value={destOrg}
            onChange={(e) => setDestOrg(e.target.value)}
            className='w-full h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
            style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
          >
            <option>Sandbox Dev1</option>
            <option>UAT</option>
            <option>+ Connect a new org…</option>
          </select>
          <p className='text-xs'>
            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700'>✓ Authenticated</span>
            <span className='text-gray-400 ml-2'>Last verified 2 hours ago · 7 days until token refresh</span>
          </p>
        </div>

        {/* Tag Restored Records */}
        <div className='flex flex-col gap-1.5'>
          <label className='text-sm font-medium text-gray-700'>
            Tag Restored Records
            <Tip text="A label written to a custom field on each restored record in the destination, so you can locate and report on them after the job." />
          </label>
          <input
            type='text'
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className='w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
            style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
          />
        </div>

        {/* Object Mapping */}
        <div className='rounded-xl overflow-hidden' style={{ border: '1px solid #F97316' }}>
          <div className='flex items-center gap-2 border-b px-5 py-3' style={{ borderColor: '#FED7AA', background: '#FFF7ED' }}>
            <span className='text-base'>🔁</span>
            <span className='text-sm font-semibold text-gray-800'>Object Mapping</span>
            <Tip text="When the destination is a different org, the same object might have a different API name. Object mapping runs FIRST — auto-detects matches by API name and lets you map (or skip) unmapped ones." />
          </div>
          <div className='p-4'>
            <div className='flex items-start gap-3 rounded-lg px-4 py-3 text-xs mb-4' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <svg width='13' height='13' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
                <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/>
              </svg>
              <p className='text-blue-800 leading-relaxed'><strong>How this works:</strong> Object mapping happens before field mapping. If the destination has no equivalent object, choose to Skip / Block / Create the object on the fly.</p>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='border-b border-gray-100'>
                    <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Source Object</th>
                    <th className='w-8'></th>
                    <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Destination Object</th>
                    <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Status</th>
                    <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>If unmapped</th>
                  </tr>
                </thead>
                <tbody>
                  {objectRows.map((row) => (
                    <tr key={row.src} className={`border-b border-gray-50 ${row.needsAction ? 'bg-orange-50' : ''}`}>
                      <td className='py-2.5 px-3 font-mono text-gray-700'>{row.src}</td>
                      <td className='text-center text-gray-400 font-bold'>→</td>
                      <td className='py-2.5 px-3'>
                        <select className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none w-full max-w-[180px]'>
                          {row.dst ? <option>{row.dst}</option> : <><option>— Pick destination object —</option><option>CustomerActivity__c</option></>}
                        </select>
                      </td>
                      <td className='py-2.5 px-3'>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>{row.statusLabel}</span>
                      </td>
                      <td className='py-2.5 px-3'>
                        {row.needsAction ? (
                          <select className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none'>
                            <option>Map manually</option>
                            <option>Skip object</option>
                            <option>Block job (until mapped)</option>
                            <option>Create object + fields</option>
                          </select>
                        ) : <span className='text-gray-300'>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className='text-xs text-gray-400 mt-3'>3 of 5 objects auto-matched · 2 need attention</p>
          </div>
        </div>

        {/* Field Mapping */}
        <div className='rounded-xl border border-gray-200 overflow-hidden'>
          <div className='flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3'>
            <div className='flex items-center gap-2'>
              <span className='text-base'>🔣</span>
              <span className='text-sm font-semibold text-gray-800'>Field Mapping</span>
              <Tip text="For each mapped object, line up source fields with destination fields. The system auto-suggests matches by exact API name, label match, and type compatibility." />
            </div>
            <select className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none'>
              <option>Account</option><option>Contact</option><option>Opportunity</option>
            </select>
          </div>
          <div className='p-4 overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b border-gray-100'>
                  <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Source Field</th>
                  <th className='w-8'></th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Destination Field</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Type</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Status</th>
                </tr>
              </thead>
              <tbody>
                {fieldRows.map((row) => (
                  <tr key={row.src} className={`border-b border-gray-50 ${row.status === 'warn' ? 'bg-orange-50' : row.status === 'err' ? 'bg-red-50' : ''}`}>
                    <td className='py-2.5 px-3 font-mono text-gray-700'>{row.src}</td>
                    <td className='text-center text-gray-400 font-bold'>→</td>
                    <td className='py-2.5 px-3'>
                      <select className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none w-full max-w-[200px]'>
                        <option>{row.dst}</option>
                      </select>
                    </td>
                    <td className='py-2.5 px-3 text-gray-500'>{row.type}</td>
                    <td className='py-2.5 px-3'>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.status === 'ok'   ? 'bg-green-100 text-green-700'  :
                        row.status === 'warn' ? 'bg-orange-100 text-orange-700' :
                                               'bg-red-100 text-red-700'
                      }`}>{row.statusLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function SandboxConfig() {
  const [sampleMode, setSampleMode] = useState('10% sample');
  const [rowCap, setRowCap]         = useState('5000');

  const maskingRows = [
    { field: 'Contact.Email',          classification: 'PII',       classColor: 'bg-red-100 text-red-700',    strategy: ['Replace with fake email (preserve domain)', 'Replace with fake email (random domain)'] },
    { field: 'Contact.Phone',          classification: 'PII',       classColor: 'bg-red-100 text-red-700',    strategy: ['Replace with fake phone', 'Hash', 'Null out'] },
    { field: 'Contact.FirstName',      classification: 'PII',       classColor: 'bg-red-100 text-red-700',    strategy: ['Replace with fake name', 'Initials only', 'Null out'] },
    { field: 'Account.AnnualRevenue',  classification: 'Sensitive', classColor: 'bg-orange-100 text-orange-700', strategy: ['No masking', 'Add ±20% noise', 'Round to nearest 100k'] },
  ];

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
        <span className='text-base'>🧪</span>
        <span className='text-sm font-semibold text-gray-800'>Sandbox (with Masking) Configuration</span>
      </div>
      <div className='p-5 flex flex-col gap-5'>

        {/* Sandbox Org */}
        <div className='flex flex-col gap-1.5'>
          <label className='text-sm font-medium text-gray-700'>Sandbox Org <span className='text-red-500'>*</span></label>
          <select className='w-full h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
            <option>UAT — Sandbox</option>
            <option>DevOrg-Alpha</option>
            <option>QA — Sandbox</option>
          </select>
        </div>

        {/* Sample size */}
        <div className='flex flex-col gap-1.5'>
          <label className='text-sm font-medium text-gray-700'>
            Sample size
            <Tip text="For sandbox seeding, you often want a subset rather than the full dataset. Pick a percentage or fixed row cap." />
          </label>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <select
              value={sampleMode}
              onChange={(e) => setSampleMode(e.target.value)}
              className='h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
              style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
            >
              <option>100% (full)</option>
              <option>10% sample</option>
              <option>1% sample</option>
              <option>Fixed row cap…</option>
            </select>
            <input
              type='number'
              value={rowCap}
              onChange={(e) => setRowCap(e.target.value)}
              disabled={sampleMode !== 'Fixed row cap…'}
              placeholder='Row cap (e.g. 5000)'
              className='h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50'
              style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
            />
          </div>
        </div>

        {/* PII Masking Rules */}
        <div className='rounded-xl border border-gray-200 overflow-hidden'>
          <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
            <span className='text-base'>🎭</span>
            <span className='text-sm font-semibold text-gray-800'>PII Masking Rules</span>
            <Tip text="PII is automatically replaced with safe synthetic values before landing in the sandbox. Pick the masking strategy per field." />
          </div>
          <div className='p-4 overflow-x-auto'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='border-b border-gray-100'>
                  <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Field</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Classification</th>
                  <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Masking Strategy</th>
                </tr>
              </thead>
              <tbody>
                {maskingRows.map((row) => (
                  <tr key={row.field} className='border-b border-gray-50'>
                    <td className='py-2.5 px-3 font-mono text-gray-700'>{row.field}</td>
                    <td className='py-2.5 px-3'>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.classColor}`}>{row.classification}</span>
                    </td>
                    <td className='py-2.5 px-3'>
                      <select className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none w-full max-w-[260px]'>
                        {row.strategy.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className='mt-3 text-xs font-semibold text-blue-600 hover:underline'>+ Add field rule</button>
          </div>
        </div>

      </div>
    </div>
  );
}

function ExportOnlyConfig() {
  const [splitByObject,      setSplitByObject]      = useState(true);
  const [includeSchemaHeader, setIncludeSchemaHeader] = useState(true);

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
        <span className='text-base'>⬇</span>
        <span className='text-sm font-semibold text-gray-800'>Export Only Configuration</span>
      </div>
      <div className='p-5 flex flex-col gap-5'>

        {/* Info callout */}
        <div className='flex items-start gap-3 rounded-lg px-4 py-3 text-xs' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <svg width='14' height='14' fill='none' stroke='#2563EB' strokeWidth='2' viewBox='0 0 24 24' className='flex-shrink-0 mt-0.5'>
            <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/>
          </svg>
          <p className='text-blue-800 leading-relaxed'>Export-only mode produces a file — nothing is written back to any live org. Conflict handling (Step 5) is skipped.</p>
        </div>

        {/* Output Format + Delivery */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium text-gray-700'>
              Output Format
              <Tip text="CSV is universally compatible. Parquet is best for large datasets and data warehouses. JSON preserves nested structure." />
            </label>
            <select className='h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
              <option>CSV (.csv)</option>
              <option>Parquet (.parquet)</option>
              <option>JSON Lines (.jsonl)</option>
              <option>Excel (.xlsx)</option>
            </select>
          </div>
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium text-gray-700'>
              Delivery
              <Tip text="Where the export file should land. Download is the simplest. S3/SFTP/Cloud Storage is best for large or scheduled exports." />
            </label>
            <select className='h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
              <option>Download to browser</option>
              <option>Email link</option>
            </select>
          </div>
        </div>

        {/* File name + Encryption */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium text-gray-700'>File name pattern</label>
            <input
              type='text'
              defaultValue='restore_{job-id}_{timestamp}.csv'
              className='h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30'
              style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-medium text-gray-700'>
              Encryption
              <Tip text="Encrypt the file at rest. AES-256 is standard. PGP recommended when delivering to external systems." />
            </label>
            <select className='h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/30' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
              <option>None (use only inside this org)</option>
              <option>AES-256 at rest</option>
              <option>PGP-encrypted</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className='flex flex-col gap-3 pt-1'>
          {[
            { label: 'Split by object', tip: 'Produce one file per object instead of a single combined file. Useful for downstream ETL pipelines.', value: splitByObject, set: setSplitByObject },
            { label: 'Include schema header', tip: 'Adds a header row of field API names as the first line of each export file.', value: includeSchemaHeader, set: setIncludeSchemaHeader },
          ].map(({ label, tip, value, set }) => (
            <div key={label} className='flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0'>
              <span className='text-sm text-gray-700'>{label}<Tip text={tip} /></span>
              <button
                onClick={() => set(!value)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors ${value ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-200'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onNext: () => void; onBack: () => void; }

export default function SetDestination({ onNext, onBack }: Props) {
  const [destType, setDestType] = useState<DestType>('same');

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

        {/* Destination Type cards */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
            <span className='text-sm font-semibold text-gray-800'>Destination Type</span>
            <Tip text="Pick where the restored data goes. The configuration changes based on your selection." />
          </div>
          <div className='p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
            {DEST_TYPES.map((dt) => {
              const active = destType === dt.id;
              return (
                <button
                  key={dt.id}
                  onClick={() => setDestType(dt.id)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <p className={`text-sm font-semibold ${active ? 'text-blue-600' : 'text-gray-800'}`}>{dt.title}</p>
                  <p className='mt-0.5 text-xs text-gray-500'>{dt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-config panel */}
        {destType === 'same'    && <SameOrgConfig />}
        {destType === 'diff'    && <DifferentOrgConfig />}
        {destType === 'sandbox' && <SandboxConfig />}
        {destType === 'export'  && <ExportOnlyConfig />}

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
            Next: Define Policy →
          </button>
        </div>
      </div>
    </div>
  );
}
