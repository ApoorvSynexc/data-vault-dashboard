import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { useDebounce } from '../../../../hooks/useDebounce';

const STEPS = [
  { id: 1, label: 'Source & Destination', icon: (a: boolean) => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='21 8 21 21 3 21 3 8' /><rect x='1' y='3' width='22' height='5' /><line x1='10' y1='12' x2='14' y2='12' />
    </svg>
  )},
  { id: 2, label: 'Define Archive', icon: (a: boolean) => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='3' y='3' width='18' height='18' rx='2' /><line x1='3' y1='9' x2='21' y2='9' /><line x1='9' y1='21' x2='9' y2='9' />
    </svg>
  )},
  { id: 3, label: 'Data', icon: (a: boolean) => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
    </svg>
  )},
  { id: 4, label: 'Schedule', icon: (a: boolean) => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' />
    </svg>
  )},
  { id: 5, label: 'Review', icon: (a: boolean) => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><polyline points='14 2 14 8 20 8' />
    </svg>
  )},
];

const activeStep = 3;

function ProgressBar() {
  return (
    <div className='flex-shrink-0 bg-white rounded-2xl px-5 py-4 flex flex-col gap-3'
      style={{ border: '0.8px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className='flex items-center w-full'>
        {STEPS.map((step, idx) => {
          const isActive = step.id === activeStep;
          const isDone = step.id < activeStep;
          return (
            <div key={step.id} className='flex items-center flex-1 min-w-0'>
              <div className='flex items-center gap-2 min-w-0'>
                <div className='flex-shrink-0 flex items-center justify-center rounded-full'
                  style={{ width: 34, height: 34, background: isActive ? '#155DFC' : isDone ? '#155DFC' : '#F1F5F9' }}>
                  {isDone
                    ? <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>
                    : step.icon(isActive)
                  }
                </div>
                <span className='text-xs font-medium truncate' style={{ color: isActive ? '#33363F' : '#62748E' }}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className='flex-1 mx-2 h-px rounded-full' style={{ background: '#E2E8F0', minWidth: 12 }} />
              )}
            </div>
          );
        })}
      </div>
      <div className='w-full h-1.5 rounded-full' style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className='h-full rounded-full' style={{ background: '#155DFC', width: `${((activeStep - 1) / (STEPS.length - 1)) * 100}%` }} />
      </div>
    </div>
  );
}

export type SelectedArchiveObject = {
  id: string;
  type: 'STANDARD' | 'CUSTOM';
};

interface BackupObject {
  id: string;
  name: string;
  type: string;
  estimatedSize: string;
  recordCount?: number;
  dataSize?: string;
  isCustom: boolean;
  isBackedUp?: boolean;
  parentObject?: string;
  relatedObjects?: string[];
}

interface Step3Props {
  crmId?: string | null;
  initialSelectedObjects?: SelectedArchiveObject[];
  onNext?: (objects: SelectedArchiveObject[]) => void;
  onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

export default function AddArchiveStep3({ crmId, initialSelectedObjects = [], onNext, onBack }: Step3Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 700);
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(
    new Set(initialSelectedObjects.map((o) => o.id))
  );

  const { data: allObjectsData, isLoading: isLoadingObjects, error } = useQuery({
    queryKey: ['archive-objects-all', crmId],
    queryFn: async () => {
      const response = await backupConfigService.getObjectList(crmId ?? '', 'SCHEDULE');
      return response;
    },
    enabled: !!crmId,
  });

  const allObjects: BackupObject[] = (allObjectsData as any) ?? [];

  const allFiltered = useMemo(() => {
    return allObjects.filter((obj) => {
      const matchesSearch = obj.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      if (selectedFilter === 'Standard') return matchesSearch && !obj.isCustom;
      if (selectedFilter === 'Custom') return matchesSearch && obj.isCustom;
      return matchesSearch;
    });
  }, [debouncedSearch, selectedFilter, allObjects]);

  const totalRecords = allFiltered.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const offset = currentPage * ITEMS_PER_PAGE;
  const currentPageObjects = allFiltered.slice(offset, offset + ITEMS_PER_PAGE);
  const currentPageIds = currentPageObjects.map((o) => o.id);

  const { data: countResponse, isLoading: isLoadingCount } = useQuery({
    queryKey: ['archive-objects-count', crmId, currentPageIds],
    queryFn: async () => {
      if (currentPageIds.length === 0) return { objectCounts: {} };
      try {
        const response = await backupConfigService.getObjectCountList(crmId ?? '', currentPageIds);
        const objectCounts: Record<string, number> = {};
        const results = (response?.data as any)?.results;
        if (Array.isArray(results)) {
          results.forEach((obj: any) => {
            const key = obj.apiName ?? obj.objectApiName;
            if (key && obj.recordCount !== undefined) {
              objectCounts[key] = obj.recordCount;
            }
          });
        }
        return { objectCounts };
      } catch {
        return { objectCounts: {} };
      }
    },
    enabled: !!crmId && currentPageIds.length > 0,
  });

