import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { useArchivalService } from '../../../../services/archival/archival.service';
import { useDebounce } from '../../../../hooks/useDebounce';
import FilterPopup from './FilterPopup';
import type { FilterCondition } from './FilterPopup';

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
  archivalPayload?: {
    name: string;
    condition: { type: 'AND' | 'OR' };
    field: { name: string; filter: { value: string; operator: string } }[];
  };
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

function ToggleSwitch({ on, disabled, onChange }: { on: boolean; disabled: boolean; onChange: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className='relative inline-flex items-center flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none'
      style={{ width: 36, height: 20, background: on ? '#155DFC' : '#CBD5E1', opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span
        className='inline-block rounded-full bg-white shadow transition-transform duration-200'
        style={{ width: 14, height: 14, transform: on ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

export default function AddArchiveStep3({ crmId, initialSelectedObjects = [], onNext, onBack }: Step3Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();
  const archivalService = useArchivalService();

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

  const clearAll = () => {
    setSelectedObjects(new Set());
    setIncludeChild({});
    setExpandedObjectId(null);
  };

  // Filter popup state
  const [filterPopup, setFilterPopup] = useState<{ objectId: string; objectName: string; recordCount?: number } | null>(null);
  const [objectFilters, setObjectFilters] = useState<Record<string, FilterCondition[]>>({});

  // Inline preview state
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);
  const [childPage, setChildPage] = useState(0);
  const CHILD_PAGE_SIZE = 5;

  // Include child toggle state — auto-on when object is selected
  const [includeChild, setIncludeChild] = useState<Record<string, boolean>>({});

  const toggleIncludeChild = (objectId: string) => {
    setIncludeChild((prev) => {
      const next = { ...prev, [objectId]: !prev[objectId] };
      if (!next[objectId]) setExpandedObjectId((cur) => cur === objectId ? null : cur);
      return next;
    });
  };

  // Selected child objects (keyed by childObjectApiName)
  const [selectedChildObjects, setSelectedChildObjects] = useState<Set<string>>(new Set());
  const toggleChildObject = (key: string) => {
    setSelectedChildObjects((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Child objects query — fires when a row is expanded
  const { data: childObjectsData, isLoading: isLoadingChilds } = useQuery({
    queryKey: ['archival-object-childs', crmId, expandedObjectId],
    queryFn: async () => {
      const result = await archivalService.getObjectChilds(crmId ?? '', expandedObjectId ?? '');
      const payload = (result as any)?.data ?? result;
      const arr = (payload as any)?.childs ?? (payload as any)?.children ?? (payload as any)?.childObjects ?? payload;
      return Array.isArray(arr) ? arr : [];
    },
    enabled: !!crmId && !!expandedObjectId,
    staleTime: 5 * 60 * 1000,
  });
  const childRows: any[] = childObjectsData ?? [];

  useEffect(() => {
    if (childRows.length === 0) return;
    const masterDetailKeys = childRows
      .filter((r: any) => r.relationshipType === 'MasterDetail')
      .map((r: any) => r.childObjectApiName ?? r.id);
    if (masterDetailKeys.length === 0) return;
    setSelectedChildObjects((prev) => {
      const next = new Set(prev);
      masterDetailKeys.forEach((k: string) => next.add(k));
      return next;
    });
  }, [childObjectsData]);

  const togglePreview = (objectId: string) => {
    setExpandedObjectId((cur) => {
      if (cur !== objectId) setChildPage(0);
      return cur === objectId ? null : objectId;
    });
  };

  const handleNext = () => {
    const result: SelectedArchiveObject[] = Array.from(selectedObjects).map((id) => {
      const obj = allObjects.find((o) => o.id === id);
      const conditions = objectFilters[id] ?? [];
      const matchType = conditions.length > 0 ? 'AND' : 'AND';
      return {
        id,
        type: obj?.isCustom ? 'CUSTOM' : 'STANDARD',
        archivalPayload: {
          name: obj?.name ?? id,
          condition: { type: matchType as 'AND' | 'OR' },
          field: conditions
            .filter((c) => c.field)
            .map((c) => ({
              name: c.field,
              filter: { value: c.value, operator: c.operator },
            })),
        },
      };
    });
    onNext?.(result);
  };

  const getDataSize = (recordCount?: number) => {
    if (!recordCount) return '--';
    const kb = recordCount * 2;
    if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
  };

  return (
    <>
    {filterPopup && (
      <FilterPopup
        objectId={filterPopup.objectId}
        objectName={filterPopup.objectName}
        recordCount={filterPopup.recordCount}
        crmId={crmId}
        initialConditions={objectFilters[filterPopup.objectId] ?? []}
        onApply={(objectId, conditions) => {
          setObjectFilters((prev) => ({ ...prev, [objectId]: conditions }));
          setFilterPopup(null);
        }}
        onClose={() => setFilterPopup(null)}
      />
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
                  <col style={{ width: 120 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 240 }} />
                </colgroup>
                <thead className='sticky top-0 z-10 bg-white'>
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <th className='px-3 py-3' />
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>S.No.</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Object</th>
                    <th className='px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Include Child</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Type</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Total Records</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Estimated Data Size</th>
                    <th className='px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayObjects.length > 0 ? displayObjects.map((obj) => {
                    const isSelected = selectedObjects.has(obj.id);
                    const isParent = !obj.parentObject && (obj.relatedObjects?.length ?? 0) > 0;
                    const isChild = !!obj.parentObject;

                    const isExpanded = expandedObjectId === obj.id;

                    return (
                      <React.Fragment key={obj.id}>
                      <tr key={obj.id}
                        className='transition-colors cursor-pointer'
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid #F1F5F9', background: isSelected ? 'rgba(21,93,252,0.03)' : 'white' }}
                        onClick={() => {
                          const next = new Set(selectedObjects);
                          if (isSelected) {
                            next.delete(obj.id);
                            setIncludeChild((p) => { const n = { ...p }; delete n[obj.id]; return n; });
                            setExpandedObjectId((cur) => cur === obj.id ? null : cur);
                          } else {
                            next.add(obj.id);
                            setIncludeChild((p) => ({ ...p, [obj.id]: true }));
                          }
                          setSelectedObjects(next);
                        }}>
                        <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                          <input type='checkbox' checked={isSelected}
                            onChange={() => {
                              const next = new Set(selectedObjects);
                              if (isSelected) {
                                next.delete(obj.id);
                                setIncludeChild((p) => { const n = { ...p }; delete n[obj.id]; return n; });
                                setExpandedObjectId((cur) => cur === obj.id ? null : cur);
                              } else {
                                next.add(obj.id);
                                setIncludeChild((p) => ({ ...p, [obj.id]: true }));
                              }
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
                            {isSelected && includeChild[obj.id] && (
                              <button
                                onClick={(e) => { e.stopPropagation(); togglePreview(obj.id); }}
                                className='ml-auto flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-gray-100'
                                style={{ color: '#94A3B8' }}
                                title='Preview records'
                              >
                                <svg
                                  width='13' height='13' viewBox='0 0 24 24' fill='none'
                                  stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
                                  style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                >
                                  <polyline points='6 9 12 15 18 9' />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className='px-3 py-3 text-center' onClick={(e) => e.stopPropagation()}>
                          <ToggleSwitch
                            on={!!includeChild[obj.id]}
                            disabled={!isSelected}
                            onChange={(e) => { e.stopPropagation(); if (isSelected) toggleIncludeChild(obj.id); }}
                          />
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
                        <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                          <div className='flex items-center justify-center gap-2'>
                            <button
                              disabled={!isSelected}
                              className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap'
                              style={{ border: '1px solid #E2E8F0', color: isSelected ? '#64748B' : '#CBD5E1', background: 'white', cursor: isSelected ? 'pointer' : 'not-allowed', opacity: isSelected ? 1 : 0.5 }}
                              onClick={(e) => { e.stopPropagation(); if (isSelected) setFilterPopup({ objectId: obj.id, objectName: obj.name, recordCount: obj.recordCount }); }}
                            >
                              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
                              </svg>
                              Add Filter
                            </button>
                            <button
                              disabled={!isSelected}
                              className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap'
                              style={{ border: '1px solid #E2E8F0', color: isSelected ? '#64748B' : '#CBD5E1', background: 'white', cursor: isSelected ? 'pointer' : 'not-allowed', opacity: isSelected ? 1 : 0.5 }}
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
                      {/* ── Child rows (tree view) ── */}
                      {isExpanded && (
                        isLoadingChilds ? (
                          <tr key={`${obj.id}-loading`}>
                            <td colSpan={8} className='py-3 pl-16' style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                              <div className='flex items-center gap-2 text-xs text-gray-400'>
                                <div className='animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full' />
                                Loading child records...
                              </div>
                            </td>
                          </tr>
                        ) : childRows.length === 0 ? (
                          <tr key={`${obj.id}-empty`}>
                            <td colSpan={8} className='py-3 pl-16 text-xs text-gray-400' style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                              No child records found.
                            </td>
                          </tr>
                        ) : (() => {
                          const totalChildPages = Math.ceil(childRows.length / CHILD_PAGE_SIZE);
                          const pagedRows = childRows.slice(childPage * CHILD_PAGE_SIZE, (childPage + 1) * CHILD_PAGE_SIZE);
                          return (
                            <>
                              {pagedRows.map((row: any, idx: number) => {
                                const childKey = row.childObjectApiName ?? row.id ?? String(idx);
                                const isChildSelected = selectedChildObjects.has(childKey);
                                return (
                                <tr key={childKey}
                                  className='hover:bg-blue-50/30 transition-colors'
                                  style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                                  <td className='px-3 py-2.5' />
                                  <td className='px-3 py-2.5' onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type='checkbox'
                                      checked={isChildSelected}
                                      onChange={() => toggleChildObject(childKey)}
                                      className='w-4 h-4 accent-blue-600 cursor-pointer'
                                    />
                                  </td>
                                  <td className='px-3 py-2.5'>
                                    <div className='flex items-center gap-2 min-w-0' style={{ paddingLeft: 20 }}>
                                      <span className='text-gray-300 flex-shrink-0' style={{ fontSize: 10 }}>└</span>
                                      <span className='text-sm text-gray-700 truncate'>{row.childObjectApiName ?? row.name ?? row.Name ?? '--'}</span>
                                      <span className='text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0'
                                        style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                                        {row.relationshipType ?? 'Child'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className='px-3 py-2.5' />
                                  <td className='px-3 py-2.5 text-xs' style={{ color: '#155DFC' }}>{row.objectType ?? row.type ?? 'Standard'}</td>
                                  <td className='px-3 py-2.5 text-xs text-gray-400'>--</td>
                                  <td className='px-3 py-2.5 text-xs text-gray-400'>--</td>
                                  <td className='px-3 py-2.5' onClick={(e) => e.stopPropagation()}>
                                    <div className='flex items-center justify-center'>
                                      <button
                                        disabled={!isChildSelected}
                                        className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap'
                                        style={{ border: '1px solid #E2E8F0', color: isChildSelected ? '#64748B' : '#CBD5E1', background: 'white', cursor: isChildSelected ? 'pointer' : 'not-allowed', opacity: isChildSelected ? 1 : 0.5 }}
                                        onClick={(e) => { e.stopPropagation(); if (isChildSelected) setFilterPopup({ objectId: childKey, objectName: row.childObjectApiName ?? row.name ?? row.Name ?? '', recordCount: undefined }); }}
                                      >
                                        <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                          <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
                                        </svg>
                                        Add Filter
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ); })}
                              {/* Child pagination row */}
                              <tr key={`${obj.id}-child-pagination`} style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                                <td colSpan={8} className='px-5 py-2'>
                                  <div className='flex items-center justify-between'>
                                    <span className='text-xs text-gray-400'>
                                      Showing {childPage * CHILD_PAGE_SIZE + 1}–{Math.min((childPage + 1) * CHILD_PAGE_SIZE, childRows.length)} of {childRows.length}
                                    </span>
                                    <div className='flex items-center gap-1'>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setChildPage((p) => Math.max(0, p - 1)); }}
                                        disabled={childPage === 0}
                                        className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>
                                        ‹
                                      </button>
                                      {(() => {
                                        const half = 2;
                                        let start = Math.max(0, childPage - half);
                                        let end = Math.min(totalChildPages - 1, start + 4);
                                        start = Math.max(0, end - 4);
                                        return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((i) => (
                                          <button key={i}
                                            onClick={(e) => { e.stopPropagation(); setChildPage(i); }}
                                            className='w-6 h-6 rounded-full text-xs font-medium transition-colors flex items-center justify-center'
                                            style={{ background: childPage === i ? '#155DFC' : 'transparent', color: childPage === i ? 'white' : '#64748B' }}>
                                            {i + 1}
                                          </button>
                                        ));
                                      })()}
                                      {totalChildPages > 5 && childPage < totalChildPages - 3 && <span className='text-gray-400 text-xs'>...</span>}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setChildPage((p) => Math.min(totalChildPages - 1, p + 1)); }}
                                        disabled={childPage >= totalChildPages - 1}
                                        className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>
                                        ›
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </>
                          );
                        })()
                      )}
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className='px-4 py-12 text-center text-sm text-gray-500'>
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
