// ConflictConfig — Step 6 of 8 in the New Restore wizard.
// Phase 1: Restore Mode  |  Phase 2: Edge Case Handling + Field Defaults

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InfoTooltip from '../../../../components/InfoTooltip';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { RestoreEdgeCases, MissingSourceField, ObjectRecordTypeMapping, DestinationRecordType, RequiredField } from '../../../../services/restore/restore.service';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict & Edge Cases', 'Preview', 'Review'];

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
  return <InfoTooltip text={text} className='ml-1' />;
}

// ── Conflict types ────────────────────────────────────────────────────────────

type RestoreMode = 'overwrite' | 'append' | 'merge' | 'skip';

const RESTORE_MODES: { id: RestoreMode; title: string; desc: string; tip: string; recommended?: boolean }[] = [
  { id: 'overwrite', title: 'Overwrite Existing',    desc: 'Source record replaces destination — every field overwritten', recommended: true, tip: 'When a record exists in both source and destination (matched by Id / external Id), the destination record is fully replaced by the source record — every field overwritten. Standard disaster-recovery behaviour.' },
  { id: 'append',    title: 'Append as New Records', desc: 'Always insert — creates duplicates if record already exists',  tip: 'Source records are ALWAYS inserted as new records, even when a matching Id exists. This creates side-by-side duplicates. Useful only for niche cases like keeping a historical frozen copy.' },
];

const RESTORE_MODES_FULL: { id: RestoreMode; title: string; desc: string; tip: string }[] = [
  { id: 'skip',  title: 'Skip if Exists',         desc: 'Do not touch records already in destination',                              tip: 'If a matching Id exists in the destination, leave it alone. Only restore records that are missing in the destination. Standard for filling gaps after a partial delete.' },
  { id: 'merge', title: 'Merge (per-field rule)', desc: 'Configurable per-field winner — best for partial / safety-first recovery', tip: 'When records exist in both, merge them field by field using the rule below (Source wins / Destination wins / Newest LastModifiedDate / Per-field override). Use this when you want some fields rolled back but newer destination work preserved.' },
];

const RESTORE_MODE_ENUM: Record<RestoreMode, string> = {
  overwrite: 'OVERWRITE',
  append:    'APPEND_NEW',
  merge:     'MERGE',
  skip:      'SKIP',
};

const FIELD_MERGE_RULE_ENUM: Record<string, string> = {
  'Use default':             'USE_DEFAULT',
  'Source always wins':      'SOURCE_ALWAYS_WINS',
  'Destination always wins': 'DESTINATION_ALWAYS_WINS',
};

const DEFAULT_MERGE_RULE_ENUM: Record<string, string> = {
  'Newest LastModifiedDate wins': 'NEWEST_LAST_MODIFIED_DATE_WINS',
  'Source always wins':           'SOURCE_ALWAYS_WINS',
  'Destination always wins':      'DESTINATION_ALWAYS_WINS',
};

// ── Edge case sub-components ──────────────────────────────────────────────────

type FieldMapRow = { id: number; objectName: string; committedObjectName: string; destFieldBySource: Record<string, string> };
interface DestField { name: string; label: string; type: string; }

function InlineErrorState({ message }: { message: string }) {
  return (
    <div className='flex items-center gap-2 py-2'>
      <div className='w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0'>
        <svg viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='2.5' className='w-3 h-3'><line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' /></svg>
      </div>
      <p className='text-xs text-red-600'>{message}</p>
    </div>
  );
}

