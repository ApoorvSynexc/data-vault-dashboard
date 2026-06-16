// SelectScope — Step 2 of 7 in the New Restore wizard.
//
// Scope modes:
//   Full Restore   — everything from source, no filtering
//   By Object      — pick specific CRM objects
//   By Record      — explicit record IDs (manual or CSV)
//   By Field       — choose fields per object
//   Custom Filter  — visual builder or raw SOQL
//   Deleted-Only   — records deleted in destination since snapshot
//   Changed-Since  — fields that differ between source and dest
//   Bulk via CSV   — upload / paste ID list

import { useState } from 'react';
import Typography from '../../../../components/Typography';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScopeMode = 'full' | 'object' | 'record' | 'field' | 'filter' | 'deleted' | 'changed' | 'csv';
type FilterTab = 'visual' | 'soql';
type RelPreset = 'none' | 'standard' | 'everything' | 'custom';

interface SFObject {
  id: string;
  apiName: string;
  label: string;
  type: 'Standard' | 'Custom';
  records: string;
  size: string;
}

interface SFRecord {
  id: string;
  name: string;
  sfId: string;
  lastModified: string;
}

interface FilterRow {
  id: string;
  field: string;
  op: string;
  value: string;
}

// ── Stub data ─────────────────────────────────────────────────────────────────

const SF_OBJECTS: SFObject[] = [
  { id: '1', apiName: 'Account',             label: 'Account',           type: 'Standard', records: '123,213', size: '5.2 GB' },
  { id: '2', apiName: 'Contact',             label: 'Contact',           type: 'Standard', records: '3,213',   size: '1.2 GB' },
  { id: '3', apiName: 'Lead',                label: 'Lead',              type: 'Standard', records: '2,133',   size: '1.0 GB' },
  { id: '4', apiName: 'Opportunity',         label: 'Opportunity',       type: 'Standard', records: '6,343',   size: '1.5 GB' },
  { id: '5', apiName: 'Case',                label: 'Case',              type: 'Standard', records: '9,210',   size: '2.1 GB' },
  { id: '6', apiName: 'Task',                label: 'Task',              type: 'Standard', records: '23,140',  size: '1.4 GB' },
  { id: '7', apiName: 'Custom_Audit_Log__c', label: 'Custom Audit Log',  type: 'Custom',   records: '8,401',   size: '0.8 GB' },
];

const SF_RECORDS: SFRecord[] = [
  { id: '1', name: 'Acme Corp Industries', sfId: '0013a00001AbcDe', lastModified: 'May 22' },
  { id: '2', name: 'Globex Inc',           sfId: '0013a00001AbcDf', lastModified: 'May 21' },
  { id: '3', name: 'Initech',              sfId: '0013a00001AbcDg', lastModified: 'May 18' },
  { id: '4', name: 'Stark Industries',     sfId: '0013a00001AbcDh', lastModified: 'May 15' },
];

const FIELD_OPTIONS: Record<string, string[]> = {
  Account:    ['Name', 'Type', 'Industry', 'AnnualRevenue', 'BillingCity', 'BillingCountry', 'Phone', 'Website', 'OwnerId', 'CreatedDate', 'LastModifiedDate', 'Description'],
  Contact:    ['FirstName', 'LastName', 'Email', 'Phone', 'AccountId', 'Title', 'Department', 'OwnerId'],
  Lead:       ['FirstName', 'LastName', 'Email', 'Phone', 'Company', 'Status', 'LeadSource', 'OwnerId'],
  Opportunity:['Name', 'StageName', 'CloseDate', 'Amount', 'AccountId', 'OwnerId', 'Probability', 'Type'],
  Case:       ['CaseNumber', 'Subject', 'Status', 'Priority', 'AccountId', 'ContactId', 'OwnerId', 'Description'],
  Task:       ['Subject', 'Status', 'Priority', 'ActivityDate', 'WhoId', 'WhatId', 'OwnerId'],
};

