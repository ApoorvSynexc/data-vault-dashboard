import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { useArchivalService } from '../../../../services/archival/archival.service';
import { useDebounce } from '../../../../hooks/useDebounce';
import FilterPopup from './FilterPopup';
import type { FilterCondition } from './FilterPopup';
import SchedulePopup from './SchedulePopup';
import type { ScheduleConfig } from './SchedulePopup';
import ProgressBar from '../ProgressBar';
import { parseSalesforceError } from '../../../../utils';

export type ArchivalCondition =
  | { type: 'AND' | 'OR' }
  | { type: 'CUSTOM'; expression: string }
  | { type: 'SOQL'; soqlQuery: string };

export type SelectedArchiveObject = {
  uuid: string;
  id: string;
  name: string;
  type: 'STANDARD' | 'CUSTOM';
  scheduleConfig?: import('./SchedulePopup').ScheduleConfig;
  archivalPayload?: {
    name: string;
    condition: ArchivalCondition;
    field: { name: string; filter: { value: string; operator: string } }[];
    children?: any[];
  };
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

const OPERATOR_MAP: Record<string, string> = {
  'equals': '=', 'not equals': '!=', 'contains': 'LIKE',
  'does not contain': 'LIKE', 'starts with': 'LIKE',
  'greater than': '>', 'less than': '<',
  'greater than or equal': '>=', 'less than or equal': '<=',
  'in': 'IN',
};
const MAX_CHILD_DEPTH = 4;
const CHILD_PAGE_SIZE = 5;

interface ChildRowsProps {
  crmId: string;
  objectName: string;
  parentUuid: string;
  depth: number;
  selectedChildObjects: Set<string>;
  toggleChildObject: (key: string) => void;
  registerChildApiName: (uuid: string, apiName: string) => void;
  registerChildFieldApiName: (uuid: string, fieldApiName: string) => void;
  registerChildParent: (childUuid: string, parentUuid: string) => void;
  includeChild: Record<string, boolean>;
  setIncludeChild: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

function ChildRows({ crmId, objectName, parentUuid, depth, selectedChildObjects, toggleChildObject, registerChildApiName, registerChildFieldApiName, registerChildParent, includeChild, setIncludeChild }: ChildRowsProps) {
  const archivalService = useArchivalService();
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['archival-object-childs', crmId, parentUuid, objectName],
    queryFn: () => archivalService.getObjectChilds(crmId, objectName),
    enabled: !!crmId && !!objectName,
    staleTime: 5 * 60 * 1000,
  });

  const rawRows: any[] = data ?? [];

  // Register uuid→apiName and uuid→parentUuid when data arrives; auto-select MasterDetail children once
  const autoSelectedRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!data || rawRows.length === 0) return;
    rawRows.forEach((r: any) => {
      registerChildApiName(r.uuid as string, r.apiName as string);
      registerChildFieldApiName(r.uuid as string, r.fieldApiName as string);
      registerChildParent(r.uuid as string, parentUuid);
    });
    const toSelect = rawRows
      .filter((r: any) => r.relationshipType === 'MasterDetail')
      .map((r: any) => r.uuid as string)
      .filter((k: string) => k && !autoSelectedRef.current.has(k));
    if (toSelect.length === 0) return;
    toSelect.forEach((k: string) => { autoSelectedRef.current.add(k); });
    setSelectedChildObjects_safe(toSelect);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, parentUuid, registerChildApiName, registerChildParent]);

  // Selected rows float to top, rest follow in original order
  const rows = React.useMemo(() => [
    ...rawRows.filter((r: any) => selectedChildObjects.has(r.uuid as string)),
    ...rawRows.filter((r: any) => !selectedChildObjects.has(r.uuid as string)),
  ], [rawRows, selectedChildObjects]);

  // Reset page when object changes
  useEffect(() => { setPage(0); }, [objectName]);

  // Stable setter that doesn't need toggleChildObject in deps
  const setSelectedChildObjects_safe = (keys: string[]) => {
    keys.forEach((key) => toggleChildObject(key));
  };

  if (isLoading) return (
    <tr>
      <td colSpan={7} style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', paddingLeft: depth * 20 + 16, paddingTop: 8, paddingBottom: 8 }}>
        <div className='flex items-center gap-2 text-xs text-gray-400'>
          <div className='animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full' />
          Loading...
        </div>
      </td>
    </tr>
  );

  if (rows.length === 0) return null;

  const totalPages = Math.ceil(rows.length / CHILD_PAGE_SIZE);
  const pagedRows = rows.slice(page * CHILD_PAGE_SIZE, (page + 1) * CHILD_PAGE_SIZE);

  return (
    <>
      {pagedRows.map((row: any) => {
        const childKey = row.uuid as string;
        const isChildSelected = selectedChildObjects.has(childKey);
        const isChildExpanded = expandedChild === childKey;
        const toggleOn = !!includeChild[childKey];
        const canExpand = depth < MAX_CHILD_DEPTH && isChildSelected && toggleOn;

        const handleToggle = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (!isChildSelected) return;
          setIncludeChild((p) => {
            const next: Record<string, boolean> = { ...p, [childKey]: !p[childKey] };
            if (!next[childKey]) setExpandedChild((c) => c === childKey ? null : c);
            return next;
          });
        };

        const handleCheckbox = () => {
          toggleChildObject(childKey);
          if (!isChildSelected) {
            // selecting — auto-on toggle
            setIncludeChild((p) => ({ ...p, [childKey]: true }));
          } else {
            // deselecting — off toggle and collapse
            setIncludeChild((p) => { const n = { ...p }; delete n[childKey]; return n; });
            setExpandedChild((c) => c === childKey ? null : c);
          }
        };

        // Level color palette matches Depth badge: Level 2=purple, Level 3=amber, Level 4=green, Level 5=teal, Level 6+=rose
        const levelColors: Record<number, string> = { 1: '#7C3AED', 2: '#A16207', 3: '#008020', 4: '#0891B2', 5: '#E11D48' };
        const accentColor = levelColors[depth] ?? '#E11D48';
        const rowBg = isChildSelected
          ? `${accentColor}08`
          : depth === 1 ? '#FAFBFC' : depth === 2 ? '#F4F6F8' : '#EFF2F5';

        return (
          <React.Fragment key={childKey}>
            <tr className='transition-all duration-150 group'
              style={{ background: rowBg, borderBottom: isChildExpanded && canExpand ? 'none' : '1px solid #E8EDF2' }}>
              {/* left accent stripe — thicker for selected */}
              <td style={{
                borderLeft: `${isChildSelected ? 4 : 3}px solid ${isChildSelected ? accentColor : accentColor + '60'}`,
                paddingLeft: 8,
                paddingTop: 0, paddingBottom: 0,
                transition: 'border-color 0.15s',
              }} />
              {/* checkbox */}
              <td className='px-3 py-2' onClick={(e) => e.stopPropagation()}>
                <div style={{ paddingLeft: depth * 20 }}>
                  <input type='checkbox' checked={isChildSelected} onChange={handleCheckbox}
                    className='w-4 h-4 accent-blue-600 cursor-pointer' />
                </div>
              </td>
              {/* Object col */}
              <td className='px-3 py-2'>
                <div className='flex items-center gap-1.5 min-w-0' style={{ paddingLeft: depth * 20 }}>
                  {/* tree connector */}
                  <span className='flex-shrink-0 select-none' style={{ color: accentColor + '90', fontSize: 13, fontFamily: 'monospace', lineHeight: 1 }}>└</span>
                  <span className='flex-shrink-0 select-none' style={{ color: accentColor + '60', fontSize: 11, fontFamily: 'monospace', lineHeight: 1, marginLeft: -2 }}>──</span>
                  <span className={`text-sm truncate ${isChildSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {row.relationshipName ?? row.label ?? row.apiName ?? row.name ?? '--'}
                  </span>
                  {row.relationshipType && (
                    <span className='flex-shrink-0 text-xs px-1.5 py-0.5 rounded-md font-medium'
                      style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                      {row.relationshipType}
                    </span>
                  )}
                  {canExpand && (
                    <button onClick={(e) => { e.stopPropagation(); setExpandedChild((c) => c === childKey ? null : childKey); }}
                      className='ml-auto flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-all hover:scale-110'
                      style={{ color: accentColor, background: `${accentColor}15` }}>
                      <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
                        style={{ transition: 'transform 0.2s', transform: isChildExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <polyline points='6 9 12 15 18 9' />
                      </svg>
                    </button>
                  )}
                </div>
              </td>
              {/* Include Child toggle */}
              <td className='px-3 py-2 text-center' onClick={(e) => e.stopPropagation()}>
                <ToggleSwitch on={toggleOn} disabled={!isChildSelected} onChange={handleToggle} />
              </td>
              {/* Depth */}
              <td className='px-3 py-2'>
                {(() => {
                  const levelColorMap: Record<number, string> = { 1: '#7C3AED', 2: '#A16207', 3: '#008020', 4: '#0891B2', 5: '#E11D48' };
                  const color = levelColorMap[depth] ?? '#E11D48';
                  return (
                    <span className='inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold'
                      style={{ whiteSpace: 'pre', background: `${color}14`, color }}>
                      Level {depth + 1}
                    </span>
                  );
                })()}
              </td>
              {/* Type */}
              <td className='px-3 py-2'>
                <span className='text-xs font-medium px-2 py-0.5 rounded-md'
                  style={{ background: '#F1F5F9', color: '#64748B' }}>
                  {row.objectType ?? row.type ?? 'Standard'}
                </span>
              </td>
              {/* Actions */}
              <td className='px-3 py-2' />
            </tr>
            {/* Recursive children */}
            {isChildExpanded && (
              <ChildRows
                crmId={crmId}
                objectName={row.apiName as string}
                parentUuid={childKey}
                depth={depth + 1}
                selectedChildObjects={selectedChildObjects}
                toggleChildObject={toggleChildObject}
                registerChildApiName={registerChildApiName}
                registerChildFieldApiName={registerChildFieldApiName}
                registerChildParent={registerChildParent}
                includeChild={includeChild}
                setIncludeChild={setIncludeChild}
              />
            )}
          </React.Fragment>
        );
      })}
      {/* Pagination */}
      {totalPages > 1 && (
        <tr style={{ background: depth === 1 ? '#FAFBFC' : depth === 2 ? '#F4F6F8' : '#EFF2F5', borderBottom: '1px solid #E8EDF2', borderLeft: `3px solid ${['#155DFC','#7C3AED','#0891B2','#059669','#D97706'][(depth-1)%5]}40` }}>
          <td colSpan={7} className='px-4 py-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-gray-400'>
                Showing {page * CHILD_PAGE_SIZE + 1}–{Math.min((page + 1) * CHILD_PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              <div className='flex items-center gap-1'>
                <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(0, p - 1)); }}
                  disabled={page === 0}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>‹</button>
                {(() => {
                  let start = Math.max(0, page - 2);
                  const end = Math.min(totalPages - 1, start + 4);
                  start = Math.max(0, end - 4);
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((i) => (
                    <button key={i}
                      onClick={(e) => { e.stopPropagation(); setPage(i); }}
                      className='w-6 h-6 rounded-full text-xs font-medium transition-colors flex items-center justify-center'
                      style={{ background: page === i ? '#155DFC' : 'transparent', color: page === i ? 'white' : '#64748B' }}>
                      {i + 1}
                    </button>
                  ));
                })()}
                <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages - 1, p + 1)); }}
                  disabled={page >= totalPages - 1}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>›</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

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

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 700);
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(
    new Set(initialSelectedObjects.map((o) => o.uuid ?? o.id))
  );

  const [objectFilters, setObjectFilters] = useState<Record<string, FilterCondition[]>>(() => {
    const toConditions = (
      fields: { name: string; filter: { value: string; operator: string } }[]
    ): FilterCondition[] =>
      fields.map((f) => ({
        id: crypto.randomUUID(),
        field: f.name,
        dataType: null,
        operator: f.filter.operator,
        value: f.filter.value,
      }));

    const filters: Record<string, FilterCondition[]> = {};
    initialSelectedObjects.forEach((o) => {
      const key = o.uuid ?? o.id;
      if (o.archivalPayload?.field?.length) filters[key] = toConditions(o.archivalPayload.field);
    });
    return filters;
  });

  const [objectSoqlQueries, setObjectSoqlQueries] = useState<Record<string, string>>(() => {
    const queries: Record<string, string> = {};
    initialSelectedObjects.forEach((o) => {
      const key = o.uuid ?? o.id;
      const cond = o.archivalPayload?.condition;
      if (cond?.type === 'SOQL') queries[key] = cond.soqlQuery;
    });
    return queries;
  });

  const [objectMatchModes, setObjectMatchModes] = useState<Record<string, ArchivalCondition>>(() => {
    const modes: Record<string, ArchivalCondition> = {};
    initialSelectedObjects.forEach((o) => {
      const key = o.uuid ?? o.id;
      modes[key] = o.archivalPayload?.condition ?? { type: 'AND' };
    });
    return modes;
  });

  const { data: allObjectsData, isLoading: isLoadingObjects, error } = useQuery({
    queryKey: ['archive-objects-all', crmId],
    queryFn: async () => {
      const response = await backupConfigService.getObjectList(crmId ?? '', 'SCHEDULE');
      // Stable uuid per object: prefer server uuid, then reuse from initialSelectedObjects by id, then generate once
      return (response as any[]).map((obj: any) => {
        const existing = initialSelectedObjects.find((o) => o.id === (obj.id ?? obj.apiName));
        return {
          ...obj,
          uuid: obj.uuid ?? existing?.uuid ?? crypto.randomUUID(),
        };
      });
    },
    enabled: !!crmId,
    staleTime: Infinity,
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
  const displayObjects = currentPageObjects;

  const isLoading = isLoadingObjects;

  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, selectedFilter]);

  const totalSelected = selectedObjects.size;
  const clearAll = () => {
    setSelectedObjects(new Set());
    setIncludeChild({});
    setExpandedObjectId(null);
  };

  // Filter popup state
  const [filterPopup, setFilterPopup] = useState<{ objectId: string; objectName: string; recordCount?: number; isParent: boolean } | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [schedulePopup, setSchedulePopup] = useState<{ objectId: string; objectName: string } | null>(null);
  const [objectSchedules, setObjectSchedules] = useState<Record<string, ScheduleConfig>>(() => {
    const schedules: Record<string, ScheduleConfig> = {};
    initialSelectedObjects.forEach((o) => {
      if (o.scheduleConfig) schedules[o.uuid ?? o.id] = o.scheduleConfig;
    });
    return schedules;
  });

  // Inline expand state for top-level objects
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);

  // Restore child state from initialSelectedObjects — computed once as a ref so it's available for useState initialisers below
  const restoredChildState = React.useRef((() => {
    const selectedUuids = new Set<string>();
    const apiNames: Record<string, string> = {};
    const fieldApiNames: Record<string, string> = {};
    const parents: Record<string, string> = {};
    const childInclude: Record<string, boolean> = {};
    initialSelectedObjects.forEach((_o) => { /* no children to restore */ });
    return { selectedUuids, apiNames, fieldApiNames, parents, childInclude };
  })()).current;

  // Include child toggle state — auto-on when object is selected; restore from initial selection
  const [includeChild, setIncludeChild] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { ...restoredChildState.childInclude };
    initialSelectedObjects.forEach((o) => { init[o.uuid ?? o.id] = true; });
    return init;
  });

  const toggleIncludeChild = (objectId: string) => {
    setIncludeChild((prev) => {
      const next: Record<string, boolean> = { ...prev, [objectId]: !prev[objectId] };
      if (!next[objectId]) setExpandedObjectId((cur) => cur === objectId ? null : cur);
      return next;
    });
  };

  // Selected child objects shared across all tree levels
  const [selectedChildObjects, setSelectedChildObjects] = useState<Set<string>>(restoredChildState.selectedUuids);
  const toggleChildObject = (key: string) => {
    setSelectedChildObjects((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // uuid → apiName registry, populated by ChildRows on data load
  const [childApiNames, setChildApiNames] = useState<Record<string, string>>(restoredChildState.apiNames);
  const registerChildApiName = useCallback((uuid: string, apiName: string) => {
    setChildApiNames((prev) => prev[uuid] === apiName ? prev : { ...prev, [uuid]: apiName });
  }, []);

  // uuid → fieldApiName registry, populated by ChildRows on data load
  const [childFieldApiNames, setChildFieldApiNames] = useState<Record<string, string>>(restoredChildState.fieldApiNames);
  const registerChildFieldApiName = useCallback((uuid: string, fieldApiName: string) => {
    setChildFieldApiNames((prev) => prev[uuid] === fieldApiName ? prev : { ...prev, [uuid]: fieldApiName });
  }, []);

  // uuid → parentUuid registry, for building nested tree in payload
  const [childParents, setChildParents] = useState<Record<string, string>>(restoredChildState.parents);
  const registerChildParent = useCallback((childUuid: string, parentUuid: string) => {
    setChildParents((prev) => prev[childUuid] === parentUuid ? prev : { ...prev, [childUuid]: parentUuid });
  }, []);


  const togglePreview = (objectId: string) => {
    setExpandedObjectId((cur) => cur === objectId ? null : objectId);
  };


  const buildChildTree = (parentUuid: string): any[] =>
    Array.from(selectedChildObjects)
      .filter((uuid) => childParents[uuid] === parentUuid)
      .map((uuid) => {
        const nestedChildren = buildChildTree(uuid);
        return {
          id: uuid,
          name: childApiNames[uuid] ?? uuid,
          fieldApiName: childFieldApiNames[uuid] ?? undefined,
          type: 'STANDARD' as const,
          condition: { type: 'AND' as const },
          field: [],
          ...(nestedChildren.length > 0 ? { children: nestedChildren } : {}),
        };
      });

  const handleNext = () => {
    const missingParent = Array.from(selectedObjects).find(
      (uuid) => !objectSoqlQueries[uuid] && !(objectFilters[uuid]?.some((c) => c.field))
    );
    if (missingParent) {
      setFilterError('All selected objects must have at least one filter or SOQL query applied before proceeding.');
      return;
    }
    setFilterError(null);
    const result: SelectedArchiveObject[] = Array.from(selectedObjects).map((uuid) => {
      const obj = allObjects.find((o) => o.uuid === uuid) ?? allObjects.find((o) => o.id === uuid);
      const conditions = objectFilters[uuid] ?? [];
      const children = buildChildTree(uuid);
      const schedule = objectSchedules[uuid];
      return {
        uuid,
        id: obj?.id ?? uuid,
        name: obj?.name ?? obj?.id ?? uuid,
        type: obj?.isCustom ? 'CUSTOM' : 'STANDARD',
        ...(schedule ? { scheduleConfig: schedule } : {}),
        archivalPayload: {
          name: obj?.name ?? obj?.id ?? uuid,
          condition: objectMatchModes[uuid] ?? { type: 'AND' as const },
          field: conditions
            .filter((c) => c.field)
            .map((c) => ({
              name: c.field,
              filter: { value: c.value, operator: OPERATOR_MAP[c.operator] ?? c.operator },
            })),
          children,
        },
      };
    });

    onNext?.(result);
  };


  return (
    <>
    {filterPopup && (
      <FilterPopup
        objectId={filterPopup.objectId}
        objectName={filterPopup.objectName}
        recordCount={filterPopup.recordCount}
        crmId={crmId}
        isParent={filterPopup.isParent}
        initialConditions={objectFilters[filterPopup.objectId] ?? []}
        initialSoqlQuery={objectSoqlQueries[filterPopup.objectId] ?? ''}
        onApply={(objectId, conditions, matchMode, customLogic, soqlQuery) => {
          if (soqlQuery !== undefined) {
            setObjectSoqlQueries((prev) => ({ ...prev, [objectId]: soqlQuery }));
            setObjectFilters((prev) => { const next = { ...prev }; delete next[objectId]; return next; });
            setObjectMatchModes((prev) => ({ ...prev, [objectId]: { type: 'SOQL', soqlQuery } }));
          } else {
            setObjectFilters((prev) => ({ ...prev, [objectId]: conditions }));
            setObjectSoqlQueries((prev) => { const next = { ...prev }; delete next[objectId]; return next; });
            let cond: ArchivalCondition;
            if (matchMode === 'ANY condition') cond = { type: 'OR' };
            else if (matchMode === 'Custom') cond = { type: 'CUSTOM', expression: customLogic };
            else cond = { type: 'AND' };
            setObjectMatchModes((prev) => ({ ...prev, [objectId]: cond }));
          }
          setFilterPopup(null);
        }}
        onClose={() => setFilterPopup(null)}
      />
    )}
    {schedulePopup && (
      <SchedulePopup
        objectName={schedulePopup.objectName}
        onApply={(config) => {
          const objectId = schedulePopup.objectId;
          setObjectSchedules((prev) => ({ ...prev, [objectId]: config }));
          setSchedulePopup(null);
        }}
        onClose={() => setSchedulePopup(null)}
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
        <ProgressBar activeStep={3} />

        {/* Header */}
        <div className='flex items-start justify-between flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Select Objects</h1>
            <p className='text-gray-600 mt-1'>Choose objects to be archive</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step <span className='text-blue-600'>3</span> of 6
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
              <span className='font-medium'>{totalSelected} object selected</span>
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
              <div className='mx-5 my-4 rounded-xl bg-red-50 border border-red-200 px-4 py-4 flex items-start gap-3'>
                <svg className='h-5 w-5 shrink-0 text-red-500 mt-0.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                </svg>
                <div>
                  <p className='text-sm font-semibold text-red-700'>{parseSalesforceError(error).title}</p>
                  <p className='text-sm text-red-600 mt-0.5'>{parseSalesforceError(error).detail}</p>
                </div>
              </div>
            ) : (
              <table className='w-full border-collapse table-fixed'>
                <colgroup>
                  <col style={{ width: 44 }} />   {/* checkbox */}
                  <col style={{ width: 56 }} />   {/* S.No */}
                  <col />                          {/* Object — flex */}
                  <col style={{ width: 130 }} />  {/* Include Child */}
                  <col style={{ width: 100 }} />  {/* Depth */}
                  <col style={{ width: 120 }} />  {/* Type */}
                  {/* <col style={{ width: 110 }} /> */}{/* Total Records */}
                  {/* <col style={{ width: 100 }} /> */}{/* Estimated Data Size */}
                  <col style={{ width: 220 }} />  {/* Actions */}
                </colgroup>
                <thead className='sticky top-0 z-10 bg-white'>
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <th className='px-3 py-3' />
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>S.No.</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Object</th>
                    <th className='px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Include Child</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Depth</th>
                    <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Type</th>
                    {/* <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Total Records</th> */}
                    {/* <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Estimated Data Size</th> */}
                    <th className='px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayObjects.length > 0 ? displayObjects.map((obj) => {
                    const isSelected = selectedObjects.has(obj.uuid);
                    const isParent = !obj.parentObject && (obj.relatedObjects?.length ?? 0) > 0;
                    const isChild = !!obj.parentObject;

                    const isExpanded = expandedObjectId === obj.uuid;

                    return (
                      <React.Fragment key={obj.uuid}>
                      <tr key={obj.uuid}
                        className='transition-all cursor-pointer'
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #F1F5F9',
                          background: isSelected ? 'rgba(21,93,252,0.04)' : 'white',
                          borderLeft: isExpanded ? '3px solid #155DFC' : '3px solid transparent',
                        }}
                        onClick={() => {
                          const next = new Set(selectedObjects);
                          if (isSelected) {
                            next.delete(obj.uuid);
                            setIncludeChild((p) => { const n = { ...p }; delete n[obj.uuid]; return n; });
                            setExpandedObjectId((cur) => cur === obj.uuid ? null : cur);
                          } else {
                            next.add(obj.uuid);
                            setIncludeChild((p) => ({ ...p, [obj.uuid]: true }));
                          }
                          setSelectedObjects(next);
                        }}>
                        <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                          <input type='checkbox' checked={isSelected}
                            onChange={() => {
                              const next = new Set(selectedObjects);
                              if (isSelected) {
                                next.delete(obj.uuid);
                                setIncludeChild((p) => { const n = { ...p }; delete n[obj.uuid]; return n; });
                                setExpandedObjectId((cur) => cur === obj.uuid ? null : cur);
                              } else {
                                next.add(obj.uuid);
                                setIncludeChild((p) => ({ ...p, [obj.uuid]: true }));
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
                            {isSelected && includeChild[obj.uuid] && (
                              <button
                                onClick={(e) => { e.stopPropagation(); togglePreview(obj.uuid); }}
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
                            on={!!includeChild[obj.uuid]}
                            disabled={!isSelected}
                            onChange={(e) => { e.stopPropagation(); if (isSelected) toggleIncludeChild(obj.uuid); }}
                          />
                        </td>
                        <td className='px-3 py-3'>
                          <span className='inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold'
                            style={{ whiteSpace: 'pre', background: 'rgba(21,93,252,0.08)', color: '#155DFC' }}>
                            Level 1
                          </span>
                        </td>
                        <td className='px-3 py-3 text-sm' style={{ color: '#155DFC' }}>
                          {obj.isCustom ? 'Custom' : 'Standard'}
                        </td>
                        {/* <td className='px-3 py-3 text-sm text-gray-700 tabular-nums'>
                          {obj.recordCount !== undefined ? obj.recordCount.toLocaleString() : '--'}
                        </td> */}
                        {/* <td className='px-3 py-3 text-sm text-gray-700'>
                          {getDataSize(obj.recordCount)}
                        </td> */}
                        <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                          <div className='flex items-center justify-center gap-2'>
                            {(() => {
                              const hasFilter = isSelected && ((objectFilters[obj.uuid]?.some((c) => c.field) ?? false) || !!objectSoqlQueries[obj.uuid]);
                              return (
                                <button
                                  disabled={!isSelected}
                                  className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap'
                                  style={{
                                    border: `1px solid ${!isSelected ? '#E2E8F0' : hasFilter ? '#155DFC' : '#E2E8F0'}`,
                                    color: !isSelected ? '#CBD5E1' : hasFilter ? '#fff' : '#64748B',
                                    background: !isSelected ? 'white' : hasFilter ? '#155DFC' : 'white',
                                    cursor: isSelected ? 'pointer' : 'not-allowed',
                                    opacity: isSelected ? 1 : 0.5,
                                  }}
                                  onClick={(e) => { e.stopPropagation(); if (isSelected) setFilterPopup({ objectId: obj.uuid, objectName: obj.id, recordCount: obj.recordCount, isParent: true }); }}
                                >
                                  <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                    <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
                                  </svg>
                                  {hasFilter ? 'Filter Applied' : 'Add Filter'}
                                </button>
                              );
                            })()}
                            {(() => {
                              const hasSchedule = isSelected && !!objectSchedules[obj.uuid];
                              return (
                                <button
                                  disabled={!isSelected}
                                  className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap'
                                  style={{
                                    border: `1px solid ${!isSelected ? '#E2E8F0' : hasSchedule ? '#155DFC' : '#E2E8F0'}`,
                                    color: !isSelected ? '#CBD5E1' : hasSchedule ? '#fff' : '#64748B',
                                    background: !isSelected ? 'white' : hasSchedule ? '#155DFC' : 'white',
                                    cursor: isSelected ? 'pointer' : 'not-allowed',
                                    opacity: isSelected ? 1 : 0.5,
                                  }}
                                  onClick={(e) => { e.stopPropagation(); if (isSelected) setSchedulePopup({ objectId: obj.uuid, objectName: obj.id }); }}
                                >
                                  <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                    <rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' />
                                  </svg>
                                  {hasSchedule ? 'Edit Schedule' : 'Add Schedule'}
                                </button>
                              );
                            })()}
                          </div>
                        </td>

                      </tr>
                      {/* ── Child rows (recursive tree) ── */}
                      {isExpanded && (
                        <ChildRows
                          crmId={crmId ?? ''}
                          objectName={obj.id}
                          parentUuid={obj.uuid}
                          depth={1}
                          selectedChildObjects={selectedChildObjects}
                          toggleChildObject={toggleChildObject}
                          registerChildApiName={registerChildApiName}
                          registerChildFieldApiName={registerChildFieldApiName}
                          registerChildParent={registerChildParent}
                          includeChild={includeChild}
                          setIncludeChild={setIncludeChild}
                        />
                      )}
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} className='px-4 py-12 text-center text-sm text-gray-500'>
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
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>‹</button>
                {(() => {
                  const maxVis = 5;
                  const halfVis = Math.floor(maxVis / 2);
                  const pages: (number | string)[] = [];
                  if (totalPages <= maxVis) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage + 1 > halfVis + 1) pages.push('...');
                    const start = Math.max(2, currentPage + 1 - halfVis);
                    const end = Math.min(totalPages - 1, currentPage + 1 + halfVis);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (currentPage + 1 < totalPages - halfVis - 1) pages.push('...');
                    if (!pages.includes(totalPages)) pages.push(totalPages);
                  }
                  return pages.map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className='px-1 text-gray-400 text-xs'>...</span>
                    ) : (
                      <button key={p as number} onClick={() => setCurrentPage((p as number) - 1)}
                        className='w-7 h-7 rounded-full text-xs font-medium transition-colors flex items-center justify-center'
                        style={{
                          background: currentPage === (p as number) - 1 ? '#155DFC' : 'white',
                          color: currentPage === (p as number) - 1 ? 'white' : '#64748B',
                          border: currentPage === (p as number) - 1 ? 'none' : '1px solid #E2E8F0',
                        }}>
                        {p}
                      </button>
                    )
                  );
                })()}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>›</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Sticky Footer */}
      <div className='flex-shrink-0 flex flex-col gap-2 px-6 py-4 bg-gray-50 border-t border-gray-200'>
        {filterError && (
          <div className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium'
            style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0'>
              <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
            </svg>
            {filterError}
          </div>
        )}
        <div className='flex justify-between gap-4'>
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
    </div>
    </>
  );
}
