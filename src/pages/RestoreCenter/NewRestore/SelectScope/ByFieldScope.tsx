import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../../components/Typography';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { RestoreSourceObject } from '../../../../services/restore/restore.service';
import type { FieldOption } from './types';
import type { SourceSelection } from '../SelectSourceType';
import { resolveAutoSelectedChildren, formatAutoSelectMessage } from './objectDependencies';
import { useAutoSelectToast } from './useAutoSelectToast';
import AutoSelectToast from './AutoSelectToast';

interface Props {
  sourceObjects: RestoreSourceObject[];
  sourceObjectsLoading: boolean;
  sourceSelection: SourceSelection;
  onChange: (fields: { objectName: string; fieldNames: string[] }[]) => void;
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

// Fetches one object's fields in the background regardless of whether it's
// the currently active (visible) panel — needed so an auto-selected child
// gets its fields default-selected even if the user never clicks "Select
// Fields →" on it. Shares its react-query cache key with the visible panel's
// own fetch (same queryKey shape), so activating this object later reads
// from cache instead of re-fetching. Renders nothing.
function FieldsAutoLoader({
  objectName, backupConfigId, alreadyInitialized, onFieldsLoaded,
}: {
  objectName: string;
  backupConfigId: string;
  alreadyInitialized: boolean;
  onFieldsLoaded: (objectName: string, fields: FieldOption[]) => void;
}) {
  const restoreService = useRestoreService();
  const { data } = useQuery({
    queryKey: ['source-object-fields', objectName, backupConfigId],
    queryFn: () => restoreService.fetchObjectFields(objectName, backupConfigId),
    enabled: !!objectName && !!backupConfigId && !alreadyInitialized,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!alreadyInitialized && data?.data) onFieldsLoaded(objectName, (data as any).data ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, alreadyInitialized]);

  return null;
}

export default function ByFieldScope({ sourceObjects, sourceObjectsLoading, sourceSelection, onChange }: Props) {
  const restoreService = useRestoreService();
  const { toastMessage, showToast } = useAutoSelectToast();

  const [objSearch,          setObjSearch]          = useState('');
  // The user's own ticks — auto-selected children are never added here (same
  // convention as ByObjectScope), so they drop out once nothing manually
  // selected still needs them.
  const [manuallySelectedObjs, setManuallySelectedObjs] = useState<Set<string>>(new Set());
  const [activeObj,          setActiveObj]          = useState('');
  const [selectedFields,     setSelectedFields]     = useState<Record<string, Set<string>>>({});
  const [fieldFilter,        setFieldFilter]        = useState<'All' | 'Standard' | 'Custom' | 'Required'>('All');
  const [fieldSearch,        setFieldSearch]        = useState('');

  const sourceObjectNames = useMemo(() => sourceObjects.map((o) => o.name), [sourceObjects]);
  const childrenByObject = useMemo(
    () => Object.fromEntries(sourceObjects.map((o) => [o.name, o.autoSelectChildren ?? []])),
    [sourceObjects]
  );

  const { autoSelected, reasons } = useMemo(
    () => resolveAutoSelectedChildren(manuallySelectedObjs, childrenByObject),
    [manuallySelectedObjs, childrenByObject]
  );
  const autoSelectedSet = useMemo(() => new Set(autoSelected), [autoSelected]);
  const effectiveSelectedObjs = useMemo(
    () => new Set([...manuallySelectedObjs, ...autoSelected]),
    [manuallySelectedObjs, autoSelected]
  );
  const isAutoOnly = (name: string) => autoSelectedSet.has(name) && !manuallySelectedObjs.has(name);

  // Toast only for newly-required parents since the last render.
  const prevAutoRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newlyAdded = autoSelected.filter((p) => !prevAutoRef.current.has(p));
    if (newlyAdded.length) showToast(formatAutoSelectMessage(newlyAdded, reasons));
    prevAutoRef.current = new Set(autoSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelected]);

  // Default-select every field the first time an object's fields load — for
  // every effectively selected object, not just the active one. Never
  // overwrites a field set that already exists (user edits or a prior
  // default-init survive reloads/re-selection).
  const onFieldsLoaded = (objectName: string, fields: FieldOption[]) => {
    setSelectedFields((prev) => {
      if (prev[objectName]) return prev;
      return { ...prev, [objectName]: new Set(fields.map((f) => f.apiName)) };
    });
  };

