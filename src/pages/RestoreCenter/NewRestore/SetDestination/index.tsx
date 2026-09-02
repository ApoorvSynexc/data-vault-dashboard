// SetDestination — Step 4 of 8 in the New Restore wizard.
// Lets the user pick where the restored data should land:
// The configuration panel below the type cards adapts to the selection.

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InfoTooltip from '../../../../components/InfoTooltip';
import { useRestoreService } from '../../../../services/restore/restore.service';
import { usePlatformService } from '../../../../services/platform/platform.service';
import type { ConnectedPlatform } from '../../../../services/platform/platform.service';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict & Edge Cases', 'Preview', 'Review'];

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

type DestType = 'same' | 'diff' | 'export';

const DEST_TYPES: { id: DestType; title: string; desc: string }[] = [
  { id: 'same',   title: 'Same Org (Source)', desc: 'Default — disaster recovery to original org' },
  // { id: 'diff',   title: 'Different Org',      desc: 'Cross-org migration, DR drill, or seeding' },
  { id: 'export', title: 'Export Only',        desc: 'CSV / Parquet / JSON — no restore to org' },
];

// ── Tooltip helper ────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
  return <InfoTooltip text={text} className='ml-1' />;
}

// ── Sub-configs ───────────────────────────────────────────────────────────────

function SameOrgConfig({ crmName, crmUsername }: { crmName?: string; crmUsername?: string }) {
  const [tag, setTag] = useState('Restored via DataCraft {job-id}');

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
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

function SalesforceMiniLogo() {
  return (
    <svg viewBox='0 0 64 64' fill='none' className='h-4 w-4'>
      <ellipse cx='24' cy='22' rx='13' ry='13' fill='#00A1E0' />
      <ellipse cx='38' cy='18' rx='11' ry='11' fill='#00A1E0' />
      <ellipse cx='48' cy='24' rx='9' ry='9' fill='#00A1E0' />
      <ellipse cx='14' cy='28' rx='8' ry='8' fill='#00A1E0' />
      <ellipse cx='32' cy='30' rx='16' ry='10' fill='#00A1E0' />
    </svg>
  );
}

function EnvBadge({ env }: { env: string }) {
  const cls =
    env === 'production' ? 'bg-green-100 text-green-700' :
    env === 'sandbox'    ? 'bg-amber-100 text-amber-700' :
                           'bg-blue-100 text-blue-700';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>{env}</span>
  );
}

