import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { useDebounce } from '../../../../hooks/useDebounce';

type SelectedObject = {
  id: string;
  type: 'STANDARD' | 'CUSTOM';
};

type Step5Props = {
  onNext: (selectedObjects: SelectedObject[]) => void;
  onBack: () => void;
  entireDatasetSelected?: boolean;
  crmId?: string | null;
  selectedObjectIds?: string[];
  strategy?: 'realtime' | 'scheduled';
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
  schedule?: 'realtime' | 'schedule' | null;
}

export default function Step5({ onNext, onBack, entireDatasetSelected: _entireDatasetSelected = false, crmId, selectedObjectIds: initialSelectedObjectIds = [], strategy = 'realtime' }: Step5Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 700);
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const getMaxSteps = () => {
    return strategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  // Fetch all objects ONCE and cache them
  const mode = strategy === 'realtime' ? 'REALTIME' : 'SCHEDULE';

  const { data: allObjectsData, isLoading: isLoadingObjects, error: objectsError } = useQuery({
    queryKey: ['backup-objects-all', crmId, mode],
    queryFn: async () => {
      const response = await backupConfigService.getObjectList(crmId ?? '', mode);
      return response;
    },
    enabled: !!crmId,
  });

  const allObjects: BackupObject[] = (allObjectsData as any) ?? [];

  // Filter + paginate from raw allObjects first (no counts yet)
  const allFilteredObjects = useMemo(() => {
    return allObjects.filter((obj) => {
      const matchesSearch = obj.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      if (selectedFilter === 'Standard') return matchesSearch && !obj.isCustom;
      if (selectedFilter === 'Custom') return matchesSearch && obj.isCustom;
      return matchesSearch;
    });
  }, [debouncedSearchQuery, selectedFilter, allObjects]);

  const totalRecords = allFilteredObjects.length;
  const offset = currentPage * ITEMS_PER_PAGE;
  const currentPageObjects = allFilteredObjects.slice(offset, offset + ITEMS_PER_PAGE);

  // Fetch counts only for the objects visible on the current page
  const currentPageIds = currentPageObjects.map((o) => o.id);

  const { data: countResponse, isLoading: isLoadingCount } = useQuery({
    queryKey: ['backup-objects-count', crmId, currentPageIds],
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
      } catch (error) {
        console.error('Failed to fetch object counts:', error);
        return { objectCounts: {} };
      }
    },
    enabled: !!crmId && currentPageIds.length > 0,
  });

  // Merge counts into the current page objects
  const filteredObjects = useMemo(() => {
    return currentPageObjects.map((obj) => ({
      ...obj,
      recordCount: countResponse?.objectCounts?.[obj.id] ?? undefined,
    }));
  }, [currentPageObjects, countResponse?.objectCounts]);


  const isLoading = isLoadingObjects || isLoadingCount;
  const error = objectsError;

  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set(initialSelectedObjectIds));
  const autoSelectedRef = useRef(false);

  // Auto-select all objects if entire dataset is selected — only once on first load
  useEffect(() => {
    if (_entireDatasetSelected && allObjects.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedObjects(new Set(allObjects.map((obj) => obj.id)));
    }
  }, [_entireDatasetSelected, allObjects]);

  // When search/filter changes, reset to first page
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchQuery, selectedFilter]);



  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between px-8 py-4 flex-shrink-0'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Data Scope</h1>
          <p className='text-sm text-gray-600 mt-1'>Select object that you want to backup in scheduled backup</p>
        </div>
        <span className='text-xs font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 5 of {maxSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className='bg-white rounded-xl mx-6 mb-4 flex flex-col flex-1 min-h-0 overflow-hidden'
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
            <span className='font-medium'>{selectedObjects.size} object selected</span>
          </div>

          {/* Clear */}
          <button
            onClick={() => setSelectedObjects(new Set())}
            className='text-sm font-medium text-gray-500 hover:text-gray-700 flex-shrink-0'>
            Clear
          </button>
        </div>

        {/* Table */}
        <div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
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
                  <col style={{ width: 52 }} />
                  <col />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 150 }} />
                </colgroup>
                <thead className='sticky top-0 z-20 bg-white'>
                  <tr className='border-b border-gray-100'>
                    <th className='px-3 py-2.5 text-left'>
                      <input
                        type='checkbox'
                        checked={filteredObjects.length > 0 && filteredObjects.every(o => selectedObjects.has(o.id))}
                        ref={(input) => {
                          if (input) {
                            const sel = filteredObjects.filter(o => selectedObjects.has(o.id)).length;
                            input.indeterminate = sel > 0 && sel < filteredObjects.length;
                          }
                        }}
                        onChange={() => {
                          const allSel = filteredObjects.every(o => selectedObjects.has(o.id));
                          const next = new Set(selectedObjects);
                          filteredObjects.forEach(o => allSel ? next.delete(o.id) : next.add(o.id));
                          setSelectedObjects(next);
                        }}
                        className='w-4 h-4 rounded accent-blue-600 cursor-pointer'
                      />
                    </th>
                    <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>#</th>
                    <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>Object</th>
                    <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>Type</th>
                    <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>Records</th>
                    <th className='px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>Estimated Data Size</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObjects.length > 0 ? filteredObjects.map((obj, idx) => {
                    const isSelected = selectedObjects.has(obj.id);
                    const recordCount = obj.recordCount;
                    const dataSize = (() => {
                      if (!recordCount) return '--';
                      const kb = recordCount * 2;
                      if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
                      if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`;
                      return `${kb} KB`;
                    })();
                    return (
                      <tr key={obj.id}
                        onClick={() => { const next = new Set(selectedObjects); isSelected ? next.delete(obj.id) : next.add(obj.id); setSelectedObjects(next); }}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`}>
                        <td className='px-3 py-2.5' onClick={e => e.stopPropagation()}>
                          <input type='checkbox' checked={isSelected}
                            onChange={() => { const next = new Set(selectedObjects); isSelected ? next.delete(obj.id) : next.add(obj.id); setSelectedObjects(next); }}
                            className='w-4 h-4 rounded accent-blue-600 cursor-pointer'
                          />
                        </td>
                        <td className='px-3 py-2.5 text-sm text-gray-400'>{currentPage * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className='px-3 py-2.5 text-sm font-medium text-gray-800'>{obj.name}</td>
                        <td className='px-3 py-2.5'>
                          <span className='text-xs font-medium text-blue-600'>{obj.isCustom ? 'Custom' : 'Standard'}</span>
                        </td>
                        <td className='px-3 py-2.5 text-sm text-gray-600'>{recordCount?.toLocaleString() ?? '--'}</td>
                        <td className='px-3 py-2.5 text-sm text-gray-600'>{dataSize}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={6} className='px-4 py-12 text-center text-sm text-gray-400'>No objects found matching your search.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && !error && (
            <div className='flex items-center justify-between border-t border-gray-100 px-5 py-3 flex-shrink-0'>
              <p className='text-sm text-gray-500'>
                Showing {filteredObjects.length > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalRecords)} of {totalRecords} Objects
              </p>
              <div className='flex items-center gap-2'>
                <button onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage === 0}
                  className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'>
                  &lt;
                </button>
                {(() => {
                  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
                  const pages: (number | string)[] = [];
                  const half = 2;
                  if (totalPages <= 5) {
                    for (let i = 0; i < totalPages; i++) pages.push(i);
                  } else {
                    pages.push(0);
                    if (currentPage > half + 1) pages.push('...');
                    const start = Math.max(1, currentPage - half);
                    const end = Math.min(totalPages - 2, currentPage + half);
                    for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);
                    if (currentPage < totalPages - half - 2) pages.push('...');
                    if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1);
                  }
                  return pages.map((page, i) => page === '...'
                    ? <span key={`d${i}`} className='px-2 text-gray-400'>...</span>
                    : <button key={page} onClick={() => setCurrentPage(page as number)}
                        className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'}`}>
                        {(page as number) + 1}
                      </button>
                  );
                })()}
                <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= Math.ceil(totalRecords / ITEMS_PER_PAGE) - 1}
                  className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'>
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex-shrink-0 flex justify-between px-8 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-4'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={() => {
              const selectedObjectsData = Array.from(selectedObjects).map((id) => {
                const obj = allObjects.find((o) => o.id === id);
                const type: 'STANDARD' | 'CUSTOM' = obj?.isCustom ? 'CUSTOM' : 'STANDARD';
                return {
                  id,
                  type,
                };
              });
              onNext(selectedObjectsData);
            }}
            disabled={selectedObjects.size === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedObjects.size > 0
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