  const displayObjects = useMemo(() => {
    return currentPageObjects.map((obj) => ({
      ...obj,
      recordCount: countResponse?.objectCounts?.[obj.id] ?? undefined,
    }));
  }, [currentPageObjects, countResponse?.objectCounts]);

  const isLoading = isLoadingObjects || isLoadingCount;

  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, selectedFilter]);

  const totalSelected = selectedObjects.size;
  const totalEstRecords = useMemo(() => {
    return Array.from(selectedObjects).reduce((sum, id) => {
      const obj = allObjects.find((o) => o.id === id);
      return sum + (obj?.recordCount ?? 0);
    }, 0);
  }, [selectedObjects, allObjects]);

  const allPageSelected = displayObjects.length > 0 && displayObjects.every((o) => selectedObjects.has(o.id));
  const somePageSelected = displayObjects.some((o) => selectedObjects.has(o.id));

  const toggleAll = () => {
    const next = new Set(selectedObjects);
    if (allPageSelected) {
      displayObjects.forEach((o) => next.delete(o.id));
    } else {
      displayObjects.forEach((o) => next.add(o.id));
    }
    setSelectedObjects(next);
  };

  const clearAll = () => setSelectedObjects(new Set());

  // Filter popup state
  const [filterPopup, setFilterPopup] = useState<{ objectId: string; objectName: string; recordCount?: number } | null>(null);

  const handleNext = () => {
    const result: SelectedArchiveObject[] = Array.from(selectedObjects).map((id) => {
      const obj = allObjects.find((o) => o.id === id);
      return { id, type: obj?.isCustom ? 'CUSTOM' : 'STANDARD' };
    });
    onNext?.(result);
  };

  // Per-object filter conditions (stored by objectId)
  type FilterCondition = { id: string; field: string; operator: string; value: string };
  const [objectFilters, setObjectFilters] = useState<Record<string, FilterCondition[]>>({});

  const addCondition = (objectId: string) => {
    setObjectFilters((prev) => ({
      ...prev,
      [objectId]: [...(prev[objectId] ?? []), { id: crypto.randomUUID(), field: '', operator: 'equals', value: '' }],
    }));
  };

  const removeCondition = (objectId: string, conditionId: string) => {
    setObjectFilters((prev) => ({
      ...prev,
      [objectId]: (prev[objectId] ?? []).filter((c) => c.id !== conditionId),
    }));
  };

  const updateCondition = (objectId: string, conditionId: string, patch: Partial<FilterCondition>) => {
    setObjectFilters((prev) => ({
      ...prev,
      [objectId]: (prev[objectId] ?? []).map((c) => c.id === conditionId ? { ...c, ...patch } : c),
    }));
  };

  const getDataSize = (recordCount?: number) => {
    if (!recordCount) return '--';
    const kb = recordCount * 2;
    if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  const conditions = filterPopup ? (objectFilters[filterPopup.objectId] ?? []) : [];

  return (
    <>
    {/* ── Filter Popup ── */}
    {filterPopup && (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30' onClick={() => setFilterPopup(null)}>
        <div className='bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden'
          style={{ width: 600, maxHeight: '80vh', border: '1px solid #E2E8F0' }}
          onClick={(e) => e.stopPropagation()}>

          {/* Popup header */}
          <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
            <div>
              <h2 className='text-base font-bold text-gray-900'>{filterPopup.objectName}</h2>
              <p className='text-xs text-gray-400 mt-0.5'>Define filter conditions for this object</p>
            </div>
            <button onClick={() => setFilterPopup(null)}
              className='p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>

          {/* Filter By tabs + est. records */}
          <div className='flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-shrink-0'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-gray-500 font-medium'>Filter By</span>
              <div className='flex rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
                {(['Field Level', 'SOQL'] as const).map((tab) => (
                  <button key={tab}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'Field Level' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            {filterPopup.recordCount !== undefined && (
              <span className='text-sm text-gray-500'>
                Est. <span className='font-semibold text-blue-600'>{filterPopup.recordCount.toLocaleString()}</span> records of {filterPopup.recordCount.toLocaleString()}
              </span>
            )}
          </div>

          {/* Match tabs */}
          <div className='flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-shrink-0'>
            <span className='text-sm text-gray-500 font-medium'>Match</span>
            <div className='flex rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
              {(['ALL conditions', 'ANY condition', 'Custom'] as const).map((tab) => (
                <button key={tab}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'ALL conditions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Conditions list */}
          <div className='flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 min-h-0'>
            {conditions.length === 0 ? (
              <div className='flex items-center gap-2 py-3 text-sm text-gray-500'>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                  <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
                </svg>
                No filter conditions — all{' '}
                <span className='font-semibold text-gray-800'>
                  {filterPopup.recordCount !== undefined ? filterPopup.recordCount.toLocaleString() : '—'}
                </span>{' '}
                {filterPopup.objectName} records will be archived.
              </div>
            ) : (
              conditions.map((cond, idx) => (
                <div key={cond.id} className='flex items-center gap-2'>
                  <span className='text-xs text-gray-400 w-6 text-right flex-shrink-0'>{idx + 1}</span>
                  <input
                    value={cond.field}
                    onChange={(e) => updateCondition(filterPopup.objectId, cond.id, { field: e.target.value })}
                    placeholder='Field'
                    className='flex-1 px-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30'
                    style={{ border: '1px solid #E2E8F0' }}
                  />
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(filterPopup.objectId, cond.id, { operator: e.target.value })}
                    className='px-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 bg-white'
                    style={{ border: '1px solid #E2E8F0' }}
                  >
                    {['equals', 'not equals', 'contains', 'greater than', 'less than', 'is null', 'is not null'].map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    value={cond.value}
                    onChange={(e) => updateCondition(filterPopup.objectId, cond.id, { value: e.target.value })}
                    placeholder='Value'
                    className='flex-1 px-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30'
                    style={{ border: '1px solid #E2E8F0' }}
                  />
                  <button onClick={() => removeCondition(filterPopup.objectId, cond.id)}
                    className='p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                </div>
              ))
            )}

            {/* Add condition */}
            <button
              onClick={() => addCondition(filterPopup.objectId)}
              className='flex items-center gap-1.5 mt-1 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors w-fit'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' />
              </svg>
              Add condition
            </button>
          </div>

          {/* Popup footer */}
          <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0'>
            <button onClick={() => setFilterPopup(null)}
              className='px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
              Cancel
            </button>
            <button onClick={() => setFilterPopup(null)}
              className='px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors'
              style={{ background: '#155DFC' }}>
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    )}
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-6 min-h-0 gap-4'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/archive-vault' className='font-semibold text-sm text-gray-700 hover:text-blue-600 transition-colors'>
            Archive Vault
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Archive</span>
        </div>

        {/* Progress bar */}
        <ProgressBar />

        {/* Header */}
        <div className='flex items-start justify-between flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Select Objects</h1>
            <p className='text-gray-600 mt-1'>Choose objects to be archive</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step <span className='text-blue-600'>3</span> of 5
          </span>
        </div>

        {/* Table card */}
        <div className='bg-white rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden'
          style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {/* Toolbar */}
          <div className='flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0'>
            {/* Search */}
            <div className='relative flex-shrink-0' style={{ width: 200 }}>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
              </span>
              <input
                type='text'
                placeholder='Search Object'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30'
                style={{ border: '1px solid #E2E8F0' }}
              />
            </div>

            {/* Type filter tabs */}
            <div className='flex rounded-lg overflow-hidden flex-shrink-0' style={{ border: '1px solid #E2E8F0' }}>
              {(['All', 'Custom', 'Standard'] as const).map((f) => (
                <button key={f} onClick={() => setSelectedFilter(f)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${selectedFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {f}
                </button>
              ))}
            </div>

            <div className='flex-1' />

            {/* Selected badge */}
            <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm flex-shrink-0'
              style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC' }}>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='20 6 9 17 4 12' />
              </svg>
              <span className='font-medium'>{totalSelected} object selected · {totalEstRecords > 0 ? `~${totalEstRecords.toLocaleString()}` : '0'} est. records</span>
            </div>

            {/* Clear */}
            <button onClick={clearAll} className='text-sm font-medium text-gray-500 hover:text-gray-700 flex-shrink-0'>
              Clear
            </button>
          </div>

          {/* Table */}
          <div className='flex-1 min-h-0 overflow-y-auto'>
            {isLoading ? (
              <div className='flex items-center justify-center py-16'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
              </div>
            ) : error ? (
              <div className='mx-5 my-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3'>
                <p className='text-sm font-semibold text-red-700'>Failed to load objects</p>
                <p className='text-sm text-red-600'>{(error as any)?.message || 'Something went wrong.'}</p>
              </div>
            ) : (
              <table className='w-full border-collapse table-fixed'>
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col style={{ width: 60 }} />
                  <col />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 240 }} />
                </colgroup>
                <thead className='sticky top-0 z-10 bg-white'>
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <th className='px-3 py-3'>
                      <input
                        type='checkbox'
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePageSelected && !allPageSelected;
                        }}
                        onChange={toggleAll}
                        className='w-4 h-4 accent-blue-600 cursor-pointer'
                      />
                    </th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>S.No.</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Object</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Type</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Records</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Data Size</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Filters</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Related</th>
                    <th className='px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayObjects.length > 0 ? displayObjects.map((obj) => {
                    const isSelected = selectedObjects.has(obj.id);
                    const isParent = !obj.parentObject && (obj.relatedObjects?.length ?? 0) > 0;
                    const isChild = !!obj.parentObject;

                    return (
                      <tr key={obj.id}
                        className='transition-colors cursor-pointer'
                        style={{ borderBottom: '1px solid #F1F5F9', background: isSelected ? 'rgba(21,93,252,0.03)' : 'white' }}
                        onClick={() => {
                          const next = new Set(selectedObjects);
                          isSelected ? next.delete(obj.id) : next.add(obj.id);
                          setSelectedObjects(next);
                        }}>
                        <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                          <input type='checkbox' checked={isSelected}
                            onChange={() => {
                              const next = new Set(selectedObjects);
                              isSelected ? next.delete(obj.id) : next.add(obj.id);
                              setSelectedObjects(next);
                            }}
                            className='w-4 h-4 accent-blue-600 cursor-pointer'
                          />
                        </td>
                        <td className='px-3 py-3 text-sm text-gray-400 tabular-nums'>
                          {offset + displayObjects.indexOf(obj) + 1}
                        </td>
                        <td className='px-3 py-3'>
                          <div className='flex items-center gap-2 min-w-0'>
                            {isChild && <span className='text-gray-300 text-xs flex-shrink-0'>•</span>}
                            <span className='text-sm font-semibold text-gray-900 truncate'>{obj.name}</span>
                            {isParent && (
                              <span className='text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0'
                                style={{ background: 'rgba(21,93,252,0.1)', color: '#155DFC' }}>
                                Parent
                              </span>
                            )}
                            {isChild && (
                              <span className='text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0'
                                style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                                Child of {obj.parentObject}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='px-3 py-3 text-sm' style={{ color: '#155DFC' }}>
                          {obj.isCustom ? 'Custom' : 'Standard'}
                        </td>
                        <td className='px-3 py-3 text-sm text-gray-700 tabular-nums'>
                          {obj.recordCount !== undefined ? obj.recordCount.toLocaleString() : '--'}
                        </td>
                        <td className='px-3 py-3 text-sm text-gray-700'>
                          {getDataSize(obj.recordCount)}
                        </td>
                        <td className='px-3 py-3 text-sm text-gray-400'>--</td>
                        <td className='px-3 py-3 text-sm text-gray-500 truncate'>
                          {obj.relatedObjects?.join(', ') || '--'}
                        </td>
                        <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                          <div className='flex items-center justify-center gap-2'>
                            <button
                              className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50 whitespace-nowrap'
                              style={{ border: '1px solid #E2E8F0', color: '#64748B', background: 'white' }}
                              onClick={(e) => { e.stopPropagation(); setFilterPopup({ objectId: obj.id, objectName: obj.name, recordCount: obj.recordCount }); }}
                            >
                              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
                              </svg>
                              Add Filter
                            </button>
                            <button
                              className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50 whitespace-nowrap'
                              style={{ border: '1px solid #E2E8F0', color: '#64748B', background: 'white' }}
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' />
                              </svg>
                              Add Schedule
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={9} className='px-4 py-12 text-center text-sm text-gray-500'>
                        No objects found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && !error && (
            <div className='flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0'>
              <span className='text-sm text-gray-500'>
                Showing {totalRecords > 0 ? offset + 1 : 0}–{Math.min(offset + ITEMS_PER_PAGE, totalRecords)} of {totalRecords} Objects
              </span>
              <div className='flex items-center gap-1'>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page - 1)}
                    className='w-7 h-7 rounded-full text-xs font-medium transition-colors flex items-center justify-center'
                    style={{
                      background: currentPage === page - 1 ? '#155DFC' : 'white',
                      color: currentPage === page - 1 ? 'white' : '#64748B',
                      border: currentPage === page - 1 ? 'none' : '1px solid #E2E8F0',
                    }}>
                    {page}
                  </button>
                ))}
                {totalPages > 5 && <span className='text-gray-400 text-xs px-1'>...</span>}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Sticky Footer */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/archive-vault')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-3'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={totalSelected === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${totalSelected > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
