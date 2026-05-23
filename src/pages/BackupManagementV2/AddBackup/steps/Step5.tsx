import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { TableColumn } from '../../../../components/Table';
import Table from '../../../../components/Table';
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

  // Auto-select all objects if entire dataset is selected
  useEffect(() => {
    if (_entireDatasetSelected && allObjects.length > 0 && selectedObjects.size === 0) {
      setSelectedObjects(new Set(allObjects.map((obj) => obj.id)));
    }
  }, [_entireDatasetSelected, allObjects, selectedObjects.size]);

  // When search/filter changes, reset to first page
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchQuery, selectedFilter]);


  const columns: TableColumn<BackupObject>[] = [
    {
      key: 'name',
      header: 'Object',
      render: (obj) => (
        <div className='flex items-center gap-2'>
          <span className='text-gray-900'>{obj.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (obj) => (
        <span className='text-gray-700'>
          {obj.isCustom ? 'Custom' : 'Standard'}
        </span>
      ),
    },
    {
      key: 'recordCount',
      header: 'Records',
      render: (obj) => (
        <span className='text-gray-700'>
          {obj.recordCount?.toLocaleString() ?? '--'}
        </span>
      ),
    },
    {
      key: 'dataSize',
      header: 'Estimated data size',
      render: (obj) => {
        const calculateDataSize = (recordCount?: number) => {
          if (!recordCount) return '--';
          const sizeInKB = recordCount * 2;
          if (sizeInKB >= 1024 * 1024) {
            return `${(sizeInKB / (1024 * 1024)).toFixed(2)} GB`;
          } else if (sizeInKB >= 1024) {
            return `${(sizeInKB / 1024).toFixed(2)} MB`;
          }
          return `${sizeInKB} KB`;
        };
        return (
          <span className='text-gray-700'>
            {calculateDataSize(obj.recordCount)}
          </span>
        );
      },
    },
  ];

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
      <div className='bg-white rounded-lg border border-gray-200 mx-6 mb-4 flex flex-col flex-1 min-h-0'>
        {/* Search and Filter */}
        <div className='px-6 py-3 flex items-center gap-4 justify-between flex-shrink-0'>
          <div className='flex-1'>
            <input
              type='text'
              placeholder='Search Object'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div className='flex gap-2'>
            {(['All', 'Custom', 'Standard'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className='text-sm font-semibold text-blue-600 flex-shrink-0'>
            {selectedObjects.size} Selected
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className='flex items-center justify-center py-12 flex-shrink-0'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className='mx-6 my-4 rounded-lg bg-red-50 border border-red-200 px-5 py-4 flex-shrink-0'>
            <p className='text-sm font-semibold text-red-700 mb-0.5'>Failed to load objects</p>
            <p className='text-sm text-red-600'>
              {(error as any)?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        )}

        {/* Table Container - Scrollable */}
        {!isLoading && !error && (
          <div className='flex-1 min-h-0 flex flex-col'>
            <style>{`
              table {
                border-collapse: separate;
                border-spacing: 0;
              }
              table thead {
                position: sticky !important;
                top: 0 !important;
                background-color: white !important;
                z-index: 30 !important;
              }
              table thead th {
                position: relative;
                background-color: white !important;
              }
            `}</style>
            <div className='flex-1 min-h-0 px-6 py-2 overflow-y-auto'>
              <Table<BackupObject>
                columns={columns}
                rows={filteredObjects}
                getRowKey={(obj) => obj.id}
                getRowId={(obj) => obj.id}
                showCheckbox={true}
                selectedIds={selectedObjects}
                onSelectionChange={setSelectedObjects}
                getRowClassName={() => 'border-b border-gray-200 hover:bg-blue-50'}
                emptyState='No objects found matching your search.'
                showPagination={false}
                minHeightClassName='min-h-0'
                showSerialNumber={true}
                serialNumberStart={currentPage * ITEMS_PER_PAGE + 1}
              />
            </div>

            {/* Pagination Controls */}
            <div className='px-6 py-3 flex-shrink-0 border-t border-gray-200'>
              <div className='flex items-center justify-between'>
                <div className='text-sm text-gray-600'>
                  Showing {filteredObjects.length > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalRecords)} of {totalRecords} Objects
                </div>

                <div className='flex items-center gap-4'>
                  {/* Page Number Pagination */}
                  <div className='flex items-center gap-2'>
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'
                    >
                      &lt;
                    </button>

                    {/* Page Numbers */}
                    <div className='flex items-center gap-1'>
                      {(() => {
                        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1;
                        const pages: (number | string)[] = [];
                        const maxVisiblePages = 5;
                        const halfVisible = Math.floor(maxVisiblePages / 2);

                        if (totalPages <= maxVisiblePages) {
                          for (let i = 0; i < totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          pages.push(0);
                          if (currentPage > halfVisible + 1) pages.push('...');

                          const start = Math.max(1, currentPage - halfVisible);
                          const end = Math.min(totalPages - 1, currentPage + halfVisible);

                          for (let i = start; i <= end; i++) {
                            if (!pages.includes(i)) pages.push(i);
                          }

                          if (currentPage < totalPages - halfVisible - 2) pages.push('...');
                          if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1);
                        }

                        return pages.map((page, idx) => {
                          if (page === '...') {
                            return (
                              <span key={`dots-${idx}`} className='px-2 text-gray-400'>
                                ...
                              </span>
                            );
                          }
                          const pageNum = page as number;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {pageNum + 1}
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(totalRecords / ITEMS_PER_PAGE) - 1}
                      className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