const FILTER_FIELDS = ['Status', 'LastModifiedDate', 'CreatedDate', 'OwnerId', 'Amount'];
const FILTER_OPS    = ['equals', 'not equals', 'contains', 'after', 'before'];

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Selection', 'Destination', 'Conflict', 'Automation', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='flex items-center overflow-x-auto'>
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isDone   = num < active;
        const isActive = num === active;
        return (
          <div key={label} className='flex items-center flex-1 min-w-0'>
            <div className={`flex items-center gap-1.5 flex-shrink-0 text-[11px] font-semibold whitespace-nowrap ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 flex-shrink-0 ${
                isDone   ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-blue-600 border-blue-600 text-white' :
                           'bg-white border-gray-300 text-gray-400'
              }`}>
                {isDone ? '✓' : num}
              </div>
              <span className='hidden sm:inline'>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className='flex-1 h-0.5 mx-2' style={{ background: isDone ? '#22C55E' : '#E5E7EB' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Scope mode cards ──────────────────────────────────────────────────────────

const SCOPE_MODES: { id: ScopeMode; icon: string; title: string; desc: string }[] = [
  { id: 'full',    icon: '★',  title: 'Full Restore',   desc: 'Everything in the source — no further filtering' },
  { id: 'object',  icon: '◫',  title: 'By Object',      desc: 'Pick one or more CRM objects' },
  { id: 'record',  icon: '◉',  title: 'By Record',      desc: 'Explicit record IDs (manual or CSV)' },
  { id: 'field',   icon: '▤',  title: 'By Field',       desc: 'Specific fields within records' },
  { id: 'filter',  icon: '⚙',  title: 'Custom Filter',  desc: 'Visual filter or raw SOQL — with live match count' },
  { id: 'deleted', icon: '⌫',  title: 'Deleted-Only',   desc: 'Records deleted in destination since snapshot' },
  { id: 'changed', icon: 'Δ',  title: 'Changed-Since',  desc: 'Fields that differ between source and dest' },
  { id: 'csv',     icon: '📋', title: 'Bulk via CSV',   desc: 'Paste or upload IDs / external IDs' },
];

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: 'Standard' | 'Custom' }) {
  return type === 'Custom'
    ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>Custom</span>
    : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600'>Standard</span>;
}

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex items-start gap-2.5 rounded-lg px-4 py-3 mb-4 text-xs leading-relaxed' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
      <svg className='flex-shrink-0 mt-0.5 text-blue-500' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
        <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/>
      </svg>
      <p className='text-blue-800'>{children}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onNext: () => void; onBack: () => void; }