  // Report the final object+field selection to the parent whenever either changes.
  useEffect(() => {
    onChange(
      [...effectiveSelectedObjs].map((obj) => ({ objectName: obj, fieldNames: [...(selectedFields[obj] ?? [])] }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSelectedObjs, selectedFields]);

  const { data: fieldOptionsData, isLoading: fieldOptionsLoading } = useQuery({
    queryKey: ['source-object-fields', activeObj, sourceSelection.backupConfigId],
    queryFn: () => restoreService.fetchObjectFields(activeObj, sourceSelection.backupConfigId),
    enabled: !!activeObj && !!sourceSelection.backupConfigId,
    staleTime: 60_000,
    retry: 1,
  });
  const sourceFields: FieldOption[] = (fieldOptionsData as any)?.data ?? [];

  const availableFields = sourceFields.filter((f) => {
    if (fieldSearch && !f.label.toLowerCase().includes(fieldSearch.toLowerCase())) return false;
    if (fieldFilter === 'Custom')   return f.isCustom === true;
    if (fieldFilter === 'Standard') return f.isCustom === false;
    if (fieldFilter === 'Required') return f.isRequired === true;
    return true;
  });
  const activeFieldSet = selectedFields[activeObj] ?? new Set<string>();

  const toggleObj = (name: string) => {
    if (isAutoOnly(name)) return; // cascade-required child — not user-toggleable
    setManuallySelectedObjs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); setActiveObj(name); }
      return next;
    });
  };

  const toggleField = (apiName: string) => {
    setSelectedFields((prev) => {
      const cur = new Set(prev[activeObj] ?? []);
      cur.has(apiName) ? cur.delete(apiName) : cur.add(apiName);
      return { ...prev, [activeObj]: cur };
    });
  };

  const selectAllFields = () => {
    setSelectedFields((prev) => ({ ...prev, [activeObj]: new Set(availableFields.map((f) => f.apiName)) }));
  };

  const deselectAllFields = () => {
    setSelectedFields((prev) => ({ ...prev, [activeObj]: new Set<string>() }));
  };

  const totalFields = [...effectiveSelectedObjs].reduce((s, obj) => s + (selectedFields[obj]?.size ?? 0), 0);
  const filteredObjs = sourceObjectNames.filter((n) => n.toLowerCase().includes(objSearch.toLowerCase()));

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <AutoSelectToast message={toastMessage} />
      {/* Background field loaders — one per effectively selected object, so
          an auto-selected child's fields get default-selected even if the
          user never opens its field panel. No UI of their own. */}
      {[...effectiveSelectedObjs].map((obj) => (
        <FieldsAutoLoader
          key={obj}
          objectName={obj}
          backupConfigId={sourceSelection.backupConfigId}
          alreadyInitialized={!!selectedFields[obj]}
          onFieldsLoaded={onFieldsLoaded}
        />
      ))}
      <div className='px-5 py-3 border-b border-gray-100 flex items-center justify-between'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>▤ Pick Fields per Object</Typography>
        {effectiveSelectedObjs.size > 0 && (
          <span className='text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700'>
            {effectiveSelectedObjs.size} object{effectiveSelectedObjs.size !== 1 ? 's' : ''} · {totalFields} fields
          </span>
        )}
      </div>
      <div className='p-5 space-y-4'>
        <InfoCallout>
          Tick objects to include them — all of an object's fields are selected by default, and cascade-tied child objects are added automatically. Click <strong>Select Fields →</strong> on any ticked object to fine-tune which fields to restore.
        </InfoCallout>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Left — object list */}
          <div className='rounded-lg border border-gray-200 overflow-hidden flex flex-col'>
            <div className='px-3 py-2 border-b border-gray-100 bg-gray-50'>
              <div className='relative'>
                <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                  <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                </svg>
                <input value={objSearch} onChange={(e) => setObjSearch(e.target.value)} placeholder='Search objects…'
                  className='w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500' />
              </div>
            </div>
            <div className='px-3 py-1.5 bg-gray-50 border-b border-gray-100'>
              <p className='text-[10px] font-bold text-gray-500 uppercase tracking-wide'>Objects <span className='font-normal normal-case'>(tick to include)</span></p>
            </div>
            <div className='divide-y divide-gray-50 overflow-y-auto' style={{ maxHeight: 600 }}>
              {sourceObjectsLoading ? (
                <div className='flex items-center justify-center py-6 gap-2 text-xs text-gray-400'>
                  <div className='w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />Loading objects…
                </div>
              ) : sourceObjectNames.length === 0 ? (
                <p className='text-xs text-gray-400 py-6 text-center'>No objects found.</p>
              ) : filteredObjs.map((name) => {
                const isTicked   = effectiveSelectedObjs.has(name);
                const autoOnly   = isAutoOnly(name);
                const isActive   = activeObj === name;
                const fieldCount = selectedFields[name]?.size ?? 0;
                return (
                  <div key={name} className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${isActive ? 'bg-blue-50' : isTicked ? 'bg-gray-50/60' : 'bg-white'}`}>
                    <input
                      type='checkbox'
                      checked={isTicked}
                      disabled={autoOnly}
                      onChange={() => toggleObj(name)}
                      className='w-3.5 h-3.5 accent-blue-600 flex-shrink-0'
                      style={{ cursor: autoOnly ? 'not-allowed' : 'pointer', opacity: autoOnly ? 0.6 : 1 }}
                    />
                    <span className={`text-xs font-mono flex-1 min-w-0 truncate flex items-center gap-1.5 ${isActive ? 'font-semibold text-blue-700' : isTicked ? 'text-gray-800' : 'text-gray-500'}`}>
                      <span className='truncate'>{name}</span>
                      {autoOnly && (
                        <span className='flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600' title='Automatically selected — cascade-deletes with a ticked object'>
                          Auto
                        </span>
                      )}
                    </span>
                    {isTicked ? (
                      <button onClick={() => { setActiveObj(name); setFieldSearch(''); setFieldFilter('All'); }}
                        className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}>
                        {fieldCount > 0 ? `${fieldCount} fields ✎` : 'Select Fields →'}
                      </button>
                    ) : (
                      <span className='text-[10px] text-gray-300 flex-shrink-0'>—</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className='px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400'>
              Showing {filteredObjs.length} of {sourceObjectNames.length}
            </div>
          </div>

          {/* Right — field picker */}
          <div className='rounded-lg border border-gray-200 overflow-hidden flex flex-col' style={{ minHeight: 648 }}>
            {!activeObj ? (
              <div className='flex-1 flex flex-col items-center justify-center py-12 px-4 text-center gap-2'>
                <svg width='32' height='32' fill='none' stroke='#CBD5E1' strokeWidth='1.5' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                </svg>
                <p className='text-xs text-gray-400'>Tick an object on the left, then click <strong className='text-gray-600'>Select Fields →</strong> to choose its fields here.</p>
              </div>
            ) : (
              <>
                <div className='px-3 py-2 border-b border-gray-100 bg-gray-50 space-y-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-xs font-semibold text-gray-700 font-mono truncate'>{activeObj}</span>
                    <div className='flex gap-2 text-xs flex-shrink-0'>
                      <button onClick={selectAllFields} className='text-blue-500 hover:underline'>Select all</button>
                      <span className='text-gray-300'>·</span>
                      <button onClick={deselectAllFields} className='text-blue-500 hover:underline'>Deselect all</button>
                    </div>
                  </div>
                  <div className='relative'>
                    <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='12' height='12' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                      <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                    </svg>
                    <input value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder='Search fields…'
                      className='w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500' />
                  </div>
                  <div className='flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-semibold'>
                    {(['All', 'Standard', 'Custom', 'Required'] as const).map((f) => (
                      <button key={f} onClick={() => setFieldFilter(f)}
                        className={`flex-1 px-2 py-1 transition-colors ${fieldFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className='p-3 flex flex-wrap gap-2 content-start overflow-y-auto flex-1' style={{ minHeight: 0 }}>
                  {fieldOptionsLoading ? (
                    <div className='flex items-center gap-2 text-xs text-gray-400 w-full justify-center py-4'>
                      <div className='w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />Loading fields…
                    </div>
                  ) : availableFields.length === 0 ? (
                    <p className='text-xs text-gray-400'>No fields match your search.</p>
                  ) : availableFields.map((f) => {
                    const on = activeFieldSet.has(f.apiName);
                    return (
                      <button key={f.apiName} onClick={() => toggleField(f.apiName)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                <div className='px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400'>
                  {activeFieldSet.size} of {sourceFields.length} fields selected · showing {availableFields.length}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
