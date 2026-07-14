import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import ProgressBar from '../ProgressBar';
import { parseSalesforceError } from '../../../../utils';
import AddDetailsWizard from './AddDetailsWizard';
import type { ObjectConfig } from './AddDetailsWizard';
import type { ScheduleConfig } from './SchedulePopup';
import type { ArchivalCondition, BuiltChildNode } from './types';

export type { ArchivalCondition };

export type SelectedArchiveObject = {
  uuid: string;
  id: string;
  name: string;
  type: 'STANDARD' | 'CUSTOM';
  scheduleConfig?: ScheduleConfig;
  archivalPayload?: {
    name: string;
    condition: ArchivalCondition;
    field: { name: string; dataType: string; filter: { value: string; operator: string } }[];
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

interface WizardTarget {
  objectId: string;
  objectName: string;
  objectLabel?: string;
  recordCount?: number;
  isParent: boolean;
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

export default function AddArchiveStep3({ crmId, initialSelectedObjects = [], onNext, onBack }: Step3Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(
    new Set(initialSelectedObjects.map((o) => o.uuid ?? o.id))
  );

  // Unified per-object config (replaces separate objectFilters/Soql/MatchMode/Schedules)
  const [objectConfigs, setObjectConfigs] = useState<Record<string, ObjectConfig>>(() => {
    const toConditions = (
      fields: { name: string; filter: { value: string; operator: string } }[]
    ) =>
      fields.map((f) => ({
        id: crypto.randomUUID(),
        field: f.name,
        dataType: null as any,
        operator: f.filter.operator,
        value: f.filter.value,
      }));

    const configs: Record<string, ObjectConfig> = {};
    initialSelectedObjects.forEach((o) => {
      const key = o.uuid ?? o.id;
      const cond = o.archivalPayload?.condition;
      configs[key] = {
        conditions: toConditions(o.archivalPayload?.field ?? []),
        matchMode: (cond?.type !== 'SOQL' ? cond : undefined) ?? { type: 'AND' },
        soqlQuery: cond?.type === 'SOQL' ? (cond as any).soqlQuery : undefined,
        builtChildren: (o.archivalPayload?.children as BuiltChildNode[] | undefined) ?? [],
        schedule: o.scheduleConfig,
      };
    });
    return configs;
  });

  // Wizard target — which object "Add Details" was clicked on
  const [wizardTarget, setWizardTarget] = useState<WizardTarget | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 700);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: allObjectsData, isLoading, error } = useQuery({
    queryKey: ['archive-objects-all', crmId],
    queryFn: async () => {
      const response = await backupConfigService.getObjectList(crmId ?? '', 'SCHEDULE');
      return (response as any[]).map((obj: any) => {
        const existing = initialSelectedObjects.find((o) => o.id === (obj.id ?? obj.apiName));
        return { ...obj, uuid: obj.uuid ?? existing?.uuid ?? crypto.randomUUID() };
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

  useEffect(() => { setCurrentPage(0); }, [debouncedSearch, selectedFilter]);

  const totalRecords = allFiltered.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
  const offset = currentPage * ITEMS_PER_PAGE;
  const displayObjects = allFiltered.slice(offset, offset + ITEMS_PER_PAGE);

  const totalSelected = selectedObjects.size;
  const clearAll = () => setSelectedObjects(new Set());

  const handleNext = () => {
    // Collect all object IDs already covered as built children of another selected object.
    // Those don't need their own independent config entry.
    const builtChildIds = new Set<string>();
    const collectBuiltChildIds = (node: any) => {
      if (node?.id) builtChildIds.add(node.id);
      for (const grandchild of node?.children ?? []) collectBuiltChildIds(grandchild);
    };
    for (const uuid of selectedObjects) {
      for (const child of objectConfigs[uuid]?.builtChildren ?? []) {
        collectBuiltChildIds(child);
      }
    }

    const missingConfig = Array.from(selectedObjects).find((uuid) => {
      // Skip objects that are already included as built children of a parent config.
      const obj = allObjects.find((o) => o.uuid === uuid);
      if (obj && (builtChildIds.has(obj.id) || builtChildIds.has(obj.uuid))) return false;

      const config = objectConfigs[uuid];
      return !config?.soqlQuery && !(config?.conditions?.some((c) => c.field));
    });
    if (missingConfig) {
      setFilterError('All selected objects must have at least one filter or SOQL query applied before proceeding.');
      return;
    }
    setFilterError(null);

    const result: SelectedArchiveObject[] = Array.from(selectedObjects).map((uuid) => {
      const obj = allObjects.find((o) => o.uuid === uuid) ?? allObjects.find((o) => o.id === uuid);
      const config = objectConfigs[uuid];
      const conditions = config?.conditions ?? [];

      return {
        uuid,
        id: obj?.id ?? uuid,
        name: obj?.name ?? obj?.id ?? uuid,
        type: obj?.isCustom ? 'CUSTOM' : 'STANDARD',
        ...(config?.schedule ? { scheduleConfig: config.schedule } : {}),
        archivalPayload: {
          name: obj?.name ?? obj?.id ?? uuid,
          condition: config?.soqlQuery
            ? { type: 'SOQL' as const, soqlQuery: config.soqlQuery }
            : config?.matchMode ?? { type: 'AND' as const },
          field: conditions
            .filter((c) => c.field)
            .map((c) => ({
              name: c.field,
              dataType: (c.dataType ?? 'string').toUpperCase(),
              filter: { value: c.value, operator: OPERATOR_MAP[c.operator] ?? c.operator },
            })),
          children: config?.builtChildren ?? [],
        },
      };
    });

    onNext?.(result);
  };

  return (
    <>
      {wizardTarget && (
        <AddDetailsWizard
          objectId={wizardTarget.objectId}
          objectName={wizardTarget.objectName}
          objectLabel={wizardTarget.objectLabel}
          recordCount={wizardTarget.recordCount}
          crmId={crmId}
          isParent={wizardTarget.isParent}
          initialConfig={objectConfigs[wizardTarget.objectId]}
          onSave={(config) => {
            setObjectConfigs((prev) => ({ ...prev, [wizardTarget.objectId]: config }));
            setWizardTarget(null);
          }}
          onClose={() => setWizardTarget(null)}
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
              <p className='text-gray-600 mt-1'>Choose objects to archive, then configure each one via <strong>Add Details</strong></p>
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
                <span className='font-medium'>{totalSelected} object selected</span>
              </div>

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
                    <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                  </svg>
                  <div>
                    <p className='text-sm font-semibold text-red-700'>{parseSalesforceError(error).title}</p>
                    <p className='text-sm text-red-600 mt-0.5'>{parseSalesforceError(error).detail}</p>
                  </div>
                </div>
              ) : (
                <table className='w-full border-collapse table-fixed'>
                  <colgroup>
                    <col style={{ width: 44 }} />
                    <col style={{ width: 56 }} />
                    <col />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 160 }} />
                  </colgroup>
                  <thead className='sticky top-0 z-10 bg-white'>
                    <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                      <th className='px-3 py-3' />
                      <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>S.No.</th>
                      <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Object</th>
                      <th className='px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Type</th>
                      <th className='px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayObjects.length > 0 ? displayObjects.map((obj) => {
                      const isSelected = selectedObjects.has(obj.uuid);
                      const isParent = !obj.parentObject && (obj.relatedObjects?.length ?? 0) > 0;
                      const isChild = !!obj.parentObject;
                      const config = objectConfigs[obj.uuid];
                      const hasConfig = isSelected && (
                        (config?.conditions?.some((c) => c.field)) ||
                        !!config?.soqlQuery ||
                        !!config?.schedule ||
                        (config?.builtChildren?.length ?? 0) > 0
                      );

                      return (
                        <tr key={obj.uuid}
                          className='transition-all cursor-pointer'
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: isSelected ? 'rgba(21,93,252,0.04)' : 'white',
                          }}
                          onClick={() => {
                            setSelectedObjects((prev) => {
                              const next = new Set(prev);
                              next.has(obj.uuid) ? next.delete(obj.uuid) : next.add(obj.uuid);
                              return next;
                            });
                          }}>
                          <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                            <input type='checkbox' checked={isSelected}
                              onChange={() => {
                                setSelectedObjects((prev) => {
                                  const next = new Set(prev);
                                  next.has(obj.uuid) ? next.delete(obj.uuid) : next.add(obj.uuid);
                                  return next;
                                });
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
                          <td className='px-3 py-3' onClick={(e) => e.stopPropagation()}>
                            <div className='flex items-center justify-center'>
                              <button
                                disabled={!isSelected}
                                className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap'
                                style={{
                                  border: `1px solid ${!isSelected ? '#E2E8F0' : hasConfig ? '#155DFC' : '#155DFC'}`,
                                  color: !isSelected ? '#CBD5E1' : hasConfig ? '#fff' : '#155DFC',
                                  background: !isSelected ? 'white' : hasConfig ? '#155DFC' : 'white',
                                  cursor: isSelected ? 'pointer' : 'not-allowed',
                                  opacity: isSelected ? 1 : 0.5,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSelected) return;
                                  setWizardTarget({
                                    objectId: obj.uuid,
                                    objectName: obj.id,
                                    objectLabel: obj.name,
                                    recordCount: obj.recordCount,
                                    isParent: true,
                                  });
                                }}
                              >
                                <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                  <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                                  <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                                </svg>
                                {hasConfig ? 'Details Added' : 'Set Configuration'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className='px-4 py-12 text-center text-sm text-gray-500'>
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
                  <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}
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
                      p === '...'
                        ? <span key={`dots-${idx}`} className='px-1 text-gray-400 text-xs'>...</span>
                        : <button key={p as number} onClick={() => setCurrentPage((p as number) - 1)}
                            className='w-7 h-7 rounded-full text-xs font-medium transition-colors flex items-center justify-center'
                            style={{
                              background: currentPage === (p as number) - 1 ? '#155DFC' : 'white',
                              color: currentPage === (p as number) - 1 ? 'white' : '#64748B',
                              border: currentPage === (p as number) - 1 ? 'none' : '1px solid #E2E8F0',
                            }}>
                            {p}
                          </button>
                    );
                  })()}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
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
            <button onClick={() => navigate('/archive-vault')}
              className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
              Cancel
            </button>
            <div className='flex gap-3'>
              <button onClick={onBack}
                className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={totalSelected === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${totalSelected > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
