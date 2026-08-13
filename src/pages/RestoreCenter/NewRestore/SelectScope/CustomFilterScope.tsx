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
  sourceObjectsLoading: boolean;
  sourceSelection: SourceSelection;
  onChange: (filters: RestoreScopeFilter[]) => void;
}

export default function CustomFilterScope({ sourceObjectNames, sourceObjectsLoading, sourceSelection, onChange }: Props) {
  const restoreService = useRestoreService();

  const [objSearch,       setObjSearch]       = useState('');
  const [addedObjs,       setAddedObjs]       = useState<string[]>([]);
  const [modalObj,        setModalObj]        = useState<string | null>(null);
  const [filterTab,       setFilterTab]       = useState<FilterTab>('visual');
  const [configByObj,     setConfigByObj]     = useState<Record<string, FilterConfig>>({});
  const [soqlByObj,       setSoqlByObj]       = useState<Record<string, string>>({});
  const [pendingPicklist, setPendingPicklist] = useState<{ rowId: string; groupId?: string; fieldApiName: string } | null>(null);

  const activeCfg: FilterConfig = configByObj[modalObj ?? ''] ?? { rows: [], orGroups: [], filterLogic: '' };
  const filterRows  = activeCfg.rows;
  const orGroups    = activeCfg.orGroups;
  const soqlWhere   = soqlByObj[modalObj ?? ''] ?? '';

  const setCfg = (obj: string, patch: Partial<FilterConfig>) =>
    setConfigByObj((p) => ({ ...p, [obj]: { ...(p[obj] ?? { rows: [], orGroups: [], filterLogic: '' }), ...patch } }));

  const setSoqlWhere = (val: string) => setSoqlByObj((p) => ({ ...p, [modalObj!]: val }));

  const { data: filterFieldsData, isLoading: filterFieldsLoading } = useQuery({
    queryKey: ['filter-object-fields', modalObj, sourceSelection.backupConfigId],
    queryFn: () => restoreService.fetchObjectFields(modalObj!, sourceSelection.backupConfigId),
    enabled: !!modalObj && !!sourceSelection.backupConfigId,
    staleTime: 60_000,
    retry: 1,
  });
  const filterFields: FieldOption[] = (filterFieldsData as any)?.data ?? [];

  const { data: picklistData } = useQuery({
    queryKey: ['restore-picklist', sourceSelection.backupConfigId, modalObj, pendingPicklist?.fieldApiName],
    queryFn: async () => {
      const result = await restoreService.getPicklistValues(modalObj!, pendingPicklist!.fieldApiName, sourceSelection.backupConfigId);
      const payload = (result as any)?.data ?? result;
      const values = Array.isArray(payload) ? payload : ((payload as any)?.values ?? []);
      return values as { value: string; label: string }[];
    },
    enabled: !!pendingPicklist && !!modalObj,
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
    setCfg(modalObj!, { rows: filterRows.map((r) => r.id === id ? { ...r, ...patch } : r) });

  const removeFilterRow = (id: string) =>
    setCfg(modalObj!, { rows: filterRows.filter((r) => r.id !== id) });

  const handleFilterFieldChange = (id: string, apiName: string) => {
    const dataType = resolveDataType(apiName);
    updateFilterRow(id, { field: apiName, dataType, op: OPERATORS_BY_TYPE[dataType][0], value: '', picklistValues: [] });
    if (dataType === 'picklist' && apiName) setPendingPicklist({ rowId: id, fieldApiName: apiName });
    else setPendingPicklist(null);
  };

  const updateOrGroupRow = (groupId: string, rowId: string, patch: Partial<FilterRow>) =>
    setCfg(modalObj!, { orGroups: orGroups.map((g) => g.id !== groupId ? g : { ...g, rows: g.rows.map((r) => r.id === rowId ? { ...r, ...patch } : r) }) });

  const removeOrGroupRow = (groupId: string, rowId: string) =>
    setCfg(modalObj!, { orGroups: orGroups.map((g) => g.id !== groupId ? g : { ...g, rows: g.rows.filter((r) => r.id !== rowId) }) });

  const handleOrGroupFieldChange = (groupId: string, rowId: string, apiName: string) => {
    const dataType = resolveDataType(apiName);
    updateOrGroupRow(groupId, rowId, { field: apiName, dataType, op: OPERATORS_BY_TYPE[dataType][0], value: '', picklistValues: [] });
    if (dataType === 'picklist' && apiName) setPendingPicklist({ rowId, groupId, fieldApiName: apiName });
    else setPendingPicklist(null);
  };

  const toggleObj = (name: string) => {
    setAddedObjs((prev) => {
      const next = prev.includes(name) ? prev.filter((o) => o !== name) : [...prev, name];
      if (!next.includes(name)) {
        setConfigByObj((p) => { const n = { ...p }; delete n[name]; return n; });
        setSoqlByObj((p) => { const n = { ...p }; delete n[name]; return n; });
      }
      buildAndNotify(next);
      return next;
    });
  };

  const buildAndNotify = (objs: string[]) => {
    const filters: RestoreScopeFilter[] = objs.map((obj) => {
      const cfg = configByObj[obj] ?? { rows: [], orGroups: [], filterLogic: '' };
      const soql = soqlByObj[obj] ?? '';
      if (soql.trim()) {
        return { objectName: obj, filter: { type: 'SOQL' as const, soqlQuery: `SELECT Id FROM ${obj} WHERE ${soql.trim()}` } };
      }
      return { objectName: obj, filter: { type: 'AND' as const, fields: cfg.rows.map((r) => ({ name: r.field, dataType: r.dataType, operator: r.op, value: r.value })) } };
    });
    onChange(filters);
  };

  const hasFilter = (name: string): boolean => {
    const cfg = configByObj[name];
    const soql = soqlByObj[name] ?? '';
    return soql.trim().length > 0 || (cfg?.rows?.length ?? 0) > 0 || (cfg?.orGroups?.length ?? 0) > 0;
  };

  const filterSummary = (name: string): string => {
    const soql = soqlByObj[name] ?? '';
    if (soql.trim()) return `SOQL: ${soql.trim().slice(0, 40)}${soql.trim().length > 40 ? '…' : ''}`;
    const cfg = configByObj[name];
    const count = (cfg?.rows?.length ?? 0) + (cfg?.orGroups?.reduce((s, g) => s + g.rows.length, 0) ?? 0);
    return count > 0 ? `${count} filter condition${count !== 1 ? 's' : ''}` : '';
  };

  const openModal = (name: string) => {
    setModalObj(name);
    setFilterTab('visual');
    setPendingPicklist(null);
  };

  const closeModal = () => setModalObj(null);

  const applyModal = () => {
    buildAndNotify(addedObjs);
    setModalObj(null);
  };

  const filteredObjs = sourceObjectNames.filter((n) => n.toLowerCase().includes(objSearch.toLowerCase()));
  const totalFiltered = addedObjs.filter(hasFilter).length;

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
    <>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='px-5 py-3 border-b border-gray-100 flex items-center justify-between'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>⚙ Custom Filter</Typography>
          {totalFiltered > 0 && (
            <span className='text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700'>
              {totalFiltered} object{totalFiltered !== 1 ? 's' : ''} filtered
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className='px-4 py-2.5 border-b border-gray-100 bg-gray-50'>
          <div className='relative max-w-xs'>
            <svg className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
              <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
            </svg>
            <input value={objSearch} onChange={(e) => setObjSearch(e.target.value)} placeholder='Search objects…'
              className='h-8 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-700 outline-none focus:border-blue-400 transition' />
          </div>
        </div>

        {/* Object list */}
        {sourceObjectsLoading ? (
          <div className='flex items-center justify-center py-10 gap-2 text-xs text-gray-400'>
            <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />Loading objects…
          </div>
        ) : sourceObjectNames.length === 0 ? (
          <p className='text-xs text-gray-400 py-8 text-center'>No objects found.</p>
        ) : (
          <div className='divide-y divide-gray-50' style={{ maxHeight: 600, overflowY: 'auto' }}>
            {filteredObjs.map((name) => {
              const isTicked  = addedObjs.includes(name);
              const hasF      = hasFilter(name);
              const summary   = filterSummary(name);
              return (
                <div key={name} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isTicked ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50'}`}>
                  <input type='checkbox' checked={isTicked} onChange={() => toggleObj(name)}
                    className='w-4 h-4 accent-blue-600 cursor-pointer rounded flex-shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <span className={`text-sm font-mono truncate block ${isTicked ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{name}</span>
                    {isTicked && summary && (
                      <span className='text-[11px] text-blue-600 font-medium'>{summary}</span>
                    )}
                  </div>
                  {isTicked && (
                    <button onClick={() => openModal(name)}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${hasF ? 'border-blue-400 bg-blue-600 text-white hover:bg-blue-700' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}>
                      {hasF ? (
                        <>
                          <svg width='11' height='11' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12'/></svg>
                          Edit Filter
                        </>
                      ) : 'Apply Filter →'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className='px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400'>
          Showing {filteredObjs.length} of {sourceObjectNames.length} objects · {addedObjs.length} selected
        </div>
      </div>

      {/* Filter Modal */}
      {modalObj && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden'
            style={{ width: 780, maxHeight: '90vh', border: '1px solid #E2E8F0' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0'>
              <div>
                <h2 className='text-base font-bold text-gray-900 font-mono'>{modalObj}</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Define filter conditions for this object</p>
              </div>
              <button onClick={closeModal} className='p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className='flex border-b border-gray-200 px-6 flex-shrink-0'>
              {(['visual', 'soql'] as FilterTab[]).map((t) => (
                <button key={t} onClick={() => setFilterTab(t)}
                  className={`pb-3 pt-2 px-4 text-sm font-semibold border-b-2 transition-colors ${filterTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t === 'visual' ? 'Visual Builder' : 'Write SOQL'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className='flex-1 min-h-0 overflow-y-auto px-6 py-5'>

              {filterTab === 'visual' && (
                <div className='space-y-4'>
                  {filterFieldsLoading ? (
                    <div className='flex items-center gap-2 text-xs text-gray-400 py-4 justify-center'>
                      <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
                      Loading fields for {modalObj}…
                    </div>
                  ) : (
                    <>
                      <p className='text-xs text-gray-500'>Filters within a group are combined with AND. Use OR groups for alternative conditions.</p>

                      {/* AND rows */}
                      <div className='space-y-2'>
                        {filterRows.map((row, idx) => (
                          <div key={row.id} className='flex items-center gap-2 flex-wrap'>
                            <span className='text-xs text-gray-400 font-semibold w-5 flex-shrink-0 text-right'>{idx + 1}</span>
                            <FilterRowEditor
                              row={row}
                              onFieldChange={(v) => handleFilterFieldChange(row.id, v)}
                              onOpChange={(v) => updateFilterRow(row.id, { op: v })}
                              onValueChange={(v) => updateFilterRow(row.id, { value: v })}
                              onRemove={() => removeFilterRow(row.id)}
                            />
                          </div>
                        ))}
                        {filterRows.length === 0 && (
                          <p className='text-xs text-gray-400 py-2'>No conditions yet. Click <strong>+ Add filter</strong> to start.</p>
                        )}
                      </div>

                      {/* OR groups */}
                      {orGroups.map((group) => (
                        <div key={group.id} className='relative rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2'>
                          <span className='absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-bold text-orange-500 border border-orange-400 rounded-full'>OR</span>
                          {group.rows.map((row) => (
                            <FilterRowEditor
                              key={row.id}
                              row={row}
                              onFieldChange={(v) => handleOrGroupFieldChange(group.id, row.id, v)}
                              onOpChange={(v) => updateOrGroupRow(group.id, row.id, { op: v })}
                              onValueChange={(v) => updateOrGroupRow(group.id, row.id, { value: v })}
                              onRemove={() => group.rows.length === 1
                                ? setCfg(modalObj!, { orGroups: orGroups.filter((g) => g.id !== group.id) })
                                : removeOrGroupRow(group.id, row.id)}
                            />
                          ))}
                          <button onClick={() => setCfg(modalObj!, { orGroups: orGroups.map((g) => g.id !== group.id ? g : { ...g, rows: [...g.rows, makeBlankRow()] }) })}
                            className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors'>
                            + Add filter to this OR group
                          </button>
                        </div>
                      ))}

                      {/* Actions */}
                      <div className='flex gap-2'>
                        <button onClick={() => setCfg(modalObj!, { rows: [...filterRows, makeBlankRow()] })}
                          className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors'>+ Add filter</button>
                        <button onClick={() => setCfg(modalObj!, { orGroups: [...orGroups, { id: String(Date.now()), rows: [makeBlankRow()] }] })}
                          className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors'>+ OR group</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {filterTab === 'soql' && (
                <div className='space-y-4'>
                  <p className='text-xs text-gray-500'>Write only the WHERE clause for <strong className='text-gray-800'>{modalObj}</strong>. The full query is built automatically.</p>
                  <div className='rounded-lg bg-gray-900 px-4 py-3 font-mono text-xs leading-relaxed text-gray-300 select-none'>
                    <span className='text-blue-400'>SELECT</span> Id <span className='text-blue-400'>FROM</span> <span className='text-green-400'>{modalObj}</span>
                    {soqlWhere.trim() && (
                      <> <span className='text-blue-400'>WHERE</span> <span className='text-yellow-300'>{soqlWhere.trim()}</span></>
                    )}
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-gray-700'>WHERE clause</label>
                    <textarea value={soqlWhere} onChange={(e) => setSoqlWhere(e.target.value)} rows={5}
                      placeholder={`e.g. Status = 'Closed' AND LastModifiedDate > 2026-01-01`}
                      className='w-full text-sm font-mono border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50' />
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className='flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between'>
              <button onClick={() => {
                setCfg(modalObj!, { rows: [], orGroups: [], filterLogic: '' });
                setSoqlByObj((p) => ({ ...p, [modalObj!]: '' }));
              }} className='text-xs font-medium text-gray-500 hover:text-red-500 transition-colors'>
                Clear all filters
              </button>
              <div className='flex items-center gap-3'>
                <button onClick={closeModal} className='px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>Cancel</button>
                <button onClick={applyModal} className='px-6 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'>Apply Filter</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
