import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../../../hooks/useDebounce';
import { toUTCISOString } from '../../../../utils';
import Typography from '../../../../components/Typography';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { SFRecord } from './types';
import type { SourceSelection } from '../SelectSourceType';

const COLUMN_NAMES = ['Id', 'Name', 'LastModifiedDate', 'OPERATION'];

interface RecordsByObj { [obj: string]: Set<string> }

interface Props {
  sourceObjectNames: string[];
  sourceObjectsLoading: boolean;
  sourceSelection: SourceSelection;
  onChange: (records: { objectName: string; recordIds: string[] }[]) => void;
  onObjectsChange: (addedObjs: string[], emptyObjs: string[]) => void;
}

export default function ByRecordScope({ sourceObjectNames, sourceObjectsLoading, sourceSelection, onChange, onObjectsChange }: Props) {
  const restoreService = useRestoreService();

  const [objSearch,       setObjSearch]       = useState('');
  const [addedObjs,       setAddedObjs]       = useState<string[]>([]);
  const [activeObj,       setActiveObj]       = useState('');
  const [selectedByObj,   setSelectedByObj]   = useState<RecordsByObj>({});
  const [allRecordsByObj, setAllRecordsByObj] = useState<Record<string, SFRecord[]>>({});
  const [cursor,          setCursor]          = useState<string | undefined>(undefined);
  const [modalObj,        setModalObj]        = useState<string | null>(null);
  const [draftSelected,   setDraftSelected]   = useState<Set<string>>(new Set());
  const [recordSearch,    setRecordSearch]    = useState('');
  const [emptyObjs,       setEmptyObjs]       = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(recordSearch, 500);

  // Reset cursor and records when object or search changes
  const prevObjRef    = useRef(activeObj);
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevObjRef.current !== activeObj || prevSearchRef.current !== debouncedSearch) {
      setCursor(undefined);
      if (prevObjRef.current !== activeObj) {
        setAllRecordsByObj((p) => ({ ...p, [activeObj]: [] }));
      }
      prevObjRef.current    = activeObj;
      prevSearchRef.current = debouncedSearch;
    }
  }, [activeObj, debouncedSearch]);

  const isChangedBetween = sourceSelection.type === 'CHANGED_BETWEEN';

  const fetchPayload = !!activeObj && !!sourceSelection.backupConfigId
    ? isChangedBetween
      ? {
          backupConfigId: sourceSelection.backupConfigId,
          configType:     sourceSelection.configType,
          objectApiName:  activeObj,
          type:           'CHANGED_BETWEEN' as const,
          startDate:      toUTCISOString(sourceSelection.startDate) ?? '',
          endDate:        toUTCISOString(sourceSelection.endDate)   ?? '',
          columnNames:    COLUMN_NAMES,
          ...(debouncedSearch ? { searchText: debouncedSearch } : {}),
          ...(cursor          ? { cursor }                      : {}),
        }
      : {
          backupConfigId: sourceSelection.backupConfigId,
          configType:     sourceSelection.configType,
          objectApiName:  activeObj,
          type:           'ENTIRE' as const,
          columnNames:    COLUMN_NAMES,
          ...(debouncedSearch ? { searchText: debouncedSearch } : {}),
          ...(cursor          ? { cursor }                      : {}),
        }
    : null;

  const { data: fetchedData, isLoading: isLoadingRecords, isFetching: isFetchingMore } = useQuery({
    queryKey: ['restore-fetch-records', sourceSelection.backupConfigId, sourceSelection.type, activeObj, debouncedSearch, cursor],
    queryFn: () => restoreService.fetchRecords(fetchPayload!),
    enabled: !!fetchPayload,
  });

  useEffect(() => {
    if (!activeObj || !fetchedData) return;
    const records: SFRecord[] = ((fetchedData as any)?.data?.rows ?? []).map((r: any) => r.record);
    setAllRecordsByObj((prev) => ({
      ...prev,
      [activeObj]: cursor ? [...(prev[activeObj] ?? []), ...records] : records,
    }));
    if (!cursor && records.length === 0) {
      setEmptyObjs((prev) => {
        const next = new Set([...prev, activeObj]);
        onObjectsChange(addedObjs, [...next]);
        return next;
      });
    } else if (records.length > 0) {
      setEmptyObjs((prev) => {
        const next = new Set(prev);
        next.delete(activeObj);
        onObjectsChange(addedObjs, [...next]);
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedData]);

  const hasMore: boolean    = (fetchedData as any)?.meta?.hasMore    ?? false;
  const nextCursor: string | undefined = (fetchedData as any)?.meta?.nextCursor;

  const totalSelected = Object.values(selectedByObj).reduce((s, set) => s + set.size, 0);

  const addObj = (name: string) => {
    if (!name || addedObjs.includes(name)) { setActiveObj(name); return; }
    const next = [...addedObjs, name];
    setAddedObjs(next);
    onObjectsChange(next, [...emptyObjs]);
    setActiveObj(name);
    setAllRecordsByObj((p) => ({ ...p, [name]: [] }));
    setSelectedByObj((p) => ({ ...p, [name]: new Set() }));
    setCursor(undefined);
  };

  const removeObj = (name: string) => {
    const next = addedObjs.filter((o) => o !== name);
    setAddedObjs(next);
    const nextEmpty = new Set(emptyObjs);
    nextEmpty.delete(name);
    setEmptyObjs(nextEmpty);
    onObjectsChange(next, [...nextEmpty]);
    setAllRecordsByObj((p) => { const n = { ...p }; delete n[name]; return n; });
    setSelectedByObj((p) => { const n = { ...p }; delete n[name]; return n; });
    setActiveObj((prev) => prev === name ? (next[0] ?? '') : prev);
    setCursor(undefined);
  };

  const openModal = (name: string) => {
    setActiveObj(name);
    setRecordSearch('');
    setDraftSelected(new Set(selectedByObj[name] ?? []));
    setModalObj(name);
  };

  const closeModal = () => { setModalObj(null); setDraftSelected(new Set()); };

  const saveModal = () => {
    if (!modalObj) return;
    const next = { ...selectedByObj, [modalObj]: new Set(draftSelected) };
    setSelectedByObj(next);
    onChange(Object.entries(next).map(([obj, ids]) => ({ objectName: obj, recordIds: [...ids] })));
    setModalObj(null);
    setDraftSelected(new Set());
  };

  const toggleDraft = (id: string) =>
    setDraftSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const activeRecords = allRecordsByObj[activeObj] ?? [];
  const filteredRecords = activeRecords.filter(
    (r) => r.Name?.toLowerCase().includes(recordSearch.toLowerCase()) || r.Id?.toLowerCase().includes(recordSearch.toLowerCase()),
  );

  const recordColumns: TableColumn<SFRecord>[] = [
    {
      key: 'check', header: '', width: '40px',
      render: (row) => (
        <input type='checkbox' checked={draftSelected.has(row.Id)}
          onChange={() => toggleDraft(row.Id)} onClick={(e) => e.stopPropagation()}
          className='w-4 h-4 accent-blue-600 cursor-pointer rounded' />
      ),
    },
    { key: 'Id',               header: 'ID',            render: (row) => <span className='text-xs font-mono text-gray-500'>{row.Id}</span> },
    { key: 'LastModifiedDate', header: 'Last Modified', render: (row) => <span className='text-sm text-gray-500'>{new Date(row.LastModifiedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span> },
  ];

  return (
    <>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='px-5 py-3 border-b border-gray-100 flex items-center justify-between'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>◉ Select Records</Typography>
          {totalSelected > 0 && (
            <span className='text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700'>
              {addedObjs.length} object{addedObjs.length !== 1 ? 's' : ''} · {totalSelected} record{totalSelected !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className='px-4 py-2.5 border-b border-gray-100 flex items-start gap-2 bg-blue-50' style={{ borderBottom: '1px solid #BFDBFE' }}>
          <svg className='mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
          </svg>
          <p className='text-[11px] text-blue-800 leading-relaxed'>
            <span className='font-semibold'>Note:</span> Only records from <span className='font-semibold'>compressed jobs</span> are listed here. Records from jobs that have not yet completed compression are not yet queryable and will not appear — this does <span className='font-semibold'>not</span> affect your restore job.
          </p>
        </div>
        <div className='px-4 py-2.5 border-b border-gray-100 bg-gray-50'>
          <div className='relative max-w-xs'>
            <svg className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
              <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
            </svg>
            <input value={objSearch} onChange={(e) => setObjSearch(e.target.value)} placeholder='Search objects…'
              className='h-8 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-700 outline-none focus:border-blue-400 transition' />
          </div>
        </div>

        {sourceObjectsLoading ? (
          <div className='flex items-center justify-center py-10 gap-2 text-xs text-gray-400'>
            <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />Loading objects…
          </div>
        ) : sourceObjectNames.length === 0 ? (
          <p className='text-xs text-gray-400 py-8 text-center'>No objects found.</p>
        ) : (
          <div className='divide-y divide-gray-50' style={{ maxHeight: 600, overflowY: 'auto' }}>
            {sourceObjectNames
              .filter((n) => n.toLowerCase().includes(objSearch.toLowerCase()))
              .map((name) => {
                const isTicked  = addedObjs.includes(name);
                const recCount  = selectedByObj[name]?.size ?? 0;
                const isEmpty   = emptyObjs.has(name);
                return (
                  <div key={name} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isTicked ? (isEmpty ? 'bg-amber-50/60' : 'bg-blue-50/40') : 'bg-white hover:bg-gray-50'}`}>
                    <input type='checkbox' checked={isTicked}
                      onChange={() => isTicked ? removeObj(name) : addObj(name)}
                      className='w-4 h-4 accent-blue-600 cursor-pointer rounded flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <span className={`text-sm font-mono truncate block ${isTicked ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{name}</span>
                      {isTicked && isEmpty && (
                        <span className='text-[10px] text-amber-700 leading-tight'>No records available — uncheck to remove</span>
                      )}
                    </div>
                    {isTicked && !isEmpty && (
                      <button onClick={() => openModal(name)}
                        className='flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors border-blue-300 text-blue-600 hover:bg-blue-50'>
                        {recCount > 0 ? `${recCount} record${recCount !== 1 ? 's' : ''} ✎` : 'Select Records →'}
                      </button>
                    )}
                    {isTicked && isEmpty && (
                      <button onClick={() => removeObj(name)}
                        className='flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors border-amber-300 text-amber-700 hover:bg-amber-100'>
                        Remove ✕
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        <div className='px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400'>
          Showing {sourceObjectNames.filter((n) => n.toLowerCase().includes(objSearch.toLowerCase())).length} of {sourceObjectNames.length} objects · {addedObjs.length} selected
        </div>

        {totalSelected > 0 && (
          <div className='border-t border-gray-100 px-5 py-3 space-y-1'>
            <p className='text-xs font-semibold text-gray-500 mb-1.5'>Selection summary</p>
            {addedObjs.map((obj) => {
              const count = selectedByObj[obj]?.size ?? 0;
              return count > 0 ? (
                <div key={obj} className='flex items-center justify-between text-xs'>
                  <span className='font-mono text-gray-700'>{obj}</span>
                  <span className='font-semibold text-blue-600'>{count} record{count !== 1 ? 's' : ''}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Record Picker Modal */}
      {modalObj && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden'
            style={{ width: 720, maxHeight: '88vh', border: '1px solid #E2E8F0' }}
            onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0'>
              <div>
                <h2 className='text-base font-bold text-gray-900 font-mono'>{modalObj}</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Select the records to restore for this object</p>
              </div>
              <button onClick={closeModal} className='p-1.5 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
                </svg>
              </button>
            </div>
            <div className='px-6 py-3 border-b border-gray-100 flex-shrink-0'>
              <div className='relative'>
                <svg className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                  <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                </svg>
                <input value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder={`Search ${modalObj} records by name or ID…`}
                  className='w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
                  autoFocus />
              </div>
            </div>
            <div className='flex-1 min-h-0 overflow-y-auto'>
              {isLoadingRecords ? (
                <div className='flex items-center justify-center py-12 gap-2 text-sm text-gray-400'>
                  <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
                  Loading {modalObj} records…
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 px-6 gap-3 text-center'>
                  {recordSearch ? (
                    <p className='text-sm text-gray-400'>No records match your search.</p>
                  ) : (
                    <>
                      <div className='w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0'>
                        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#D97706' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                          <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
                        </svg>
                      </div>
                      <div>
                        <p className='text-sm font-semibold text-gray-700'>No records available for <span className='font-mono'>{modalObj}</span></p>
                        <p className='text-xs text-gray-500 mt-1 leading-relaxed'>This object has no records in the selected backup/archive. Close this dialog and <span className='font-semibold'>uncheck the object</span> to continue.</p>
                      </div>
                      <button onClick={() => { closeModal(); if (modalObj) removeObj(modalObj); }} className='mt-1 px-4 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors'>
                        Close &amp; Remove Object
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <Table columns={recordColumns} rows={filteredRecords} getRowKey={(r) => r.Id}
                  borderless headerVariant='uppercase' cellPaddingClassName='px-6 py-3'
                  rowClassName={(row) => `border-b border-gray-50 transition-colors cursor-pointer ${draftSelected.has(row.Id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onRowClick={(row) => toggleDraft(row.Id)} />
              )}
              {hasMore && (
                <div className='px-6 py-3'>
                  <button onClick={() => setCursor(nextCursor)} disabled={isFetchingMore}
                    className='w-full py-2.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50'>
                    {isFetchingMore ? 'Loading…' : `Load more ${modalObj} records`}
                  </button>
                </div>
              )}
            </div>
            <div className='flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between'>
              <span className='text-xs text-gray-500'>
                {draftSelected.size > 0
                  ? <span className='font-semibold text-blue-600'>{draftSelected.size} record{draftSelected.size !== 1 ? 's' : ''} selected</span>
                  : 'No records selected'}
              </span>
              <div className='flex items-center gap-3'>
                <button onClick={closeModal} className='px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>Cancel</button>
                <button onClick={saveModal} className='px-6 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'>Save Selection</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