function MissingFieldsForObject({
  backupConfigId, crmId, objectName, destFieldBySource, onDestFieldChange, onMissingFieldsLoaded,
}: {
  backupConfigId: string; crmId?: string; objectName: string;
  destFieldBySource: Record<string, string>;
  onDestFieldChange: (sourceApiName: string, destApiName: string) => void;
  onMissingFieldsLoaded: (objectName: string, fields: MissingSourceField[]) => void;
}) {
  const restoreService = useRestoreService();
  const { data: missingData, isLoading: missingLoading, isError: missingError } = useQuery({
    queryKey: ['missing-fields', backupConfigId, objectName],
    queryFn: () => restoreService.fetchMissingFields(backupConfigId, objectName),
    enabled: !!backupConfigId && !!objectName, retry: 1,
  });
  const missingFields: MissingSourceField[] = missingData?.data?.missingFields ?? [];
  useEffect(() => {
    if (missingData?.data) onMissingFieldsLoaded(objectName, missingData.data.missingFields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectName, missingData]);
  const { data: destFieldsData } = useQuery({
    queryKey: ['dest-fields-for-mapping', crmId, objectName],
    queryFn: () => restoreService.getCrmFields(crmId ?? '', objectName, true),
    enabled: !!objectName && missingFields.length > 0, retry: 1,
  });
  const destFieldList: DestField[] = Array.isArray((destFieldsData as any)?.data) ? (destFieldsData as any).data : [];
  if (missingLoading) return <div className='flex items-center gap-2 text-xs text-gray-400 py-2'><div className='w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' /> Checking for missing fields…</div>;
  if (missingError) return <InlineErrorState message={`Couldn't check ${objectName} for missing fields — try again.`} />;
  if (missingFields.length === 0) return (
    <div className='flex items-center gap-2 py-2'>
      <div className='w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0'><svg viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='3' className='w-3 h-3'><polyline points='20 6 9 17 4 12' /></svg></div>
      <p className='text-xs text-gray-600'>No missing fields for <strong className='font-mono'>{objectName}</strong> — nothing to map.</p>
    </div>
  );
  return (
    <div className='flex flex-col gap-2'>
      <div className='grid grid-cols-[1fr_1fr] gap-2'>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Source Field</span>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Destination Field</span>
      </div>
      {missingFields.map((field) => (
        <div key={field.apiName} className='grid grid-cols-[1fr_1fr] gap-2 items-center'>
          <input value={field.apiName} disabled readOnly className='h-9 px-3 rounded-lg text-xs outline-none bg-gray-50 text-gray-500 font-mono cursor-not-allowed' style={{ border: '1px solid #E2E8F0' }} />
          <select value={destFieldBySource[field.apiName] ?? ''} onChange={(e) => onDestFieldChange(field.apiName, e.target.value)} className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
            <option value=''>Select a field…</option>
            {destFieldList.map((df) => <option key={df.name} value={df.name}>{df.name} ({df.label})</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function RecordTypeMappingForObject({ crmId, objectApiName, recordTypes, mappingBySource, onMappingChange }: {
  crmId?: string; objectApiName: string; recordTypes: ObjectRecordTypeMapping['recordTypes'];
  mappingBySource: Record<string, string>;
  onMappingChange: (sourceRecordTypeId: string, destinationRecordTypeId: string) => void;
}) {
  const restoreService = useRestoreService();
  const { data: destData } = useQuery({
    queryKey: ['dest-record-types', crmId, objectApiName],
    queryFn: () => restoreService.getCrmRecordTypes(crmId ?? '', objectApiName, true), retry: 1,
  });
  const destRecordTypes: DestinationRecordType[] = Array.isArray(destData?.data) ? destData.data : [];
  return (
    <div className='rounded-lg p-3 flex flex-col gap-2' style={{ border: '1px solid #E2E8F0' }}>
      <p className='text-xs font-bold text-gray-800 font-mono'>{objectApiName}</p>
      <div className='grid grid-cols-[1fr_1fr] gap-2'>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Source Record Type</span>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Destination Record Type</span>
      </div>
      {recordTypes.map((rt) => (
        <div key={rt.sourceRecordTypeId} className='grid grid-cols-[1fr_1fr] gap-2 items-center'>
          <div className='h-9 px-3 rounded-lg text-xs bg-gray-50 text-gray-600 flex items-center gap-1.5' style={{ border: '1px solid #E2E8F0' }}>
            <span className='truncate'>{rt.sourceRecordTypeName}</span>
            <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rt.status === 'MISSING' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{rt.status === 'MISSING' ? 'Missing' : 'Inactive'}</span>
          </div>
          <select value={mappingBySource[rt.sourceRecordTypeId] ?? ''} onChange={(e) => onMappingChange(rt.sourceRecordTypeId, e.target.value)} className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
            <option value=''>Select a record type…</option>
            {destRecordTypes.map((d) => <option key={d.recordTypeId} value={d.recordTypeId}>{d.name}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function RecordTypeMappingBlock({ backupConfigId, configType, crmId, objectApiNames, sourceStartDate, sourceEndDate, mappingByObject, onMappingChange }: {
  backupConfigId: string; configType: 'BACKUP' | 'ARCHIVAL'; crmId?: string; objectApiNames?: string[];
  sourceStartDate?: string; sourceEndDate?: string;
  mappingByObject: Record<string, Record<string, string>>;
  onMappingChange: (objectApiName: string, sourceRecordTypeId: string, destinationRecordTypeId: string) => void;
}) {
  const restoreService = useRestoreService();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['missing-record-types', backupConfigId, configType, objectApiNames?.join(',') ?? 'ALL', sourceStartDate, sourceEndDate],
    queryFn: () => restoreService.fetchMissingRecordTypes(backupConfigId, configType, objectApiNames, sourceStartDate, sourceEndDate),
    enabled: !!backupConfigId, retry: 1,
  });
  const objectMappings: ObjectRecordTypeMapping[] = data?.data ?? [];
  if (isLoading) return <div className='flex items-center gap-2 text-xs text-gray-400 py-2'><div className='w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' /> Checking for missing or inactive record types…</div>;
  if (isError) return <InlineErrorState message="Couldn't check for missing or inactive record types — try again." />;
  if (objectMappings.length === 0) return (
    <div className='flex items-center gap-2 py-2'>
      <div className='w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0'><svg viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='3' className='w-3 h-3'><polyline points='20 6 9 17 4 12' /></svg></div>
      <p className='text-xs text-gray-600'>No missing or inactive record types found — nothing to map.</p>
    </div>
  );
  return (
    <div className='flex flex-col gap-3'>
      {objectMappings.map((om) => (
        <RecordTypeMappingForObject key={om.objectApiName} crmId={crmId} objectApiName={om.objectApiName} recordTypes={om.recordTypes} mappingBySource={mappingByObject[om.objectApiName] ?? {}} onMappingChange={(sourceId, destId) => onMappingChange(om.objectApiName, sourceId, destId)} />
      ))}
    </div>
  );
}

const inputTypeForDataType = (dataType: string): string => {
  switch (dataType) {
    case 'date': return 'date';
    case 'datetime': return 'datetime-local';
    case 'int': case 'double': case 'currency': case 'percent': return 'number';
    case 'email': return 'email';
    case 'phone': return 'tel';
    case 'url': return 'url';
    default: return 'text';
  }
};

function RequiredFieldsForObject({ backupConfigId, objectApiName, values, onValueChange, onFieldsLoaded }: {
  backupConfigId: string; objectApiName: string; values: Record<string, string>;
  onValueChange: (fieldApiName: string, value: string) => void;
  onFieldsLoaded: (objectApiName: string, fields: RequiredField[]) => void;
}) {
  const restoreService = useRestoreService();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['required-fields', backupConfigId, objectApiName],
    queryFn: () => restoreService.fetchRequiredFields(backupConfigId, objectApiName),
    enabled: !!backupConfigId && !!objectApiName, retry: 1,
  });
  const fields = data?.data ?? [];
  useEffect(() => {
    if (data?.data) onFieldsLoaded(objectApiName, data.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectApiName, data]);
  if (isLoading) return <div className='flex items-center gap-2 text-xs text-gray-400 py-2'><div className='w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' /> Checking required fields…</div>;
  if (isError) return <InlineErrorState message={`Couldn't check ${objectApiName} for required fields — try again.`} />;
  if (fields.length === 0) return (
    <div className='flex items-center gap-2 py-2'>
      <div className='w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0'><svg viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='3' className='w-3 h-3'><polyline points='20 6 9 17 4 12' /></svg></div>
      <p className='text-xs text-gray-600'>No required fields detected for <strong className='font-mono'>{objectApiName}</strong> — nothing to configure.</p>
    </div>
  );
  return (
    <div className='flex flex-col gap-2'>
      <div className='grid grid-cols-[1.4fr_0.8fr_1fr] gap-2'>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Field</span>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Data Type</span>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Default Value</span>
      </div>
      {fields.map((f) => (
        <div key={f.fieldApiName} className='grid grid-cols-[1.4fr_0.8fr_1fr] gap-2 items-center'>
          <div><p className='text-xs font-semibold text-gray-800'>{f.fieldLabel}</p><p className='text-[10px] text-gray-400 font-mono'>{f.fieldApiName}</p></div>
          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 w-fit'>{f.dataType}</span>
          {f.dataType === 'picklist' ? (
            <select value={values[f.fieldApiName] ?? ''} onChange={(e) => onValueChange(f.fieldApiName, e.target.value)} className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
              <option value=''>Select a value…</option>
              {(f.picklistValues ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : f.dataType === 'boolean' ? (
            <input type='checkbox' checked={values[f.fieldApiName] === 'true'} onChange={(e) => onValueChange(f.fieldApiName, e.target.checked ? 'true' : 'false')} className='w-4 h-4 accent-blue-600' />
          ) : (
            <input type={inputTypeForDataType(f.dataType)} value={values[f.fieldApiName] ?? ''} onChange={(e) => onValueChange(f.fieldApiName, e.target.value)} placeholder='Default value' className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function RequiredFieldDefaultBlock({ backupConfigId, objectApiName, objectOptions, onObjectChange, onRemove, canRemove, values, onValueChange, onFieldsLoaded }: {
  backupConfigId: string; objectApiName: string; objectOptions: string[];
  onObjectChange: (objectApiName: string) => void; onRemove: () => void; canRemove: boolean;
  values: Record<string, string>;
  onValueChange: (fieldApiName: string, value: string) => void;
  onFieldsLoaded: (objectApiName: string, fields: RequiredField[]) => void;
}) {
  return (
    <div className='rounded-lg p-3 flex flex-col gap-2' style={{ border: '1px solid #E2E8F0' }}>
      <div className='flex items-center gap-2'>
        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide flex-shrink-0'>Object</span>
        <select value={objectApiName} onChange={(e) => onObjectChange(e.target.value)} className='h-9 flex-1 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white font-mono' style={{ border: '1px solid #E2E8F0', color: '#33363F' }}>
          <option value=''>Select an object…</option>
          {objectOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        {canRemove && (
          <button onClick={onRemove} className='text-gray-400 hover:text-red-500 transition-colors flex-shrink-0'>
            <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
          </button>
        )}
      </div>
      {objectApiName && (
        <RequiredFieldsForObject backupConfigId={backupConfigId} objectApiName={objectApiName} values={values} onValueChange={onValueChange} onFieldsLoaded={onFieldsLoaded} />
      )}
    </div>
  );
}

// ── Exported types ────────────────────────────────────────────────────────────

export interface ConflictOutput {
  restoreMode: string;
  mergeRule?: { default: string; objects: { name: string; fields: { name: string; value: string }[] }[] };
  edgeCases: RestoreEdgeCases;
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onNext: (output: ConflictOutput) => void;
  onBack: () => void;
  scopeMode: string;
  configType?: 'BACKUP' | 'ARCHIVAL';
  sourceRestoreType?: string;
  backupConfigId: string;
  destinationCrmId?: string;
  scopeObjectApiNames?: string[];
  sourceStartDate?: string;
  sourceEndDate?: string;
}

export default function ConflictConfig({
  onNext, onBack, scopeMode, configType, sourceRestoreType,
  backupConfigId, destinationCrmId, scopeObjectApiNames, sourceStartDate, sourceEndDate,
}: Props) {
  const hideRestoreMode = configType === 'ARCHIVAL' || sourceRestoreType === 'ENTIRE';

  // phase: 'conflict' is skipped automatically when hideRestoreMode
  const [phase, setPhase] = useState<'conflict' | 'edgecases'>(hideRestoreMode ? 'edgecases' : 'conflict');
  useEffect(() => { setPhase(hideRestoreMode ? 'edgecases' : 'conflict'); }, [hideRestoreMode]);

  // ── Phase 1 state ─────────────────────────────────────────────────────────
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('overwrite');
  const [mergeDefault, setMergeDefault] = useState('');
  type MergeRow = { id: number; objectName: string; fieldName: string; rule: string };
  const [mergeRows, setMergeRows] = useState<MergeRow[]>([]);
  const addMergeRow = () => setMergeRows((p) => [...p, { id: Date.now(), objectName: '', fieldName: '', rule: 'Use default' }]);
  const removeMergeRow = (id: number) => setMergeRows((p) => p.filter((r) => r.id !== id));
  const updateMergeRow = (id: number, patch: Partial<MergeRow>) => setMergeRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));
  const DEFAULT_MERGE_OPTIONS = ['Newest LastModifiedDate wins', 'Source always wins', 'Destination always wins'];
  const FIELD_MERGE_OPTIONS   = ['Use default', 'Source always wins', 'Destination always wins'];

  // ── Phase 2 state ─────────────────────────────────────────────────────────
  const [ecMissingField, setEcMissingField] = useState('Skip the field');
  const [ecOwner,        setEcOwner]        = useState('Skip record');
  const [ecParent,       setEcParent]       = useState('Restore parent first');
  const [ecRecordType,   setEcRecordType]   = useState('Skip');
  const [ecMissRequired, setEcMissRequired] = useState('Skip the record');
  const [fallbackOwner,  setFallbackOwner]  = useState('');

  const [fieldMapRows, setFieldMapRows] = useState<FieldMapRow[]>([{ id: 1, objectName: '', committedObjectName: '', destFieldBySource: {} }]);
  const addFieldMapRow = () => setFieldMapRows((p) => [...p, { id: Date.now(), objectName: '', committedObjectName: '', destFieldBySource: {} }]);
  const removeFieldMapRow = (id: number) => setFieldMapRows((p) => p.filter((r) => r.id !== id));
  const updateFieldMapRow = (id: number, patch: Partial<FieldMapRow>) => setFieldMapRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));
  const commitFieldMapObjectName = (id: number, objectName: string) =>
    setFieldMapRows((p) => p.map((r) => r.id === id ? { ...r, committedObjectName: objectName.trim(), destFieldBySource: r.committedObjectName === objectName.trim() ? r.destFieldBySource : {} } : r));
  const setFieldMapDestField = (id: number, sourceApiName: string, destApiName: string) =>
    setFieldMapRows((p) => p.map((r) => r.id === id ? { ...r, destFieldBySource: { ...r.destFieldBySource, [sourceApiName]: destApiName } } : r));

  const [missingFieldsByObject, setMissingFieldsByObject] = useState<Record<string, MissingSourceField[]>>({});
  const onMissingFieldsLoaded = (objectName: string, fields: MissingSourceField[]) => setMissingFieldsByObject((prev) => ({ ...prev, [objectName]: fields }));

  const [rtMappingByObject, setRtMappingByObject] = useState<Record<string, Record<string, string>>>({});
  const updateRtMapping = (objectApiName: string, sourceRecordTypeId: string, destinationRecordTypeId: string) =>
    setRtMappingByObject((prev) => ({ ...prev, [objectApiName]: { ...(prev[objectApiName] ?? {}), [sourceRecordTypeId]: destinationRecordTypeId } }));

  const fieldDefaultsRef = useRef<HTMLDivElement>(null);

  const restoreService = useRestoreService();
  const { data: objectListData } = useQuery({
    queryKey: ['object-list', backupConfigId, configType],
    queryFn: () => restoreService.getObjectListByConfigId(backupConfigId, configType!),
    enabled: !scopeObjectApiNames?.length && !!backupConfigId && (ecMissRequired === 'Use specified default per field' || ecMissingField === 'Map to existing field'),
    retry: 1,
  });
  const reqFieldObjectOptions: string[] = (() => {
    if (scopeObjectApiNames?.length) return scopeObjectApiNames;
    const raw = (objectListData as any)?.data;
    if (!raw) return [];
    if (Array.isArray(raw?.objects)) {
      const names: string[] = [];
      for (const obj of raw.objects) {
        if (obj?.name) names.push(obj.name);
        for (const child of (obj?.children ?? [])) {
          if (child?.name) names.push(child.name);
        }
      }
      return Array.from(new Set(names));
    }
    const list: { name: string }[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    return Array.from(new Set(list.map((o) => o.name)));
  })();

  type ReqFieldBlock = { id: number; objectApiName: string };
  const [reqFieldBlocks, setReqFieldBlocks] = useState<ReqFieldBlock[]>([{ id: 1, objectApiName: '' }]);
  const addReqFieldBlock = () => setReqFieldBlocks((p) => [...p, { id: Date.now(), objectApiName: '' }]);
  const removeReqFieldBlock = (id: number) => setReqFieldBlocks((p) => p.filter((r) => r.id !== id));
  const updateReqFieldBlockObject = (id: number, objectApiName: string) => setReqFieldBlocks((p) => p.map((r) => r.id === id ? { ...r, objectApiName } : r));

  const [reqFieldValuesByObject, setReqFieldValuesByObject] = useState<Record<string, Record<string, string>>>({});
  const updateReqFieldValue = (objectApiName: string, fieldApiName: string, value: string) =>
    setReqFieldValuesByObject((prev) => ({ ...prev, [objectApiName]: { ...(prev[objectApiName] ?? {}), [fieldApiName]: value } }));

  const [requiredFieldsByObject, setRequiredFieldsByObject] = useState<Record<string, RequiredField[]>>({});
  const onRequiredFieldsLoaded = (objectApiName: string, fields: RequiredField[]) => setRequiredFieldsByObject((prev) => ({ ...prev, [objectApiName]: fields }));

  const selectClass = 'h-9 w-full px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white';
  const selectStyle = { border: '1px solid #E2E8F0', color: '#33363F' };

  // ── Submit helpers ────────────────────────────────────────────────────────

  function buildConflict() {
    if (hideRestoreMode) return { restoreMode: 'OVERWRITE' };
    const output: { restoreMode: string; mergeRule?: ConflictOutput['mergeRule'] } = { restoreMode: RESTORE_MODE_ENUM[restoreMode] };
    if (restoreMode === 'merge') {
      const objectMap: Record<string, { name: string; value: string }[]> = {};
      mergeRows.filter((r) => r.objectName && r.fieldName).forEach((r) => {
        if (!objectMap[r.objectName]) objectMap[r.objectName] = [];
        objectMap[r.objectName].push({ name: r.fieldName, value: FIELD_MERGE_RULE_ENUM[r.rule] ?? 'USE_DEFAULT' });
      });
      output.mergeRule = { default: DEFAULT_MERGE_RULE_ENUM[mergeDefault] ?? 'NEWEST_LAST_MODIFIED_DATE_WINS', objects: Object.entries(objectMap).map(([name, fields]) => ({ name, fields })) };
    }
    return output;
  }

  function buildEdgeCases(): RestoreEdgeCases {
    const MISSING_FIELD_ENUM: Record<string, string> = { 'Skip the field': 'SKIP_THE_FIELD', 'Map to existing field': 'MAP_TO_EXISTING_FIELD', 'Fail the record': 'FAIL_THE_RECORD' };
    const OWNER_INACTIVE_ENUM: Record<string, string> = { 'Reassign to specified user': 'REASSIGN_TO_SPECIFIED_USER', 'Reassign to manager': 'REASSIGN_TO_MANAGER', 'Skip record': 'SKIP_RECORD' };
    const RECORD_TYPE_ENUM: Record<string, string> = { 'Map to default': 'MAP_TO_DEFAULT', 'Map manually': 'MAP_MANUALLY', 'Skip': 'SKIP' };
    const MISS_REQUIRED_ENUM: Record<string, string> = { 'Use specified default per field': 'USE_SPECIFIED_DEFAULT_PER_FIELD', 'Use last known value from history': 'USE_LAST_KNOWN_VALUE_FROM_HISTORY', 'Skip the record': 'SKIP_THE_RECORD', 'Skip the object': 'SKIP_THE_OBJECT' };

    const edgeCases: RestoreEdgeCases = {};
    edgeCases.missingFieldInDestination = {
      type: MISSING_FIELD_ENUM[ecMissingField] ?? 'SKIP_THE_FIELD',
      ...(ecMissingField === 'Map to existing field' ? {
        sourceDestinationMapping: fieldMapRows.flatMap((r) => {
          const missing = missingFieldsByObject[r.committedObjectName] ?? [];
          return missing.filter((f) => r.destFieldBySource[f.apiName]).map((f) => ({ sourceObject: r.committedObjectName, sourceFields: f.apiName, destinationObject: r.committedObjectName, destinationFields: r.destFieldBySource[f.apiName] }));
        }),
      } : {}),
    };
    edgeCases.ownerInactive = { type: OWNER_INACTIVE_ENUM[ecOwner] ?? 'SKIP_RECORD', ...(ecOwner === 'Reassign to specified user' ? { fallbackValue: fallbackOwner } : {}) };
    if (configType !== 'ARCHIVAL') edgeCases.parentMissing = { 'Restore parent first': 'RESTORE_PARENT_FIRST', 'Skip': 'SKIP' }[ecParent] ?? 'SKIP';
    edgeCases.recordTypeMissing = {
      type: RECORD_TYPE_ENUM[ecRecordType] ?? 'MAP_TO_DEFAULT',
      ...(ecRecordType === 'Map manually' ? {
        objects: Object.entries(rtMappingByObject).map(([name, bySource]) => ({ name, mapping: Object.entries(bySource).filter(([, d]) => d).map(([s, d]) => ({ sourceRecordTypeId: s, destinationRecordTypeId: d })) })).filter((o) => o.mapping.length > 0),
      } : {}),
    };
    edgeCases.missingRequiredFieldValue = {
      type: MISS_REQUIRED_ENUM[ecMissRequired] ?? 'SKIP_THE_RECORD',
      ...(ecMissRequired === 'Use specified default per field' ? {
        mapping: reqFieldBlocks.map((b) => b.objectApiName).filter((name, i, arr) => name && arr.indexOf(name) === i).map((objectApiName) => {
          const fieldsForObject = requiredFieldsByObject[objectApiName] ?? [];
          const values = reqFieldValuesByObject[objectApiName] ?? {};
          return { object: objectApiName, fields: fieldsForObject.filter((f) => values[f.fieldApiName]).map((f) => ({ name: f.fieldApiName, type: f.dataType.toUpperCase(), value: values[f.fieldApiName] })) };
        }).filter((o) => o.fields.length > 0),
      } : {}),
    };
    return edgeCases;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isConflictPhase = phase === 'conflict';

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/restore-center' className='text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors'>Restore Center</Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6' /></svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Restore</span>
        </div>

        {/* Step header + progress */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 6 of 8</p>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>
                {isConflictPhase
                  ? <><span>Conflict Configuration</span><Tip text='Decide how to handle records that already exist in the destination. Recommended defaults are pre-selected.' /></>
                  : <><span>Edge Case Handling</span><Tip text='Define how the restore job should behave when it encounters problematic scenarios — duplicates, missing fields, inactive owners, orphaned records, and mandatory field gaps.' /></>
                }
              </h1>
              <p className='text-gray-500 mt-1 text-sm'>
                {isConflictPhase
                  ? 'Define merge behaviour for conflicting records.'
                  : 'Configure fallback behaviour for edge cases and set default values for mandatory fields.'}
              </p>
            </div>
            <span className='flex-shrink-0 text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap'>
              Step <span className='text-blue-600'>6</span> of 8
            </span>
          </div>
          <div className='mt-4'>
            <ProgressBar active={6} />
          </div>
        </div>

        {/* ── Phase 1: Conflict / Restore Mode ── */}
        {isConflictPhase && (
          <div className='flex flex-col gap-4'>
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
              <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3'>
                <span className='text-sm font-semibold text-gray-800'>Restore Mode (per job)</span>
                <Tip text='How to handle a source record when a record with the same Id already exists in the destination.' />
              </div>
              <div className='p-4 flex flex-col gap-2'>
                {[...RESTORE_MODES, ...RESTORE_MODES_FULL].filter((m) => {
                  if (scopeMode === 'field' && m.id === 'append') return false;
                  if (scopeMode === 'deleted' && (m.id === 'skip' || m.id === 'merge')) return false;
                  return true;
                }).map((m) => {
                  const active = restoreMode === m.id;
                  return (
                    <button key={m.id} onClick={() => setRestoreMode(m.id)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className='flex items-center gap-2'>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${active ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                          {active && <span className='w-1.5 h-1.5 rounded-full bg-white inline-block' />}
                        </div>
                        <span className={`text-sm font-semibold ${active ? 'text-blue-600' : 'text-gray-800'}`}>{m.title}</span>
                        <Tip text={m.tip} />
                        {(m as any).recommended && <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700'>Recommended</span>}
                      </div>
                      <p className='mt-0.5 text-xs text-gray-500 pl-6'>{m.desc}</p>
                    </button>
                  );
                })}

                {restoreMode === 'merge' && (
                  <div className='mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3'>
                    <p className='text-xs font-semibold text-blue-800'>⚖ Per-field merge rules <Tip text='When a record exists in both source and destination, decide which side wins for each field.' /></p>
                    <div className='grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center'>
                      <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Object</span>
                      <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Field</span>
                      <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Rule</span>
                      <span />
                    </div>
                    <div className='grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center'>
                      <span className='text-xs font-semibold text-gray-700 col-span-2'>Default for all fields</span>
                      <select value={mergeDefault} onChange={(e) => setMergeDefault(e.target.value)} className={selectClass} style={selectStyle}>
                        <option value='' disabled>Select a rule</option>
                        {DEFAULT_MERGE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                      </select>
                      <span className='w-6' />
                    </div>
                    {mergeDefault === 'Newest LastModifiedDate wins' && (
                      <>
                        {mergeRows.map((row) => (
                          <div key={row.id} className='grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center'>
                            <input value={row.objectName} onChange={(e) => updateMergeRow(row.id, { objectName: e.target.value })} placeholder='Object API name' className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }} />
                            <input value={row.fieldName} onChange={(e) => updateMergeRow(row.id, { fieldName: e.target.value })} placeholder='Field API name' className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white' style={{ border: '1px solid #E2E8F0', color: '#33363F' }} />
                            <select value={row.rule} onChange={(e) => updateMergeRow(row.id, { rule: e.target.value })} className={selectClass} style={selectStyle}>
                              {FIELD_MERGE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                            </select>
                            <button onClick={() => removeMergeRow(row.id)} className='w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:text-white hover:bg-red-500 transition-colors text-[11px] font-bold flex-shrink-0'>×</button>
                          </div>
                        ))}
                        <button onClick={addMergeRow} className='text-xs font-semibold text-blue-600 hover:underline self-start'>+ Add per-field override</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Phase 2: Edge Cases ── */}
        {!isConflictPhase && (
          <div className='flex flex-col gap-4'>
            <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
              <div className='flex items-center gap-2 border-b border-gray-100 px-5 py-3 rounded-t-xl'>
                <span className='text-sm font-semibold text-gray-800'>Edge Case Handling</span>
                <Tip text="What to do when something doesn't line up cleanly — duplicate Id, missing field in destination, owner no longer active, parent record missing, or record type missing." />
              </div>
              <div className='p-4 flex flex-col divide-y divide-gray-100'>
                <div className='py-3 flex flex-col gap-2'>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>Missing fields in dest <Tip text='Triggered when the source has fields the destination does not have.' /></span>
                    <select value={ecMissingField} onChange={(e) => setEcMissingField(e.target.value)} className={selectClass} style={selectStyle}>
                      <option>Skip the field</option><option>Map to existing field</option><option>Fail the record</option>
                    </select>
                  </div>
                  {ecMissingField === 'Map to existing field' && (
                    <div className='ml-0 sm:ml-48 flex flex-col gap-3'>
                      {fieldMapRows.map((row) => (
                        <div key={row.id} className='rounded-lg p-3 flex flex-col gap-2' style={{ border: '1px solid #E2E8F0' }}>
                          <div className='flex items-center gap-2'>
                            <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wide flex-shrink-0'>Object</span>
                            <select
                              value={row.objectName}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateFieldMapRow(row.id, { objectName: val });
                                commitFieldMapObjectName(row.id, val);
                              }}
                              className='h-9 flex-1 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30 bg-white font-mono'
                              style={{ border: '1px solid #E2E8F0', color: row.objectName ? '#33363F' : '#9CA3AF' }}
                            >
                              <option value=''>Select object…</option>
                              {reqFieldObjectOptions.map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                            {fieldMapRows.length > 1 && <button onClick={() => removeFieldMapRow(row.id)} className='text-gray-400 hover:text-red-500 transition-colors flex-shrink-0'><svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>}
                          </div>
                          {row.committedObjectName && <MissingFieldsForObject backupConfigId={backupConfigId} crmId={destinationCrmId} objectName={row.committedObjectName} destFieldBySource={row.destFieldBySource} onDestFieldChange={(src, dest) => setFieldMapDestField(row.id, src, dest)} onMissingFieldsLoaded={onMissingFieldsLoaded} />}
                        </div>
                      ))}
                      <button onClick={addFieldMapRow} className='self-start text-xs text-blue-600 hover:underline font-medium'>+ Add object</button>
                    </div>
                  )}
                </div>
                <div className='py-3 flex flex-col gap-2'>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>Owner inactive/deleted <Tip text='Triggered when the original record owner no longer exists or is deactivated.' /></span>
                    <select value={ecOwner} onChange={(e) => setEcOwner(e.target.value)} className={selectClass} style={selectStyle}>
                      <option>Skip record</option>
                      <option>Reassign to specified user</option>
                      <option>Reassign to manager</option>
                    </select>
                  </div>
                  {ecOwner === 'Reassign to specified user' && (
                    <div className='ml-0 sm:ml-48 flex flex-col gap-1'>
                      <span className='text-xs text-gray-500'>Fallback owner ID</span>
                      <input value={fallbackOwner} onChange={(e) => setFallbackOwner(e.target.value)} placeholder='e.g. 005XXXXXXXXXXXXXXX' className='h-9 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/30' style={{ border: '1px solid #E2E8F0', color: '#33363F' }} />
                    </div>
                  )}
                </div>
                {configType !== 'ARCHIVAL' && (
                  <div className='py-3 flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>Parent missing (orphan) <Tip text="Triggered when the record's parent reference points to a missing/deleted parent." /></span>
                    <select value={ecParent} onChange={(e) => setEcParent(e.target.value)} className={selectClass} style={selectStyle}>
                      <option>Restore parent first</option><option>Skip</option>
                    </select>
                  </div>
                )}
                <div className='py-3 flex flex-col gap-2'>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>Record type missing <Tip text="Triggered when the source record uses a RecordType that doesn't exist in the destination." /></span>
                    <select value={ecRecordType} onChange={(e) => setEcRecordType(e.target.value)} className={selectClass} style={selectStyle}>
                      <option>Map to default</option><option>Map manually</option><option>Skip</option>
                    </select>
                  </div>
                  {ecRecordType === 'Map manually' && (
                    <div className='ml-0 sm:ml-48'>
                      <RecordTypeMappingBlock backupConfigId={backupConfigId} configType={configType ?? 'BACKUP'} crmId={destinationCrmId} objectApiNames={scopeObjectApiNames} sourceStartDate={sourceStartDate} sourceEndDate={sourceEndDate} mappingByObject={rtMappingByObject} onMappingChange={updateRtMapping} />
                    </div>
                  )}
                </div>
                <div className='py-3 flex flex-col gap-2'>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <span className='text-xs font-medium text-gray-700 sm:w-44 flex-shrink-0'>Missing required field value <Tip text='Triggered when the destination has a mandatory field and the source record value is blank or missing.' /></span>
                    <select value={ecMissRequired} onChange={(e) => setEcMissRequired(e.target.value)} className={selectClass} style={selectStyle}>
                      <option>Use specified default per field</option><option>Use last known value from history</option><option>Skip the record</option><option>Skip the object</option>
                    </select>
                  </div>
                  {ecMissRequired === 'Use specified default per field' && (
                    <div className='ml-0 sm:ml-48'>
                      <button onClick={() => fieldDefaultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className='text-xs text-blue-600 hover:underline font-medium'>Configure defaults ↓</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {ecMissRequired === 'Use specified default per field' && (
              <div ref={fieldDefaultsRef} className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
                <div className='flex items-center gap-1.5 border-b border-gray-100 px-5 py-3'>
                  <span className='text-base'>🏷</span>
                  <span className='text-sm font-semibold text-gray-800'>Field Defaults</span>
                  <Tip text='For each required field on an object, define a fallback value to use when the source record does not have one.' />
                </div>
                <div className='p-4 flex flex-col gap-3'>
                  {reqFieldBlocks.map((block) => (
                    <RequiredFieldDefaultBlock key={block.id} backupConfigId={backupConfigId} objectApiName={block.objectApiName} objectOptions={reqFieldObjectOptions} onObjectChange={(name) => updateReqFieldBlockObject(block.id, name)} onRemove={() => removeReqFieldBlock(block.id)} canRemove={reqFieldBlocks.length > 1} values={reqFieldValuesByObject[block.objectApiName] ?? {}} onValueChange={(fieldApiName, value) => updateReqFieldValue(block.objectApiName, fieldApiName, value)} onFieldsLoaded={onRequiredFieldsLoaded} />
                  ))}
                  <button onClick={addReqFieldBlock} className='self-start text-xs text-blue-600 hover:underline font-medium'>+ Add object</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Sticky footer */}
      <div className='flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white'>
        <button
          onClick={() => {
            if (!isConflictPhase && !hideRestoreMode) { setPhase('conflict'); }
            else { onBack(); }
          }}
          className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          ← Back
        </button>
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>💾 Save as Draft</button>
          <button
            onClick={() => {
              if (isConflictPhase) { setPhase('edgecases'); return; }
              onNext({ ...buildConflict(), edgeCases: buildEdgeCases() });
            }}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors'
            style={{ background: '#155DFC' }}
          >
            {isConflictPhase ? 'Next: Edge Cases →' : 'Next: Preview & Validate →'}
          </button>
        </div>
      </div>
    </div>
  );
}
