import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../../components/Typography';
import { useRestoreService } from '../../../../services/restore/restore.service';
import { OP_LABELS, OPERATORS_BY_TYPE } from './types';
import type { FilterTab, FilterRow, OrGroup, FieldDataType, FilterOperator, FieldOption } from './types';
import type { SourceSelection } from '../SelectSourceType';
import type { RestoreScopeFilter } from '../../../../services/restore/restore.service';

interface FilterConfig { rows: FilterRow[]; orGroups: OrGroup[]; filterLogic: string }

interface Props {
  sourceObjectNames: string[];
  sourceSelection: SourceSelection;
  onChange: (filters: RestoreScopeFilter[]) => void;
}

export default function CustomFilterScope({ sourceObjectNames, sourceSelection, onChange }: Props) {
  const restoreService = useRestoreService();

  const [filterTab,        setFilterTab]        = useState<FilterTab>('visual');
  const [pickerObj,        setPickerObj]        = useState('');
  const [addedObjs,        setAddedObjs]        = useState<string[]>([]);
  const [activeObj,        setActiveObj]        = useState('');
  const [configByObj,      setConfigByObj]      = useState<Record<string, FilterConfig>>({});
  const [soqlByObj,        setSoqlByObj]        = useState<Record<string, string>>({});
  const [pendingPicklist,  setPendingPicklist]  = useState<{ rowId: string; groupId?: string; fieldApiName: string } | null>(null);

  const activeCfg: FilterConfig = configByObj[activeObj] ?? { rows: [], orGroups: [], filterLogic: '' };
  const filterRows  = activeCfg.rows;
  const orGroups    = activeCfg.orGroups;
  const filterLogic = activeCfg.filterLogic;
  const soqlWhere   = soqlByObj[activeObj] ?? '';

  const setCfg = (obj: string, patch: Partial<FilterConfig>) =>
    setConfigByObj((p) => ({ ...p, [obj]: { ...(p[obj] ?? { rows: [], orGroups: [], filterLogic: '' }), ...patch } }));

  const setSoqlWhere = (val: string) => setSoqlByObj((p) => ({ ...p, [activeObj]: val }));

  const { data: filterFieldsData, isLoading: filterFieldsLoading } = useQuery({
    queryKey: ['filter-object-fields', activeObj, sourceSelection.backupConfigId],
    queryFn: () => restoreService.fetchObjectFields(activeObj, sourceSelection.backupConfigId),
    enabled: !!activeObj && !!sourceSelection.backupConfigId,
    staleTime: 60_000,
    retry: 1,
  });
  const filterFields: FieldOption[] = (filterFieldsData as any)?.data ?? [];

  const { data: picklistData } = useQuery({
    queryKey: ['restore-picklist', sourceSelection.backupConfigId, activeObj, pendingPicklist?.fieldApiName],
    queryFn: async () => {
      const result = await restoreService.getPicklistValues(activeObj, pendingPicklist!.fieldApiName, sourceSelection.backupConfigId);
      const payload = (result as any)?.data ?? result;
      const values = Array.isArray(payload) ? payload : ((payload as any)?.values ?? []);
      return values as { value: string; label: string }[];
    },
    enabled: !!pendingPicklist && !!activeObj,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!picklistData || !pendingPicklist) return;
    if (pendingPicklist.groupId) {
      updateOrGroupRow(pendingPicklist.groupId, pendingPicklist.rowId, { picklistValues: picklistData });
    } else {
      updateFilterRow(pendingPicklist.rowId, { picklistValues: picklistData });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picklistData]);

  const resolveDataType = (apiName: string): FieldDataType => {
    const rawType = filterFields.find((f) => f.apiName === apiName)?.dataType?.toLowerCase();
    return rawType && rawType in OPERATORS_BY_TYPE ? rawType as FieldDataType : 'string';
  };

  const makeBlankRow = (): FilterRow => {
    const first = filterFields[0];
    const rawType = first?.dataType?.toLowerCase();
    const dataType: FieldDataType = rawType && rawType in OPERATORS_BY_TYPE ? rawType as FieldDataType : 'string';
    return { id: String(Date.now()), field: first?.apiName ?? '', dataType, op: OPERATORS_BY_TYPE[dataType][0], value: '' };
  };

  const updateFilterRow = (id: string, patch: Partial<FilterRow>) =>
    setCfg(activeObj, { rows: filterRows.map((r) => r.id === id ? { ...r, ...patch } : r) });

  const removeFilterRow = (id: string) =>
    setCfg(activeObj, { rows: filterRows.filter((r) => r.id !== id) });

  const handleFilterFieldChange = (id: string, apiName: string) => {
    const dataType = resolveDataType(apiName);
    updateFilterRow(id, { field: apiName, dataType, op: OPERATORS_BY_TYPE[dataType][0], value: '', picklistValues: [] });
    if (dataType === 'picklist' && apiName) setPendingPicklist({ rowId: id, fieldApiName: apiName });
    else setPendingPicklist(null);
  };

  const updateOrGroupRow = (groupId: string, rowId: string, patch: Partial<FilterRow>) =>
    setCfg(activeObj, { orGroups: orGroups.map((g) => g.id !== groupId ? g : { ...g, rows: g.rows.map((r) => r.id === rowId ? { ...r, ...patch } : r) }) });

  const removeOrGroupRow = (groupId: string, rowId: string) =>
    setCfg(activeObj, { orGroups: orGroups.map((g) => g.id !== groupId ? g : { ...g, rows: g.rows.filter((r) => r.id !== rowId) }) });

  const handleOrGroupFieldChange = (groupId: string, rowId: string, apiName: string) => {
    const dataType = resolveDataType(apiName);
    updateOrGroupRow(groupId, rowId, { field: apiName, dataType, op: OPERATORS_BY_TYPE[dataType][0], value: '', picklistValues: [] });
    if (dataType === 'picklist' && apiName) setPendingPicklist({ rowId, groupId, fieldApiName: apiName });
    else setPendingPicklist(null);
  };

  const addObj = () => {
    if (!pickerObj || addedObjs.includes(pickerObj)) { setActiveObj(pickerObj); return; }
    setAddedObjs((p) => [...p, pickerObj]);
    setActiveObj(pickerObj);
    setConfigByObj((p) => ({ ...p, [pickerObj]: { rows: [], orGroups: [], filterLogic: '' } }));
  };

  const removeObj = (obj: string) => {
    setAddedObjs((p) => p.filter((o) => o !== obj));
    setConfigByObj((p) => { const n = { ...p }; delete n[obj]; return n; });
    setSoqlByObj((p) => { const n = { ...p }; delete n[obj]; return n; });
    setActiveObj((prev) => prev === obj ? (addedObjs.find((o) => o !== obj) ?? '') : prev);
  };

  const buildFilters = (): RestoreScopeFilter[] =>
    addedObjs.map((obj) => {
      if (filterTab === 'soql') {
        const where = soqlByObj[obj] ?? '';
        return { objectName: obj, filter: { type: 'SOQL' as const, soqlQuery: where.trim() ? `SELECT Id FROM ${obj} WHERE ${where.trim()}` : `SELECT Id FROM ${obj}` } };
      }
      const cfg = configByObj[obj] ?? { rows: [], orGroups: [], filterLogic: '' };
      return { objectName: obj, filter: { type: 'AND' as const, fields: cfg.rows.map((r) => ({ name: r.field, dataType: r.dataType, operator: r.op, value: r.value })) } };
    });

  const notify = () => onChange(buildFilters());

  const FilterRowEditor = ({ row, onFieldChange, onOpChange, onValueChange, onRemove }: {
    row: FilterRow;
    onFieldChange: (v: string) => void;
    onOpChange: (v: FilterOperator) => void;
    onValueChange: (v: string) => void;
    onRemove: () => void;
  }) => (
    <div className='flex items-center gap-2 flex-wrap'>
      <select value={row.field} onChange={(e) => onFieldChange(e.target.value)}
        className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none flex-1 min-w-0 sm:flex-none sm:w-48'>
        {filterFields.map((f) => <option key={f.apiName} value={f.apiName}>{f.label}</option>)}
      </select>
      <select value={row.op} onChange={(e) => onOpChange(e.target.value as FilterOperator)}
        className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none flex-1 min-w-0 sm:flex-none sm:w-36'>
        {OPERATORS_BY_TYPE[row.dataType ?? 'string'].map((o) => <option key={o} value={o}>{OP_LABELS[o]}</option>)}
      </select>
      {row.dataType === 'picklist' ? (
        <select value={row.value} onChange={(e) => onValueChange(e.target.value)}
          className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none flex-1 min-w-0 sm:w-32'>
          <option value=''>Select value</option>
          {(row.picklistValues ?? []).map((pv) => <option key={pv.value} value={pv.value}>{pv.label}</option>)}
        </select>
      ) : (
        <input value={row.value} onChange={(e) => onValueChange(e.target.value)}
          className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none flex-1 min-w-0 sm:w-32' />
      )}
      <button onClick={onRemove} className='w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0'>×</button>
    </div>
  );

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='px-5 py-3 border-b border-gray-100'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>⚙ Custom Filter</Typography>
      </div>
      <div className='p-5 space-y-4'>
        {/* Object picker */}
        <div className='flex items-center gap-3 flex-wrap'>
          <label className='text-xs font-semibold text-gray-700 flex-shrink-0'>Add Object</label>
          <select value={pickerObj} onChange={(e) => setPickerObj(e.target.value)}
            className='h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-52'>
            <option value=''>— Select an object —</option>
            {sourceObjectNames.filter((n) => !addedObjs.includes(n)).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button onClick={addObj} disabled={!pickerObj}
            className='h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'>
            + Add Object
          </button>
        </div>

        {/* Object tabs */}
        {addedObjs.length > 0 && (
          <div className='flex gap-1.5 flex-wrap border-b border-gray-200 pb-0'>
            {addedObjs.map((obj) => (
              <button key={obj} onClick={() => setActiveObj(obj)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors ${activeObj === obj ? 'bg-white border-gray-200 text-blue-600' : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700'}`}>
                {obj}
                <span onClick={(e) => { e.stopPropagation(); removeObj(obj); notify(); }}
                  className='ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:text-white hover:bg-red-500 transition-colors flex-shrink-0 text-[11px] font-bold cursor-pointer'>×</span>
              </button>
            ))}
          </div>
        )}

        {addedObjs.length === 0 ? (
          <p className='text-xs text-gray-400 py-4 text-center'>Add at least one object above to start building filters.</p>
        ) : !activeObj ? (
          <p className='text-xs text-gray-400 py-4 text-center'>Select an object tab to configure its filters.</p>
        ) : (
          <>
            {/* Visual / SOQL tabs */}
            <div className='flex border-b border-gray-200'>
              {(['visual', 'soql'] as FilterTab[]).map((t) => (
                <button key={t} onClick={() => setFilterTab(t)}
                  className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-colors ${filterTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t === 'visual' ? 'Visual Builder' : 'Write SOQL'}
                </button>
              ))}
            </div>

            {filterTab === 'visual' && (
              <div className='space-y-4'>
                {filterFieldsLoading && (
                  <div className='flex items-center gap-2 text-xs text-gray-400'>
                    <div className='w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
                    Loading fields for {activeObj}…
                  </div>
                )}
                <p className='text-xs text-gray-500'>Object: <strong className='text-gray-800'>{activeObj}</strong> · Filters in a group combine with AND. Use OR groups for alternatives.</p>

                <div className='space-y-2'>
                  {filterRows.map((row, idx) => (
                    <div key={row.id} className='flex items-center gap-2 flex-wrap'>
                      <span className='text-xs text-gray-400 font-semibold w-4 flex-shrink-0'>{idx + 1}</span>
                      <FilterRowEditor
                        row={row}
                        onFieldChange={(v) => { handleFilterFieldChange(row.id, v); notify(); }}
                        onOpChange={(v) => { updateFilterRow(row.id, { op: v }); notify(); }}
                        onValueChange={(v) => { updateFilterRow(row.id, { value: v }); notify(); }}
                        onRemove={() => { removeFilterRow(row.id); notify(); }}
                      />
                    </div>
                  ))}
                </div>

                {orGroups.map((group) => (
                  <div key={group.id} className='relative rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2'>
                    <span className='absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-bold text-orange-500 border border-orange-400 rounded-full'>OR</span>
                    {group.rows.map((row) => (
                      <FilterRowEditor
                        key={row.id}
                        row={row}
                        onFieldChange={(v) => { handleOrGroupFieldChange(group.id, row.id, v); notify(); }}
                        onOpChange={(v) => { updateOrGroupRow(group.id, row.id, { op: v }); notify(); }}
                        onValueChange={(v) => { updateOrGroupRow(group.id, row.id, { value: v }); notify(); }}
                        onRemove={() => { group.rows.length === 1 ? setCfg(activeObj, { orGroups: orGroups.filter((g) => g.id !== group.id) }) : removeOrGroupRow(group.id, row.id); notify(); }}
                      />
                    ))}
                    <button onClick={() => { setCfg(activeObj, { orGroups: orGroups.map((g) => g.id !== group.id ? g : { ...g, rows: [...g.rows, makeBlankRow()] }) }); notify(); }}
                      className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors'>
                      + Add filter to this OR group
                    </button>
                  </div>
                ))}

                <div className='flex gap-2'>
                  <button onClick={() => { setCfg(activeObj, { rows: [...filterRows, makeBlankRow()] }); notify(); }}
                    className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors'>+ Add filter</button>
                  <button onClick={() => { setCfg(activeObj, { orGroups: [...orGroups, { id: String(Date.now()), rows: [makeBlankRow()] }] }); notify(); }}
                    className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors'>+ OR group</button>
                </div>

                <div className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-1.5'>
                  <div className='flex items-center gap-3 flex-wrap'>
                    <label className='text-xs font-semibold text-gray-700 flex-shrink-0'>Filter Logic</label>
                    <input value={filterLogic} onChange={(e) => { setCfg(activeObj, { filterLogic: e.target.value }); notify(); }}
                      placeholder='e.g. (1 OR 2) AND (3 OR 4)'
                      className='h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-0 sm:w-48 sm:flex-none' />
                  </div>
                  <p className='text-[11px] text-gray-400'>Default is AND between all rows. Override only if you need nested boolean logic.</p>
                </div>
              </div>
            )}

            {filterTab === 'soql' && (
              <div className='space-y-4'>
                <p className='text-xs text-gray-500'>Write only the WHERE clause for <strong className='text-gray-800'>{activeObj}</strong>. The full query is built automatically.</p>
                <div className='rounded-lg bg-gray-900 px-4 py-3 font-mono text-xs leading-relaxed text-gray-300 select-none'>
                  <span className='text-blue-400'>SELECT</span> Id <span className='text-blue-400'>FROM</span> <span className='text-green-400'>{activeObj}</span>
                  {soqlWhere.trim() && (
                    <> <span className='text-blue-400'>WHERE</span> <span className='text-yellow-300'>{soqlWhere.trim()}</span></>
                  )}
                </div>
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold text-gray-700'>WHERE clause</label>
                  <textarea value={soqlWhere} onChange={(e) => { setSoqlWhere(e.target.value); notify(); }} rows={4}
                    placeholder={`e.g. Status = 'Closed' AND LastModifiedDate > 2026-01-01`}
                    className='w-full text-sm font-mono border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50' />
                </div>
                <div className='flex justify-end'>
                  <button type='button' disabled={!soqlWhere.trim()}
                    className='inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                    Validate Query
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
