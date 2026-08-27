import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../../../hooks/useDebounce';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';
import { parseSalesforceError } from '../../../../utils';
import { useCrmMetadataService } from '../../../../services/crm-metadata/crm-metadata.service';

type SelectedObject = {
  uuid: string;
  id: string;
  type: 'STANDARD' | 'CUSTOM';
  parentObjects?: { id: string; name: string }[];
};

type Step5Props = {
  onNext: (selectedObjects: SelectedObject[]) => void;
  onBack: () => void;
  entireDatasetSelected?: boolean;
  selectedObjectIds?: string[];
  initialSelectedObjects?: SelectedObject[];
  strategy?: 'realtime' | 'scheduled';
  onSelectionChange?: (selectedUuids: string[]) => void;
  displayObjects: BackupObject[];
  isLoadingObjects: boolean;
  objectsError: Error | null;
};

interface BackupObject {
  uuid: string;
  id: string;
  name: string;
  type: string;
  estimatedSize: string;
  recordCount?: number;
  dataSize?: string;
  isCustom: boolean;
  isBackedUp?: boolean;
  schedule?: 'realtime' | 'schedule' | null;
}

export default function Step5({ onNext, onBack, entireDatasetSelected: _entireDatasetSelected = false, selectedObjectIds: initialSelectedObjectIds = [], initialSelectedObjects = [], strategy = 'realtime', onSelectionChange, displayObjects, isLoadingObjects, objectsError }: Step5Props) {
  const navigate = useNavigate();
  const crmMetadataService = useCrmMetadataService();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 700);
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Panel state: which object's fields panel is open
  const [panelObjectId, setPanelObjectId] = useState<string | null>(null);
  const panelObject = displayObjects.find((o) => o.id === panelObjectId) ?? null;

  const maxSteps = strategy === 'realtime' ? 6 : 7;
  const allObjects = displayObjects;
  const isLoading = isLoadingObjects;
  const error = objectsError;

  // Tracks the last selected object (SF API name) to fire describe API once on selection
  const [lastSelectedSfName, setLastSelectedSfName] = useState<string | null>(null);
  const [describeFetchCount, setDescribeFetchCount] = useState(0);
  // Map of parent uuid -> auto-selected child uuids (master-detail)
  const [parentChildMap, setParentChildMap] = useState<Map<string, string[]>>(new Map());
  // Toast message (child labels for display)
  const [toast, setToast] = useState<{ objectName: string; children: string[] } | null>(null);

  // Flat set of all currently locked child uuids
  const autoSelectedIds = useMemo(() => {
    const locked = new Set<string>();
    parentChildMap.forEach((children) => children.forEach((c) => locked.add(c)));
    return locked;
  }, [parentChildMap]);

  const { data: describeData, isFetching: isDescribeFetching } = useQuery({
    queryKey: ['crm-object-describe', lastSelectedSfName, 'normal', strategy, describeFetchCount],
    queryFn: () => crmMetadataService.getObjectDescribe(lastSelectedSfName!, 'normal', strategy === 'realtime' ? 'realtime' : 'schedule'),
    enabled: !!lastSelectedSfName,
  });

  // When describe data arrives, auto-select master-detail children and show toast
  useEffect(() => {
    if (!describeData?.data || !lastSelectedSfName) return;
    const d = describeData.data as { children?: { name: string; cascadeDelete: boolean; restrictedDelete: boolean }[] };
    const childSfNames = (d.children ?? [])
      .filter((c) => c.cascadeDelete === true || c.restrictedDelete === true)
      .map((c) => c.name);
    if (childSfNames.length === 0) return;

    // Map SF API names -> uuids via displayObjects
    const childUuids = childSfNames
      .map((sfName) => displayObjects.find((o) => o.id === sfName)?.uuid)
      .filter((u): u is string => !!u);
    const childLabels = childSfNames
      .map((sfName) => displayObjects.find((o) => o.id === sfName)?.name ?? sfName);

    const parentObj = displayObjects.find((o) => o.id === lastSelectedSfName);
    const parentUuid = parentObj?.uuid ?? lastSelectedSfName;

    setParentChildMap((prev) => new Map(prev).set(parentUuid, childUuids));
    setSelectedObjects((prev) => new Set([...prev, ...childUuids]));
    setToast({ objectName: parentObj?.name ?? lastSelectedSfName, children: childLabels });

    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [describeData, lastSelectedSfName]);

  // Filter + paginate
  const allFilteredObjects = useMemo(() => {
    return allObjects.filter((obj) => {
      const matchesSearch = (obj.name ?? '').toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      if (selectedFilter === 'Standard') return matchesSearch && !obj.isCustom;
      if (selectedFilter === 'Custom') return matchesSearch && obj.isCustom;
      return matchesSearch;
    });
  }, [debouncedSearchQuery, selectedFilter, allObjects]);

  const totalRecords = allFilteredObjects.length;
  const offset = currentPage * ITEMS_PER_PAGE;
  const filteredObjects = allFilteredObjects.slice(offset, offset + ITEMS_PER_PAGE);

  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const autoSelectedRef = useRef(false);
  const initialSyncDone = useRef(false);
  // Stable refs so effects don't re-run on every parent render
  const initialSelectedRef = useRef(initialSelectedObjectIds);
  const initialSelectedObjectsRef = useRef(initialSelectedObjects);

  // Once displayObjects loads, resolve SF API names → fresh uuids and rebuild parentChildMap
  useEffect(() => {
    if (initialSyncDone.current || allObjects.length === 0) return;
    const sfNames = initialSelectedRef.current;
    if (sfNames.length === 0) return;

    const resolvedUuids = sfNames
      .map((sfName) => allObjects.find((o) => o.id === sfName)?.uuid)
      .filter((u): u is string => !!u);
    if (resolvedUuids.length === 0) return;

    setSelectedObjects(new Set(resolvedUuids));

    // Rebuild parentChildMap: for each child that has parentObjects, map parent uuid -> child uuids
    const newMap = new Map<string, string[]>();
    initialSelectedObjectsRef.current.forEach((sel) => {
      if (!sel.parentObjects?.length) return;
      const childUuid = allObjects.find((o) => o.id === sel.id)?.uuid;
      if (!childUuid) return;
      sel.parentObjects.forEach((parent) => {
        const parentUuid = allObjects.find((o) => o.id === parent.name)?.uuid;
        if (!parentUuid) return;
        const existing = newMap.get(parentUuid) ?? [];
        newMap.set(parentUuid, [...existing, childUuid]);
      });
    });
    if (newMap.size > 0) setParentChildMap(newMap);

    initialSyncDone.current = true;
  }, [allObjects]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedObjects));
  }, [selectedObjects]);

  // Auto-select all if entire dataset selected — only once
  useEffect(() => {
    if (_entireDatasetSelected && allObjects.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedObjects(new Set(allObjects.map((obj) => obj.uuid)));
    }
  }, [_entireDatasetSelected, allObjects]);

  // Reset to first page on search/filter change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchQuery, selectedFilter]);


  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>

      {/* Master-detail toast */}
      {toast && (
        <div className='fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[480px] max-w-[90vw] rounded-2xl shadow-2xl overflow-hidden'
          style={{ border: '1px solid rgba(21,93,252,0.2)' }}>
          <div className='flex items-start gap-3 px-4 py-3.5 bg-white'>
            <div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5' style={{ background: 'rgba(21,93,252,0.1)' }}>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='5' r='2' /><circle cx='5' cy='19' r='2' /><circle cx='19' cy='19' r='2' />
                <line x1='12' y1='7' x2='5' y2='17' /><line x1='12' y1='7' x2='19' y2='17' />
              </svg>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold text-gray-900'>Master-Detail relationships detected</p>
              <p className='text-xs text-gray-500 mt-0.5 leading-relaxed'>
                <span className='font-medium text-blue-600'>{toast.children.join(', ')}</span> are in a Master-Detail relationship with <span className='font-medium'>{toast.objectName}</span> and will be automatically backed up.
              </p>
            </div>
            <button onClick={() => setToast(null)} className='flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>
          {/* Auto-dismiss progress bar */}
          <div className='h-0.5 bg-blue-600' style={{ animation: 'shrink 6s linear forwards' }} />
          <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
        </div>
      )}
      {/* Header */}
      <div className='flex items-start justify-between px-8 py-4 flex-shrink-0'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Data Scope</h1>
          <p className='text-sm text-gray-600 mt-1'>Select the objects that you want to back up in the scheduled backup.</p>
        </div>
        <span className='text-xs font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 5 of {maxSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className='flex flex-1 min-h-0 mx-6 mb-4 overflow-hidden'>

        {/* Table card */}
        <div className='bg-white rounded-xl flex flex-col min-h-0 overflow-hidden flex-1'
          style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {/* Toolbar */}
          <div className='flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0'>
            <div className='relative flex-shrink-0' style={{ width: 200 }}>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
              </span>
              <input
                type='text'
                placeholder='Search Objects'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30'
                style={{ border: '1px solid #E2E8F0' }}
              />
            </div>

            <div className='flex rounded-lg overflow-hidden flex-shrink-0' style={{ border: '1px solid #E2E8F0' }}>
              {(['All', 'Custom', 'Standard'] as const).map((f) => (
                <button key={f} onClick={() => setSelectedFilter(f)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${selectedFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {f}
                </button>
              ))}
            </div>

            <div className='flex-1' />

            <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm flex-shrink-0'
              style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC' }}>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='20 6 9 17 4 12' />
              </svg>
              <span className='font-medium'>{selectedObjects.size} objects selected</span>
            </div>

            <button
              onClick={() => setSelectedObjects(new Set())}
              className='flex-shrink-0 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors'>
              Clear All
            </button>
          </div>

          {/* Table */}
          {(() => {
            const columns: TableColumn<BackupObject>[] = [
              {
                key: 'name',
                header: 'Object',
                render: (obj) => <span className='text-sm font-medium text-gray-800'>{obj.name}</span>,
              },
              {
                key: 'type',
                header: 'Type',
                render: (obj) => <span className='text-xs font-medium text-blue-600'>{obj.isCustom ? 'Custom' : 'Standard'}</span>,
              },
              {
                key: 'records',
                header: 'Records',
                render: (obj) => <span className='text-sm text-gray-600'>{obj.recordCount !== undefined ? obj.recordCount.toLocaleString() : '--'}</span>,
              },
              {
                key: 'dataSize',
                header: 'Estimated Data Size',
                render: (obj) => {
                  const rc = obj.recordCount;
                  if (rc === undefined) return <span className='text-sm text-gray-600'>--</span>;
                  if (rc === 0) return <span className='text-sm text-gray-600'>0 KB</span>;
                  const kb = rc * 2;
                  const size = kb >= 1024 * 1024
                    ? `${(kb / (1024 * 1024)).toFixed(2)} GB`
                    : kb >= 1024
                      ? `${(kb / 1024).toFixed(2)} MB`
                      : `${kb} KB`;
                  return <span className='text-sm text-gray-600'>{size}</span>;
                },
              },
            ];

            return (
              <div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
                {error ? (
                  <div className='mx-5 my-4 rounded-xl bg-red-50 border border-red-200 px-4 py-4 flex items-start gap-3'>
                    <svg className='h-5 w-5 shrink-0 text-red-500 mt-0.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                    </svg>
                    <div>
                      <p className='text-sm font-semibold text-red-700'>{parseSalesforceError(error).title}</p>
                      <p className='text-sm text-red-600 mt-0.5'>{parseSalesforceError(error).detail}</p>
                    </div>
                  </div>
                ) : (
                  <Table<BackupObject>
                    columns={columns}
                    rows={filteredObjects}
                    getRowKey={(obj) => obj.uuid}
                    loading={isLoading}
                    skeletonConfig={{ rows: 8, colWidths: ['w-40', 'w-16', 'w-20', 'w-24', 'w-20'] }}
                    headerVariant='uppercase'
                    borderless
                    cellPaddingClassName='px-3 py-2.5'
                    showSerialNumber
                    serialNumberStart={currentPage * ITEMS_PER_PAGE + 1}
                    showCheckbox
                    hideSelectAll
                    selectedIds={selectedObjects}
                    getRowId={(obj) => obj.uuid}
                    onSelectionChange={(newSelected) => {
                      const addedUuid = [...newSelected].find((uuid) => !selectedObjects.has(uuid));
                      if (addedUuid) {
                        const sfName = displayObjects.find((o) => o.uuid === addedUuid)?.id ?? null;
                        setLastSelectedSfName(sfName);
                        setDescribeFetchCount((c) => c + 1);
                      }

                      // Detect removed parents and unselect their locked children
                      const removedParents = [...parentChildMap.keys()].filter((pid) => !newSelected.has(pid));
                      if (removedParents.length > 0) {
                        const toRemove = new Set<string>();
                        const updatedMap = new Map(parentChildMap);
                        removedParents.forEach((pid) => {
                          (parentChildMap.get(pid) ?? []).forEach((c) => {
                            // Only remove child if no other remaining parent also owns it
                            const stillOwnedByOther = [...updatedMap.entries()]
                              .filter(([k]) => k !== pid)
                              .some(([, v]) => v.includes(c));
                            if (!stillOwnedByOther) toRemove.add(c);
                          });
                          updatedMap.delete(pid);
                        });
                        setParentChildMap(updatedMap);
                        setSelectedObjects(new Set([...newSelected].filter((id) => !toRemove.has(id))));
                      } else {
                        setSelectedObjects(newSelected);
                      }
                    }}
                    isRowSelectable={(obj) => !autoSelectedIds.has(obj.uuid)}
                    getRowClassName={(obj, isSelected) =>
                      `border-b border-gray-100 transition-colors ${autoSelectedIds.has(obj.uuid) ? 'bg-blue-50/40 opacity-70 cursor-not-allowed' : `cursor-pointer ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`}`
                    }
                    emptyState='No objects found matching your search.'
                    paginationConfig={{
                      type: 'cursor',
                      hasPrev: currentPage > 0,
                      hasNext: offset + ITEMS_PER_PAGE < totalRecords,
                      onPrev: () => setCurrentPage((p) => p - 1),
                      onNext: () => setCurrentPage((p) => p + 1),
                      labelNode: (
                        <span className='flex items-center gap-1.5 text-sm text-gray-600'>
                          Showing {totalRecords === 0 ? 0 : offset + 1}–{Math.min(offset + ITEMS_PER_PAGE, totalRecords)} of {totalRecords}
                        </span>
                      ),
                    }}
                  />
                )}
              </div>
            );
          })()}
        </div>

      </div>

      {/* Relationships modal */}
      {panelObjectId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center' style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setPanelObjectId(null)}>
          <div className='bg-white rounded-2xl flex flex-col overflow-hidden w-[520px] max-h-[75vh]'
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0'>
              <div className='flex items-center gap-3 min-w-0'>
                <div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0' style={{ background: 'rgba(21,93,252,0.1)' }}>
                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='5' r='2' /><circle cx='5' cy='19' r='2' /><circle cx='19' cy='19' r='2' />
                    <line x1='12' y1='7' x2='5' y2='17' /><line x1='12' y1='7' x2='19' y2='17' />
                  </svg>
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-gray-900 truncate'>{panelObject?.name ?? panelObjectId}</p>
                  <p className='text-xs text-gray-400 mt-0.5'>Object relationships</p>
                </div>
              </div>
              <button
                onClick={() => setPanelObjectId(null)}
                className='ml-3 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'
              >
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className='flex-1 overflow-y-auto px-5 py-4'>
              {false ? (
                <div className='flex flex-col gap-3'>
                  <div className='h-4 w-24 bg-gray-100 rounded animate-pulse' />
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className='h-10 bg-gray-100 rounded-xl animate-pulse' />)}
                  <div className='h-4 w-24 bg-gray-100 rounded animate-pulse mt-2' />
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className='h-10 bg-gray-100 rounded-xl animate-pulse' />)}
                </div>
              ) : describeData?.data ? (() => {
                const d = describeData.data as {
                  children?: { name: string; restrictedDelete: boolean; cascadeDelete: boolean }[];
                  parent?: { name: string; nillable: boolean; cascadeDelete: boolean }[];
                };
                const children = d.children ?? [];
                const parents = d.parent ?? [];

                const ObjectPill = ({ name, cascadeDelete, restrictedDelete, nillable, variant }: { name: string; restrictedDelete?: boolean; cascadeDelete?: boolean; nillable?: boolean; variant: 'child' | 'parent' }) => (
                  <div className='flex items-center gap-3 px-3 py-2.5 rounded-xl border'
                    style={variant === 'child'
                      ? { background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }
                      : { background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.2)' }}>
                    <div className='w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0'
                      style={{ background: variant === 'child' ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)' }}>
                      <svg width='11' height='11' viewBox='0 0 24 24' fill='none'
                        stroke={variant === 'child' ? '#10B981' : '#8B5CF6'}
                        strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                        {variant === 'child'
                          ? <><polyline points='6 9 12 15 18 9' /></>
                          : <><polyline points='18 15 12 9 6 15' /></>}
                      </svg>
                    </div>
                    <span className='text-sm font-medium text-gray-800'>{name}</span>
                    <span className='ml-auto text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0'
                      style={variant === 'child'
                        ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                        : { background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}>
                      {variant === 'child'
                        ? (!cascadeDelete && !restrictedDelete ? 'Lookup' : cascadeDelete && restrictedDelete ? 'Master Detail' : cascadeDelete ? 'Master Detail' : restrictedDelete ? 'Lookup Required' : 'Child' )
                        : (cascadeDelete && nillable ? 'Master Detail' : cascadeDelete ? 'Master Detail' : nillable ? 'Lookup' : !cascadeDelete && !nillable ? 'Lookup Required' : 'Parent' )}
                    </span>
                  </div>
                );

                return (
                  <div className='flex flex-col gap-5'>
                    {/* Info banner */}
                    <div className='flex items-start gap-2 rounded-xl px-3 py-2.5' style={{ background: 'rgba(21,93,252,0.05)', border: '1px solid rgba(21,93,252,0.12)' }}>
                      <svg className='mt-0.5 flex-shrink-0' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                      </svg>
                      <p className='text-xs text-blue-700 leading-relaxed'>
                        All related objects below will be <span className='font-semibold'>automatically included</span> in the backup when <span className='font-semibold'>{panelObject?.name ?? panelObjectId}</span> is selected.
                      </p>
                    </div>

                    {/* Children */}
                    {children.length > 0 && (
                      <div className='flex flex-col gap-2'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Child Objects</span>
                          <span className='text-xs font-semibold px-1.5 py-0.5 rounded-full' style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>{children.length}</span>
                        </div>
                        <div className='flex flex-col gap-1.5'>
                          {children.map((c) => <ObjectPill key={c.name} name={c.name} restrictedDelete={c.restrictedDelete} cascadeDelete={c.cascadeDelete} variant='child' />)}
                        </div>
                      </div>
                    )}

                    {/* Parents */}
                    {parents.length > 0 && (
                      <div className='flex flex-col gap-2'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Parent Objects</span>
                          <span className='text-xs font-semibold px-1.5 py-0.5 rounded-full' style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED' }}>{parents.length}</span>
                        </div>
                        <div className='flex flex-col gap-1.5'>
                          {parents.map((p) => <ObjectPill key={p.name} name={p.name} nillable={p.nillable} cascadeDelete={p.cascadeDelete} variant='parent' />)}
                        </div>
                      </div>
                    )}

                    {children.length === 0 && parents.length === 0 && (
                      <div className='flex flex-col items-center justify-center py-10 text-center'>
                        <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#CBD5E1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                          <circle cx='12' cy='5' r='2' /><circle cx='5' cy='19' r='2' /><circle cx='19' cy='19' r='2' />
                          <line x1='12' y1='7' x2='5' y2='17' /><line x1='12' y1='7' x2='19' y2='17' />
                        </svg>
                        <p className='text-sm text-gray-400 mt-3'>No relationships found for this object.</p>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className='flex flex-col items-center justify-center py-10 text-center'>
                  <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#CBD5E1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                  </svg>
                  <p className='text-sm text-gray-400 mt-3'>No relationship data available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex-shrink-0 flex justify-between items-center px-8 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/backup-management')}
          disabled={isDescribeFetching}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        >
          Cancel
        </button>

        {/* Fetching indicator */}
        {isDescribeFetching && (
          <div className='flex items-center gap-2 text-sm text-blue-600'>
            <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24' fill='none'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z' />
            </svg>
            <span className='font-medium'>Analysing relationships…</span>
          </div>
        )}

        <div className='flex gap-4'>
          <button
            onClick={onBack}
            disabled={isDescribeFetching}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            ← Back
          </button>
          <button
            onClick={() => {
              // Build reverse map: child uuid -> list of parent objects
              const childToParents = new Map<string, { id: string; name: string }[]>();
              parentChildMap.forEach((childUuids, parentUuid) => {
                const parentObj = allObjects.find((o) => o.uuid === parentUuid);
                if (!parentObj) return;
                childUuids.forEach((childUuid) => {
                  const existing = childToParents.get(childUuid) ?? [];
                  childToParents.set(childUuid, [...existing, { id: parentObj.uuid, name: parentObj.name }]);
                });
              });

              const selectedObjectsData = Array.from(selectedObjects).map((uuid) => {
                const obj = allObjects.find((o) => o.uuid === uuid);
                const type: 'STANDARD' | 'CUSTOM' = obj?.isCustom ? 'CUSTOM' : 'STANDARD';
                const parentObjects = childToParents.get(uuid);
                return { uuid, id: obj?.id ?? uuid, type, ...(parentObjects ? { parentObjects } : {}) };
              });
              onNext(selectedObjectsData);
            }}
            disabled={selectedObjects.size === 0 || isDescribeFetching}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedObjects.size > 0 && !isDescribeFetching
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
