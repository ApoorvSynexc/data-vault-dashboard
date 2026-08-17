import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { useCrmMetadataService, type MasterObjectItem } from '../../../../services/crm-metadata/crm-metadata.service';
import { useDebounce } from '../../../../hooks/useDebounce';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';
import { parseSalesforceError } from '../../../../utils';

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
  onSelectionChange?: (selectedIds: string[]) => void;
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

export default function Step5({ onNext, onBack, entireDatasetSelected: _entireDatasetSelected = false, crmId, selectedObjectIds: initialSelectedObjectIds = [], strategy = 'realtime', onSelectionChange }: Step5Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();
  const crmMetadataService = useCrmMetadataService();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 700);
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const getMaxSteps = () => {
    return strategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  // Fetch all objects ONCE and keep in state
  const mode = strategy === 'realtime' ? 'REALTIME' : 'SCHEDULE';

  const [allObjects, setAllObjects] = useState<BackupObject[]>([]);

  const { data: allObjectsData, isLoading: isLoadingObjects, error: objectsError } = useQuery({
    queryKey: ['backup-objects-all-v3', crmId, mode],
    queryFn: () => backupConfigService.getObjectList(crmId ?? '', mode),
    enabled: !!crmId,
  });

  // When data arrives from API, store it in state
  useEffect(() => {
    if (!allObjectsData) return;
    setAllObjects((allObjectsData as any) ?? []);
  }, [allObjectsData]);

  // V1: crm-metadata/objects/list — full object list, becomes the source of truth
  const v2Type = strategy === 'realtime' ? 'realtime' : 'schedule';

  type V1Object = { name: string; label: string; custom: boolean; count: number; [key: string]: unknown };
  const [objectsV1, setObjectsV1] = useState<V1Object[]>([]);
  const masterChunkRef = useRef(0);
  const [masterDataMap, setMasterDataMap] = useState<Record<string, MasterObjectItem>>({});

  const { data: objectsV1Data } = useQuery({
    queryKey: ['crm-objects-v1', crmId, v2Type],
    queryFn: () => crmMetadataService.getObjectList('backup', v2Type),
    enabled: !!crmId,
  });

  useEffect(() => {
    if (!objectsV1Data?.data) return;
    const raw = objectsV1Data.data as any;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    setObjectsV1(list);
  }, [objectsV1Data]);

  // Fire master/list in 20-object chunks sequentially after V1 loads
  const CHUNK_SIZE = 20;

  useEffect(() => {
    if (objectsV1.length === 0) return;

    const totalChunks = Math.ceil(objectsV1.length / CHUNK_SIZE);

    const fireNextChunk = async (chunkIndex: number) => {
      if (chunkIndex >= totalChunks) return;

      const chunk = objectsV1.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
      const objectNames = chunk.map((o) => o.name);

      try {
        const response = await crmMetadataService.getMasterObjectList(objectNames);

        const masterItems: any[] = (response?.data as any)?.data;
        if (Array.isArray(masterItems)) {
          setMasterDataMap((prev) => {
            const updated = { ...prev };
            masterItems.forEach((obj: any) => {
              if (obj.objectName) updated[obj.objectName] = obj;
            });
            return updated;
          });
        }

        fireNextChunk(chunkIndex + 1);
      } catch {
        fireNextChunk(chunkIndex + 1);
      }
    };

    masterChunkRef.current = 0;
    setMasterDataMap({});
    fireNextChunk(0);
  }, [objectsV1]);

  // Filter + paginate from raw allObjects first (no counts yet)
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
  const currentPageObjects = allFilteredObjects.slice(offset, offset + ITEMS_PER_PAGE);

  // Fetch counts only for the objects visible on the current page
  const currentPageIds = currentPageObjects.map((o) => o.id);

  const { data: countResponse } = useQuery({
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


  const isLoading = isLoadingObjects && allObjects.length === 0;
  const error = objectsError;

  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set(initialSelectedObjectIds));
  const autoSelectedRef = useRef(false);

  // Notify parent of selection changes so it can persist across back/forward navigation
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedObjects));
  }, [selectedObjects]);

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
          <p className='text-sm text-gray-600 mt-1'>Select the objects that you want to back up in the scheduled backup.</p>
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
              placeholder='Search Objects'
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
            <span className='font-medium'>{selectedObjects.size} objects selected</span>
          </div>

          {/* Clear */}
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
                  getRowKey={(obj) => obj.id}
                  loading={isLoading}
                  skeletonConfig={{ rows: 8, colWidths: ['w-40', 'w-16', 'w-20', 'w-24'] }}
                  headerVariant='uppercase'
                  borderless
                  cellPaddingClassName='px-3 py-2.5'
                  showSerialNumber
                  serialNumberStart={currentPage * ITEMS_PER_PAGE + 1}
                  showCheckbox
                  selectedIds={selectedObjects}
                  getRowId={(obj) => obj.id}
                  onSelectionChange={setSelectedObjects}
                  getRowClassName={(_obj, isSelected) =>
                    `border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'}`
                  }
                  emptyState='No objects found matching your search.'
                  pagination={{
                    currentPage: 1,
                    displayPage: currentPage + 1,
                    pageSize: ITEMS_PER_PAGE,
                    totalRecords,
                    onPageChange: (p) => setCurrentPage(p - 1),
                  }}
                />
              )}
            </div>
          );
        })()}
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
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedObjects.size > 0
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