export default function SelectScope({ onNext, onBack }: Props) {
  // scope selection
  const [scopeMode, setScopeMode] = useState<ScopeMode>('full');

  // by-object state
  const [objSearch,        setObjSearch]        = useState('');
  const [selectedObjects,  setSelectedObjects]  = useState<Set<string>>(new Set(['1', '2', '4']));

  // by-record state
  const [recordObj,        setRecordObj]        = useState('Account');
  const [recordSearch,     setRecordSearch]     = useState('');
  const [selectedRecords,  setSelectedRecords]  = useState<Set<string>>(new Set(['1', '2']));
  const [showIdList,       setShowIdList]       = useState(false);
  const [idListText,       setIdListText]       = useState('');

  // by-field state
  const [fieldObjSearch,   setFieldObjSearch]   = useState('');
  const [fieldSelectedObjs,setFieldSelectedObjs]= useState<Set<string>>(new Set(['1', '2']));
  const [activeFieldObj,   setActiveFieldObj]   = useState('Account');
  const [selectedFields,   setSelectedFields]   = useState<Record<string, Set<string>>>({
    Account: new Set(['Name', 'Industry', 'AnnualRevenue']),
  });
  const [fieldFilter,      setFieldFilter]      = useState<'All' | 'Standard' | 'Custom' | 'Required'>('All');
  const [fieldSearch,      setFieldSearch]      = useState('');

  // custom filter state
  const [filterTab,        setFilterTab]        = useState<FilterTab>('visual');
  const [filterRows,       setFilterRows]       = useState<FilterRow[]>([
    { id: '1', field: 'Status',           op: 'equals', value: 'Closed' },
    { id: '2', field: 'LastModifiedDate', op: 'after',  value: '2026-01-01' },
  ]);
  const [filterLogic,      setFilterLogic]      = useState('1 AND 2');
  const [soqlText,         setSoqlText]         = useState("SELECT Id, Name, Industry, AnnualRevenue\nFROM Account\nWHERE Status = 'Closed'\n  AND LastModifiedDate > 2026-01-01\n  AND BillingCountry = 'US'");

  // changed-since state
  const [changedDate,      setChangedDate]      = useState('2026-05-01');

  // csv state
  const [csvText,          setCsvText]          = useState('0013a00001AbcDe\n0013a00001AbcDf\n0013a00001AbcDg');

  // related records state
  const [relPreset,        setRelPreset]        = useState<RelPreset>('standard');
  const [includeParents,   setIncludeParents]   = useState(true);
  const [includeChildren,  setIncludeChildren]  = useState(true);
  const [relDepth,         setRelDepth]         = useState('2 levels');
  const [includeChatter,   setIncludeChatter]   = useState(false);
  const [includeEmail,     setIncludeEmail]     = useState(false);

  const showRelated = scopeMode !== 'full';

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toggleObj = (id: string) =>
    setSelectedObjects((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAllObjs = () =>
    setSelectedObjects(selectedObjects.size === SF_OBJECTS.length ? new Set() : new Set(SF_OBJECTS.map((o) => o.id)));

  const toggleRecord = (id: string) =>
    setSelectedRecords((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleFieldObj = (apiName: string) => {
    setFieldSelectedObjs((p) => {
      const n = new Set(p);
      if (n.has(apiName)) { n.delete(apiName); } else { n.add(apiName); setActiveFieldObj(apiName); }
      return n;
    });
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) => {
      const cur = new Set(prev[activeFieldObj] ?? []);
      cur.has(field) ? cur.delete(field) : cur.add(field);
      return { ...prev, [activeFieldObj]: cur };
    });
  };

  const addFilterRow = () =>
    setFilterRows((p) => [...p, { id: String(Date.now()), field: 'Status', op: 'equals', value: '' }]);

  const removeFilterRow = (id: string) =>
    setFilterRows((p) => p.filter((r) => r.id !== id));

  const updateFilterRow = (id: string, patch: Partial<FilterRow>) =>
    setFilterRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));

  const applyRelPreset = (preset: RelPreset) => {
    setRelPreset(preset);
    if (preset === 'none')       { setIncludeParents(false); setIncludeChildren(false); setIncludeChatter(false); setIncludeEmail(false); }
    if (preset === 'standard')   { setIncludeParents(true);  setIncludeChildren(false); setIncludeChatter(false); setIncludeEmail(false); }
    if (preset === 'everything') { setIncludeParents(true);  setIncludeChildren(true);  setIncludeChatter(true);  setIncludeEmail(true);  }
  };

  // ── Object table columns ───────────────────────────────────────────────────

  const filteredObjs = SF_OBJECTS.filter(
    (o) => o.label.toLowerCase().includes(objSearch.toLowerCase()) || o.apiName.toLowerCase().includes(objSearch.toLowerCase()),
  );

  const objectColumns: TableColumn<SFObject>[] = [
    {
      key: 'check', header: '', width: '40px',
      render: (row) => (
        <input type='checkbox' checked={selectedObjects.has(row.id)} onChange={() => toggleObj(row.id)}
          className='w-4 h-4 accent-blue-600 cursor-pointer rounded' />
      ),
    },
    {
      key: 'label', header: 'Object',
      render: (row) => (
        <div>
          <p className='text-sm font-semibold text-gray-900'>{row.label}</p>
          <p className='text-xs text-gray-400 font-mono mt-0.5'>{row.apiName}</p>
        </div>
      ),
    },
    { key: 'type',    header: 'Type',    render: (row) => <TypeBadge type={row.type} /> },
    { key: 'records', header: 'Records', render: (row) => <span className='text-sm tabular-nums text-gray-700'>{row.records}</span> },
    { key: 'size',    header: 'Est. Size', render: (row) => <span className='text-sm text-gray-700'>{row.size}</span> },
  ];

  // ── Record table columns ───────────────────────────────────────────────────

  const filteredRecords = SF_RECORDS.filter(
    (r) => r.name.toLowerCase().includes(recordSearch.toLowerCase()) || r.sfId.includes(recordSearch),
  );

  const recordColumns: TableColumn<SFRecord>[] = [
    {
      key: 'check', header: '', width: '40px',
      render: (row) => (
        <input type='checkbox' checked={selectedRecords.has(row.id)} onChange={() => toggleRecord(row.id)}
          className='w-4 h-4 accent-blue-600 cursor-pointer rounded' />
      ),
    },
    { key: 'name',         header: 'Record',        render: (row) => <span className='text-sm font-semibold text-gray-900'>{row.name}</span> },
    { key: 'sfId',         header: 'ID',            render: (row) => <span className='text-xs font-mono text-gray-500'>{row.sfId}</span> },
    { key: 'lastModified', header: 'Last Modified', render: (row) => <span className='text-sm text-gray-500'>{row.lastModified}</span> },
  ];

  // ── Derived field data ─────────────────────────────────────────────────────

  const availableFields = (FIELD_OPTIONS[activeFieldObj] ?? []).filter(
    (f) => f.toLowerCase().includes(fieldSearch.toLowerCase()),
  );
  const activeFieldSet = selectedFields[activeFieldObj] ?? new Set<string>();

  // ── CSV stats ──────────────────────────────────────────────────────────────

  const csvIds = csvText.split('\n').map((l) => l.trim()).filter(Boolean);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className='flex flex-col h-full min-h-0 bg-gray-50'>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div className='flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4'>

        {/* Job badge */}
        <div className='flex-shrink-0 rounded-xl border border-blue-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm'>
            <span className='flex items-center gap-1.5 text-gray-500'>
              <span className='font-semibold text-gray-700'>Restore:</span>
              <span>Untitled — May 27, 10:30 AM</span>
              <button className='text-blue-500 hover:text-blue-700 text-xs ml-0.5'>✎</button>
            </span>
            <span className='w-px h-4 bg-gray-200 hidden sm:block' />
            <span className='flex items-center gap-1.5 text-gray-500'>
              <span className='font-semibold text-gray-700'>Tags:</span> INC-4711
            </span>
            <span className='w-px h-4 bg-gray-200 hidden sm:block' />
            <span className='flex items-center gap-1.5 text-gray-500'>
              <span className='font-semibold text-gray-700'>Source:</span> Backup · May 27, 06:00 AM
              <button className='text-blue-500 hover:text-blue-700 text-xs ml-0.5'>✎</button>
            </span>
          </div>
        </div>

        {/* Wizard header */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2'>
            <div>
              <p className='text-xs font-semibold text-blue-600 mb-1'>Step 2 of 7</p>
              <Typography as='h1' variant='pageTitle' color='primary'>Choose Selection Scope</Typography>
              <Typography variant='bodySm' color='muted' className='mt-0.5'>
                Pick a mode below. Only the relevant sub-UI appears — no clutter.
              </Typography>
            </div>
          </div>
          <div className='mt-4'>
            <ProgressBar active={2} />
          </div>
        </div>

        {/* ── Scope mode grid ────────────────────────────────────────────── */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='px-5 py-3 border-b border-gray-100'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Restore Scope</Typography>
          </div>
          <div className='p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
            {SCOPE_MODES.map((m) => {
              const active = scopeMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setScopeMode(m.id)}
                  className={`text-left rounded-xl border-2 px-4 py-3 transition-all flex items-start gap-3 ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <span className={`text-lg leading-none flex-shrink-0 mt-0.5 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                    {m.icon}
                  </span>
                  <div className='flex-1 min-w-0'>
                    <p className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-800'}`}>{m.title}</p>
                    <p className='text-xs text-gray-500 mt-0.5 leading-snug'>{m.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    active ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                  }`}>
                    {active && <div className='w-1.5 h-1.5 rounded-full bg-white' />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sub-UI: Full Restore ───────────────────────────────────────── */}
        {scopeMode === 'full' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>★ Full Restore — Summary</Typography>
            </div>
            <div className='p-5'>
              <div className='flex items-start gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4'>
                <div className='w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <svg className='text-white' width='16' height='16' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7'/>
                  </svg>
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-bold text-green-800'>All data in the source will be restored</p>
                  <p className='text-xs text-green-700 mt-1'>
                    Every record of every object in the chosen source. No further selection or filtering needed.
                  </p>
                  <div className='flex flex-wrap gap-5 mt-3 text-xs text-green-700'>
                    <span><span className='font-bold text-green-900'>12</span> objects</span>
                    <span><span className='font-bold text-green-900'>8,435</span> records</span>
                    <span><span className='font-bold text-green-900'>320 MB</span> data</span>
                    <span><span className='font-bold text-green-900'>~4 min</span> estimated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-UI: By Object ─────────────────────────────────────────── */}
        {scopeMode === 'object' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>◫ Select Objects</Typography>
              <div className='flex items-center gap-2 flex-wrap'>
                <div className='relative'>
                  <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                    <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                  </svg>
                  <input
                    value={objSearch} onChange={(e) => setObjSearch(e.target.value)}
                    placeholder='Search object…'
                    className='pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44'
                  />
                </div>
                <button onClick={toggleAllObjs} className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap'>
                  {selectedObjects.size === SF_OBJECTS.length ? 'Deselect all' : 'Select all'}
                </button>
                <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700'>
                  {selectedObjects.size} Selected
                </span>
              </div>
            </div>
            <Table
              columns={objectColumns}
              rows={filteredObjs}
              getRowKey={(r) => r.id}
              borderless
              headerVariant='uppercase'
              cellPaddingClassName='px-5 py-3'
              rowClassName={(row) =>
                `border-b border-gray-50 transition-colors cursor-pointer ${selectedObjects.has(row.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`
              }
              onRowClick={(row) => toggleObj(row.id)}
            />
          </div>
        )}

        {/* ── Sub-UI: By Record ─────────────────────────────────────────── */}
        {scopeMode === 'record' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>◉ Select Records</Typography>
            </div>
            <div className='p-5 space-y-4'>
              <InfoCallout>
                Object dropdown is populated from the <strong>source snapshot's manifest</strong> — only objects that exist in the chosen backup or archive appear.
              </InfoCallout>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <select
                  value={recordObj} onChange={(e) => setRecordObj(e.target.value)}
                  className='h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                >
                  {SF_OBJECTS.map((o) => <option key={o.id} value={o.apiName}>{o.label}</option>)}
                </select>
                <div className='relative'>
                  <svg className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                    <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                  </svg>
                  <input
                    value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)}
                    placeholder='Search records by name or ID…'
                    className='w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
                  />
                </div>
              </div>

              <Table
                columns={recordColumns}
                rows={filteredRecords}
                getRowKey={(r) => r.id}
                borderless
                headerVariant='uppercase'
                cellPaddingClassName='px-5 py-3'
                rowClassName={(row) =>
                  `border-b border-gray-50 transition-colors cursor-pointer ${selectedRecords.has(row.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`
                }
                onRowClick={(row) => toggleRecord(row.id)}
              />

              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <span>{selectedRecords.size} records selected</span>
                <span>·</span>
                <button onClick={() => setShowIdList((v) => !v)} className='text-blue-600 hover:underline text-sm'>
                  {showIdList ? '− Hide ID list' : '+ Add by ID list'}
                </button>
              </div>

              {showIdList && (
                <div className='space-y-2'>
                  <p className='text-xs font-semibold text-gray-700'>Paste record IDs or external IDs (one per line)</p>
                  <textarea
                    value={idListText} onChange={(e) => setIdListText(e.target.value)}
                    placeholder={'0013a00001AbcDe\n0013a00001AbcDf'}
                    rows={4}
                    className='w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50'
                  />
                  <div className='flex gap-2'>
                    <button className='text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'>Add IDs</button>
                    <button onClick={() => setShowIdList(false)} className='text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sub-UI: By Field ──────────────────────────────────────────── */}
        {scopeMode === 'field' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>▤ Pick Fields per Object</Typography>
            </div>
            <div className='p-5 space-y-4'>
              <InfoCallout>
                Objects come from the <strong>source snapshot's manifest</strong>. Step 1: tick the objects you want. Step 2: click each object to choose its fields.
              </InfoCallout>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>

                {/* Left — object list */}
                <div className='rounded-lg border border-gray-200 overflow-hidden'>
                  <div className='px-3 py-2 border-b border-gray-100 bg-gray-50'>
                    <div className='relative'>
                      <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                        <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                      </svg>
                      <input
                        value={fieldObjSearch} onChange={(e) => setFieldObjSearch(e.target.value)}
                        placeholder='Search objects…'
                        className='w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
                      />
                    </div>
                  </div>
                  <div className='px-2 py-1 bg-gray-50 border-b border-gray-100'>
                    <p className='text-[10px] font-bold text-gray-500 uppercase tracking-wide px-2 py-1'>Selected objects <span className='font-normal'>(tick to include)</span></p>
                  </div>
                  <div className='divide-y divide-gray-50 max-h-64 overflow-y-auto'>
                    {SF_OBJECTS
                      .filter((o) => o.label.toLowerCase().includes(fieldObjSearch.toLowerCase()))
                      .map((o) => {
                        const isTicked  = fieldSelectedObjs.has(o.apiName);
                        const isActive  = activeFieldObj === o.apiName;
                        const fieldCount = selectedFields[o.apiName]?.size ?? 0;
                        const total      = (FIELD_OPTIONS[o.apiName] ?? []).length;
                        return (
                          <div
                            key={o.id}
                            onClick={() => { toggleFieldObj(o.apiName); setActiveFieldObj(o.apiName); }}
                            className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <input
                              type='checkbox' checked={isTicked}
                              onChange={(e) => { e.stopPropagation(); toggleFieldObj(o.apiName); }}
                              className='w-3.5 h-3.5 accent-blue-600 cursor-pointer flex-shrink-0'
                            />
                            <span className={`text-sm flex-1 ${isActive ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>{o.label}</span>
                            <span className='text-xs text-gray-400 flex-shrink-0'>
                              {isTicked ? `${fieldCount}/${total}` : '—'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div className='px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-400'>
                    <span>Showing {SF_OBJECTS.length} of {SF_OBJECTS.length}</span>
                    <button className='text-blue-500 hover:underline'>Load more ↓</button>
                  </div>
                </div>

                {/* Right — field picker */}
                <div className='rounded-lg border border-gray-200 overflow-hidden'>
                  <div className='px-3 py-2 border-b border-gray-100 bg-gray-50 space-y-2'>
                    <div className='relative'>
                      <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                        <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                      </svg>
                      <input
                        value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder={`Search fields in ${activeFieldObj}…`}
                        className='w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
                      />
                    </div>
                    <div className='flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold'>
                      {(['All', 'Standard', 'Custom', 'Required'] as const).map((f) => (
                        <button
                          key={f} onClick={() => setFieldFilter(f)}
                          className={`flex-1 px-2 py-1 transition-colors ${fieldFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className='px-3 py-2 border-b border-gray-100 flex items-center justify-between'>
                    <p className='text-xs font-semibold text-gray-700'>{activeFieldObj} — pick fields to restore</p>
                    <div className='flex gap-2 text-xs'>
                      <button onClick={() => setSelectedFields((p) => ({ ...p, [activeFieldObj]: new Set(availableFields) }))} className='text-blue-500 hover:underline'>Select all</button>
                      <span className='text-gray-300'>·</span>
                      <button onClick={() => setSelectedFields((p) => ({ ...p, [activeFieldObj]: new Set() }))} className='text-blue-500 hover:underline'>Deselect all</button>
                    </div>
                  </div>

                  <div className='p-3 flex flex-wrap gap-2 max-h-52 overflow-y-auto'>
                    {availableFields.map((f) => {
                      const on = activeFieldSet.has(f);
                      return (
                        <button
                          key={f} onClick={() => toggleField(f)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                    {availableFields.length === 0 && (
                      <p className='text-xs text-gray-400'>No fields match your search.</p>
                    )}
                  </div>

                  <div className='px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-400'>
                    <span>{activeFieldSet.size} of {(FIELD_OPTIONS[activeFieldObj] ?? []).length} fields selected · showing {availableFields.length}</span>
                    <button className='text-blue-500 hover:underline'>Load more ↓</button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── Sub-UI: Custom Filter ─────────────────────────────────────── */}
        {scopeMode === 'filter' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>⚙ Custom Filter</Typography>
            </div>
            <div className='p-5 space-y-4'>
              {/* Tabs */}
              <div className='flex border-b border-gray-200'>
                {(['visual', 'soql'] as FilterTab[]).map((t) => (
                  <button
                    key={t} onClick={() => setFilterTab(t)}
                    className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
                      filterTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'visual' ? 'Visual Builder' : 'Write SOQL'}
                  </button>
                ))}
              </div>

              {/* Visual builder */}
              {filterTab === 'visual' && (
                <div className='space-y-4'>
                  <p className='text-xs text-gray-500'>Object: <strong className='text-gray-800'>Account</strong> · All filters in a group combine with AND.</p>
                  <div className='space-y-2'>
                    {filterRows.map((row, idx) => (
                      <div key={row.id} className='flex items-center gap-2 flex-wrap'>
                        <span className='text-xs text-gray-400 font-semibold w-4 flex-shrink-0'>{idx + 1}</span>
                        <select
                          value={row.field} onChange={(e) => updateFilterRow(row.id, { field: e.target.value })}
                          className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none flex-1 min-w-0 sm:flex-none sm:w-40'
                        >
                          {FILTER_FIELDS.map((f) => <option key={f}>{f}</option>)}
                        </select>
                        <select
                          value={row.op} onChange={(e) => updateFilterRow(row.id, { op: e.target.value })}
                          className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none flex-1 min-w-0 sm:flex-none sm:w-28'
                        >
                          {FILTER_OPS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <input
                          value={row.value} onChange={(e) => updateFilterRow(row.id, { value: e.target.value })}
                          className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none flex-1 min-w-0 sm:w-32'
                        />
                        <button onClick={() => removeFilterRow(row.id)} className='w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0'>×</button>
                      </div>
                    ))}
                  </div>
                  <div className='flex gap-2'>
                    <button onClick={addFilterRow} className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors'>+ Add filter</button>
                    <button className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors'>+ OR group</button>
                  </div>

                  {/* Filter logic */}
                  <div className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-1.5'>
                    <div className='flex items-center gap-3 flex-wrap'>
                      <label className='text-xs font-semibold text-gray-700 flex-shrink-0'>Filter Logic</label>
                      <input
                        value={filterLogic} onChange={(e) => setFilterLogic(e.target.value)}
                        placeholder='e.g. (1 OR 2) AND (3 OR 4)'
                        className='h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-0 sm:w-48 sm:flex-none'
                      />
                    </div>
                    <p className='text-[11px] text-gray-400'>Default is AND between all rows. Override only if you need nested boolean logic.</p>
                  </div>

                  {/* Live count */}
                  <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800'>
                    <span>📊</span>
                    <span>Live preview: <strong>1,243</strong> records match this filter</span>
                  </div>
                  <div className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-mono text-gray-600'>
                    Resolved SOQL: <span className='text-blue-600'>SELECT Id FROM Account WHERE Status = 'Closed' AND LastModifiedDate &gt; 2026-01-01</span>
                  </div>
                </div>
              )}

              {/* SOQL editor */}
              {filterTab === 'soql' && (
                <div className='space-y-3'>
                  <p className='text-xs text-gray-500'>Paste a raw SOQL query. The system parses it, validates against the source schema, and shows the live match count.</p>
                  <textarea
                    value={soqlText} onChange={(e) => setSoqlText(e.target.value)}
                    rows={6}
                    className='w-full text-sm font-mono border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50'
                  />
                  <InfoCallout>Editing the SOQL directly resets the visual builder.</InfoCallout>
                  <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800'>
                    <span>📊</span>
                    <span>SOQL parsed successfully · <strong>892</strong> records match · <button className='text-blue-600 hover:underline'>Preview first 10</button></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sub-UI: Deleted-Only ──────────────────────────────────────── */}
        {scopeMode === 'deleted' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>⌫ Deleted-Only Mode</Typography>
            </div>
            <div className='p-5'>
              <div className='flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4'>
                <div className='w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-600 text-base'>
                  ⌫
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-bold text-amber-800'>Will restore records deleted in destination since the snapshot</p>
                  <p className='text-xs text-amber-700 mt-1'>
                    The system auto-compares the source snapshot to the destination and surfaces records that exist in the source but are missing (or in the recycle bin) in the destination. Records that were never deleted will not be touched.
                  </p>
                  <div className='flex flex-wrap gap-5 mt-3 text-xs text-amber-700'>
                    <span><span className='font-bold text-amber-900'>~218</span> deleted records detected</span>
                    <span>across <span className='font-bold text-amber-900'>5</span> objects</span>
                    <span>Last computed: just now · <button className='text-blue-600 hover:underline'>Recompute</button></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-UI: Changed-Since ─────────────────────────────────────── */}
        {scopeMode === 'changed' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>Δ Changed-Since Mode</Typography>
            </div>
            <div className='p-5 space-y-4'>
              <div className='flex flex-col sm:flex-row sm:items-end gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-gray-700 mb-1.5'>Since date</label>
                  <input
                    type='date' value={changedDate} onChange={(e) => setChangedDate(e.target.value)}
                    className='h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'
                  />
                </div>
                <p className='text-xs text-gray-600 pb-1'>
                  ⚡ Live: <strong>1,420 records</strong> have at least one differing field since{' '}
                  {changedDate ? new Date(changedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </p>
              </div>
              <div className='flex items-start gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4'>
                <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-gray-600 font-bold'>Δ</div>
                <div>
                  <p className='text-sm font-bold text-gray-800'>Diff-based restore</p>
                  <p className='text-xs text-gray-600 mt-1'>
                    Two-level: first the system finds <strong>records</strong> that have at least one field differing from the snapshot, then within those records it writes back <strong>only the differing fields</strong>. Records with no differences and unchanged fields are left untouched.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-UI: Bulk via CSV ──────────────────────────────────────── */}
        {scopeMode === 'csv' && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>📋 Bulk Match via CSV</Typography>
            </div>
            <div className='p-5 space-y-4'>
              {/* Drop zone */}
              <div className='border-2 border-dashed border-gray-300 rounded-xl px-6 py-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer'>
                <p className='text-3xl text-gray-300 mb-2'>⬆</p>
                <p className='text-sm font-semibold text-gray-700'>Drop a CSV file here or click to browse</p>
                <p className='text-xs text-gray-400 mt-1'>First column = record ID or external ID. UTF-8 encoded, max 200 MB.</p>
              </div>
              <p className='text-xs font-semibold text-gray-700'>Or paste record IDs (one per line)</p>
              <textarea
                value={csvText} onChange={(e) => setCsvText(e.target.value)}
                rows={5}
                className='w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50'
              />
              {csvIds.length > 0 && (
                <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800'>
                  <span>📊</span>
                  <span>
                    <strong>{csvIds.length} IDs</strong> detected · <strong>{csvIds.length} matched</strong> in source snapshot · 0 not found
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Related Records & Attachments (universal, not on Full) ────── */}
        {showRelated && (
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-5 py-3 border-b border-gray-100'>
              <Typography as='h3' variant='sectionTitle' color='secondary'>🔗 Related Records &amp; Attachments</Typography>
            </div>
            <div className='p-5 space-y-4'>
              {/* Preset buttons */}
              <div className='flex flex-wrap gap-2'>
                {([
                  { id: 'none',      label: 'None',      sub: '(this selection only)' },
                  { id: 'standard',  label: 'Standard',  sub: '(parents only)' },
                  { id: 'everything',label: 'Everything', sub: '(all content + chatter)' },
                  { id: 'custom',    label: 'Custom',    sub: '' },
                ] as { id: RelPreset; label: string; sub: string }[]).map((p) => (
                  <button
                    key={p.id} onClick={() => applyRelPreset(p.id)}
                    className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-colors ${
                      relPreset === p.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                    {p.sub && <span className='text-xs font-normal text-gray-400'>{p.sub}</span>}
                  </button>
                ))}
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Family Records */}
                <div className='rounded-lg border border-gray-200 p-4 space-y-3'>
                  <p className='text-sm font-semibold text-gray-800'>👪 Family Records</p>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-gray-400 text-base'>↑</span>
                      <span className='text-sm text-gray-700'>Include Parent Records</span>
                    </div>
                    <label className='relative inline-flex items-center cursor-pointer'>
                      <input type='checkbox' checked={includeParents} onChange={(e) => setIncludeParents(e.target.checked)} className='sr-only peer' />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-gray-400 text-base'>↓</span>
                      <span className='text-sm text-gray-700'>Include Child Records</span>
                    </div>
                    <label className='relative inline-flex items-center cursor-pointer'>
                      <input type='checkbox' checked={includeChildren} onChange={(e) => setIncludeChildren(e.target.checked)} className='sr-only peer' />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-xs text-gray-600'>Relationship depth:</span>
                    <select
                      value={relDepth} onChange={(e) => setRelDepth(e.target.value)}
                      className='h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none'
                    >
                      <option>1 level (direct only)</option>
                      <option>2 levels</option>
                      <option>3 levels</option>
                    </select>
                  </div>
                </div>

                {/* Attached Content */}
                <div className='rounded-lg border border-gray-200 p-4 space-y-3'>
                  <p className='text-sm font-semibold text-gray-800'>📎 Attached Content</p>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-gray-400'>💬</span>
                      <span className='text-sm text-gray-700'>Chatter / FeedItems</span>
                    </div>
                    <label className='relative inline-flex items-center cursor-pointer'>
                      <input type='checkbox' checked={includeChatter} onChange={(e) => setIncludeChatter(e.target.checked)} className='sr-only peer' />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-gray-400'>✉</span>
                      <span className='text-sm text-gray-700'>EmailMessage</span>
                    </div>
                    <label className='relative inline-flex items-center cursor-pointer'>
                      <input type='checkbox' checked={includeEmail} onChange={(e) => setIncludeEmail(e.target.checked)} className='sr-only peer' />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky footer ───────────────────────────────────────────────── */}
      <div className='flex-shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-4'>
        <div className='flex items-center justify-between gap-3'>
          <button
            onClick={onBack}
            className='flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <div className='flex items-center gap-2'>
            <button className='text-sm font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5'>
              💾 Save as Draft
            </button>
            <button
              onClick={onNext}
              className='flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors'
            >
              Next: Set Destination →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