function CrmDropdown({ destinations, value, onChange, loading }: {
  destinations: import('../../../../services/platform/platform.service').ConnectedPlatform[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = destinations.find((d) => d.crmId === value);
  const username = (d: typeof destinations[0]) => d.crmProfile?.username ?? d.contactEmail ?? d.crmId;

  return (
    <div ref={ref} className='relative'>
      <button
        type='button'
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={loading}
        className='w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-left transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60'
      >
        {loading ? (
          <>
            <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
            <span className='text-gray-400 flex-1'>Loading connections…</span>
          </>
        ) : selected ? (
          <>
            <SalesforceMiniLogo />
            <span className='flex-1 font-medium text-gray-800 truncate'>{username(selected)}</span>
            <EnvBadge env={selected.environment ?? 'production'} />
          </>
        ) : (
          <>
            <SalesforceMiniLogo />
            <span className='flex-1 text-gray-400'>— Select a connection —</span>
          </>
        )}
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </button>

      {open && (
        <div className='absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden'>
          {destinations.length === 0 ? (
            <p className='text-xs text-gray-400 px-4 py-3 text-center'>No CRM connections found.</p>
          ) : (
            destinations.map((d) => {
              const isSelected = d.crmId === value;
              return (
                <button
                  key={d.crmId}
                  type='button'
                  onClick={() => { onChange(d.crmId); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition border-b border-gray-50 last:border-0 ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className='flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center' style={{ background: 'rgba(0,161,224,0.1)' }}>
                    <SalesforceMiniLogo />
                  </div>
                  <span className={`flex-1 font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{username(d)}</span>
                  <EnvBadge env={d.environment ?? 'production'} />
                  {isSelected && (
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#2563EB' strokeWidth='2.5' className='flex-shrink-0'>
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function DifferentOrgConfig({ backupConfigId, configType }: { backupConfigId: string; configType: 'BACKUP' | 'ARCHIVAL' }) {
  const restoreService = useRestoreService();
  const platformService = usePlatformService();
  const [tag, setTag]           = useState('Restored via DataCraft {job-id}');
  const [destOrg, setDestOrg]   = useState('');

  const { data: crmsData, isLoading: destLoading } = useQuery({
    queryKey: ['crm-list'],
    queryFn: () => platformService.getConnectedPlatforms(),
  });
  const destinations: ConnectedPlatform[] = Array.isArray(crmsData) ? crmsData : [];

  const { data: sourceObjectsData, isLoading: sourceObjectsLoading } = useQuery({
    queryKey: ['source-objects', backupConfigId, configType],
    queryFn: () => restoreService.getObjectListByConfigId(backupConfigId, configType),
    enabled: !!backupConfigId,
    retry: 1,
  });

  // API returns the full config object; flatten top-level objects + their children
  const sourceObjects: string[] = (() => {
    const raw = (sourceObjectsData as any)?.data;
    if (!raw) return [];
    const rows: { name: string }[] = (() => {
      if (Array.isArray(raw?.objects)) {
        const result: { name: string }[] = [];
        for (const obj of raw.objects) {
          if (obj?.name) result.push({ name: obj.name });
          for (const child of (obj?.children ?? [])) {
            if (child?.name) result.push({ name: child.name });
          }
        }
        return result;
      }
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw))       return raw;
      return [];
    })();
    return Array.from(new Set(rows.map((o) => o.name)));
  })();

  const { data: crmObjectsData, isLoading: crmObjectsLoading } = useQuery({
    queryKey: ['crm-objects', destOrg],
    queryFn: () => restoreService.getCrmObjects(destOrg),
    enabled: !!destOrg,
    retry: 1,
  });

  // step gate: object mapping is "confirmed" once the user clicks Confirm
  const [objectMappingConfirmed, setObjectMappingConfirmed] = useState(false);

  // field mapping: user picks which mapped object to inspect
  const [selectedFieldObject, setSelectedFieldObject] = useState('');

  interface ApiField { label: string; apiName: string; dataType: string; }
  const crmObjectNames: string[] = ((crmObjectsData as any)?.data ?? []).map((o: any) => o.apiName as string);
  const objectRows = sourceObjects.map((src) => {
    const matched = crmObjectNames.includes(src);
    return { src, dst: matched ? src : '', matched };
  });
  const mappedObjects = objectRows.filter((r) => r.matched).map((r) => r.src);

  const activeFieldObject = selectedFieldObject || mappedObjects[0] || '';

  const { data: sourceFieldsData, isLoading: sourceFieldsLoading } = useQuery({
    queryKey: ['source-fields', backupConfigId, activeFieldObject],
    queryFn: () => restoreService.fetchObjectFields(activeFieldObject, backupConfigId),
    enabled: objectMappingConfirmed && !!activeFieldObject && !!backupConfigId,
    retry: 1,
  });

  const { data: destFieldsData, isLoading: destFieldsLoading } = useQuery({
    queryKey: ['dest-fields', destOrg, activeFieldObject],
    queryFn: () => restoreService.getCrmFields(destOrg, activeFieldObject),
    enabled: objectMappingConfirmed && !!activeFieldObject && !!destOrg,
    retry: 1,
  });

  const sourceFieldList: ApiField[] = Array.isArray((sourceFieldsData as any)?.data) ? (sourceFieldsData as any).data : [];
  const destFieldList: ApiField[]   = Array.isArray((destFieldsData as any)?.data?.fields)   ? (destFieldsData as any).data.fields   : [];
  const destFieldApiNames = new Set(destFieldList.map((f) => f.apiName));

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
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
          <CrmDropdown
            destinations={destinations}
            value={destOrg}
            onChange={setDestOrg}
            loading={destLoading}
          />
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

        {/* Step 2 — Object Mapping (shown only after CRM selected) */}
        {!destOrg ? (
          <div className='rounded-xl border border-dashed border-gray-200 px-5 py-6 text-center'>
            <p className='text-sm text-gray-400'>Select a destination org connection above to configure object mapping.</p>
          </div>
        ) : (
          <div className='rounded-xl' style={{ border: '1px solid #F97316' }}>
            <div className='flex items-center justify-between gap-2 border-b px-5 py-3' style={{ borderColor: '#FED7AA', background: '#FFF7ED' }}>
              <div className='flex items-center gap-2'>
                <span className='text-base'>🔁</span>
                <span className='text-sm font-semibold text-gray-800'>Step 2 — Object Mapping</span>
                <Tip text="When the destination is a different org, the same object might have a different API name. Object mapping runs FIRST — auto-detects matches by API name and lets you map (or skip) unmapped ones." />
              </div>
              {objectMappingConfirmed && (
                <button
                  onClick={() => { setObjectMappingConfirmed(false); setSelectedFieldObject(''); }}
                  className='text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors'
                >
                  Edit mapping
                </button>
              )}
            </div>
            <div className='p-4'>
              {sourceObjectsLoading || crmObjectsLoading ? (
                <div className='flex items-center justify-center py-8 gap-2 text-xs text-gray-400'>
                  <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
                  Loading objects…
                </div>
              ) : sourceObjects.length === 0 ? (
                <p className='text-xs text-gray-400 py-4 text-center'>No objects found in the selected backup jobs.</p>
              ) : objectMappingConfirmed ? (
                <div className='flex items-center gap-2 text-xs text-green-700'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' className='w-4 h-4 flex-shrink-0'><polyline points='20 6 9 17 4 12'/></svg>
                  <span><strong>{mappedObjects.length}</strong> of <strong>{objectRows.length}</strong> objects mapped and confirmed.</span>
                </div>
              ) : (
                <div className='overflow-x-auto space-y-3'>
                  <table className='w-full text-xs'>
                    <thead>
                      <tr className='border-b border-gray-100'>
                        <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Source Object</th>
                        <th className='w-8' />
                        <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Destination Object</th>
                        <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>Status</th>
                        <th className='text-left py-2 px-3 font-semibold text-gray-600 uppercase tracking-wide text-[10px]'>If Unmapped</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectRows.map((row) => (
                        <tr key={row.src} className={`border-b border-gray-50 ${!row.matched ? 'bg-orange-50' : ''}`}>
                          <td className='py-2.5 px-3 font-mono text-gray-700'>{row.src}</td>
                          <td className='text-center text-gray-400 font-bold'>→</td>
                          <td className='py-2.5 px-3'>
                            <select className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none w-full max-w-[180px]'>
                              {row.matched
                                ? <option value={row.dst}>{row.dst}</option>
                                : <option value=''>— Pick destination object —</option>
                              }
                            </select>
                          </td>
                          <td className='py-2.5 px-3'>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              row.matched ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {row.matched ? 'Auto-matched' : '⚠ No auto-match'}
                            </span>
                          </td>
                          <td className='py-2.5 px-3'>
                            {!row.matched ? (
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
                  <div className='flex items-center justify-between'>
                    <p className='text-xs text-gray-400'>
                      {mappedObjects.length} of {objectRows.length} object{objectRows.length !== 1 ? 's' : ''} auto-matched
                      {objectRows.filter((r) => !r.matched).length > 0 && ` · ${objectRows.filter((r) => !r.matched).length} need attention`}
                    </p>
                    <button
                      onClick={() => setObjectMappingConfirmed(true)}
                      className='text-xs font-semibold px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                    >
                      Confirm Object Mapping →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Field Mapping (shown only after object mapping confirmed) */}
        {!objectMappingConfirmed ? (
          <div className='rounded-xl border border-dashed border-gray-200 px-5 py-6 text-center'>
            <p className='text-sm text-gray-400'>Confirm object mapping above to configure field mapping.</p>
          </div>
        ) : (
        <div className='rounded-xl border border-gray-200'>
          <div className='flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3'>
            <div className='flex items-center gap-2'>
              <span className='text-base'>🔣</span>
              <span className='text-sm font-semibold text-gray-800'>Field Mapping</span>
              <Tip text="For each mapped object, line up source fields with destination fields. The system auto-suggests matches by exact API name, label match, and type compatibility." />
            </div>
            <select
              value={activeFieldObject}
              onChange={(e) => setSelectedFieldObject(e.target.value)}
              className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none'
            >
              {sourceObjects.map((obj) => (
                <option key={obj} value={obj}>{obj}</option>
              ))}
            </select>
          </div>
          <div className='p-4 overflow-x-auto'>
            {sourceFieldsLoading || destFieldsLoading ? (
              <div className='flex items-center justify-center py-8 gap-2 text-xs text-gray-400'>
                <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
                Loading fields…
              </div>
            ) : sourceFieldList.length === 0 ? (
              <p className='text-xs text-gray-400 py-4 text-center'>No fields found for <strong>{activeFieldObject}</strong>.</p>
            ) : (
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
                  {sourceFieldList.map((sf) => {
                    const matched = destFieldApiNames.has(sf.apiName);
                    return (
                      <tr key={sf.apiName} className={`border-b border-gray-50 ${!matched ? 'bg-orange-50' : ''}`}>
                        <td className='py-2.5 px-3 font-mono text-gray-700'>{sf.apiName}<span className='ml-1 text-gray-400 font-sans'>({sf.label})</span></td>
                        <td className='text-center text-gray-400 font-bold'>→</td>
                        <td className='py-2.5 px-3'>
                          <select className='h-7 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 outline-none w-full max-w-[220px]'>
                            {matched
                              ? <option value={sf.apiName}>{sf.apiName}</option>
                              : <option value=''>— Skip field —</option>
                            }
                            {destFieldList
                              .filter((df) => df.apiName !== sf.apiName)
                              .map((df) => <option key={df.apiName} value={df.apiName}>{df.apiName} ({df.label})</option>)
                            }
                          </select>
                        </td>
                        <td className='py-2.5 px-3 text-gray-500'>{sf.dataType}</td>
                        <td className='py-2.5 px-3'>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            matched ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {matched ? 'Auto-matched' : '⚠ Not in destination'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        )}

      </div>
    </div>
  );
}


function ExportOnlyConfig() {
  const [splitByObject,      setSplitByObject]      = useState(true);
  const [includeSchemaHeader, setIncludeSchemaHeader] = useState(true);

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
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

interface Props { onNext: (destLabel: string) => void; onBack: () => void; backupConfigId: string; configType: 'BACKUP' | 'ARCHIVAL'; crmName?: string; crmUsername?: string; }

export default function SetDestination({ onNext, onBack, backupConfigId, configType, crmName, crmUsername }: Props) {
  const [destType, setDestType] = useState<DestType>('same');

  return (
    <div className='flex flex-col h-full min-h-0 bg-gray-50'>
      <div className='flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2'>
          <Link to='/restore-center' className='text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors'>
            Restore Center
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Restore</span>
        </div>

        {/* Step header + progress */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
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

        <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
            <span className='text-sm font-semibold text-gray-800'>Destination Type</span>
            <Tip text="Pick where the restored data goes. The configuration changes based on your selection." />
          </div>
          <div className='p-4 grid grid-cols-1 sm:grid-cols-2 gap-3'>
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
        {destType === 'same'   && <SameOrgConfig crmName={crmName} crmUsername={crmUsername} />}
        {destType === 'diff'   && <DifferentOrgConfig backupConfigId={backupConfigId} configType={configType} />}
        {destType === 'export' && <ExportOnlyConfig />}

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
            onClick={() => {
              const label = [crmName, crmUsername ? `(${crmUsername})` : ''].filter(Boolean).join(' ') || '—';
              onNext(label);
            }}
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
