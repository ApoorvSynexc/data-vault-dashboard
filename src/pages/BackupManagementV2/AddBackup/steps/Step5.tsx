import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { TableColumn } from '../../../../components/Table';
import Table from '../../../../components/Table';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';

type Step5Props = {
  onNext: (selectedObjectIds: string[]) => void;
  onBack: () => void;
  entireDatasetSelected?: boolean;
  crmId?: string | null;
  selectedObjectIds?: string[];
  strategy?: 'realtime' | 'scheduled';
};

interface BackupObject {
  id: string;
  name: string;
  type: 'Standard' | 'Custom';
  records: number;
  estimatedSize: string;
  isBackedUp?: boolean;
  schedule?: 'realtime' | 'schedule' | null;
}

export default function Step5({ onNext, onBack, entireDatasetSelected: _entireDatasetSelected = false, crmId, selectedObjectIds: initialSelectedObjectIds = [], strategy = 'realtime' }: Step5Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const getMaxSteps = () => {
    return strategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  // Fetch paginated objects from API
  const { data: objectsResponse, isLoading, error } = useQuery({
    queryKey: ['backup-objects', crmId, currentPage],
    queryFn: async () => {
      const offset = currentPage * ITEMS_PER_PAGE;
      return backupConfigService.getObjectListPaginated(crmId ?? '', offset, ITEMS_PER_PAGE);
    },
    enabled: !!crmId,
  });

  const objects: BackupObject[] = (objectsResponse?.objects as any) ?? [];
  const totalRecords = objectsResponse?.totalRecords ?? 0;
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set(initialSelectedObjectIds));

  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'All' || obj.type === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, selectedFilter, objects]);

  // When search/filter changes, reset to first page
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, selectedFilter]);

  const columns: TableColumn<BackupObject>[] = [
    {
      key: 'name',
      header: 'Object',
      render: (obj) => (
        <div className='flex items-center gap-2'>
          <span className={obj.isBackedUp ? 'text-gray-600' : 'text-gray-900'}>{obj.name}</span>
          {obj.isBackedUp && (
            <span className='text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded whitespace-nowrap'>
              Already Backed Up {obj.schedule ? `as ${obj.schedule === 'realtime' ? 'Realtime' : 'Scheduled'}` : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (obj) => <span className={obj.isBackedUp ? 'text-gray-500' : 'text-gray-700'}>{obj.type}</span>,
    },
    {
      key: 'records',
      header: 'Records',
      render: (obj) => <span className={obj.isBackedUp ? 'text-gray-500' : 'text-gray-700'}>{(obj.records as any)?.toLocaleString?.() || obj.records}</span>,
    },
    {
      key: 'estimatedSize',
      header: 'Estimated Data Size',
      render: (obj) => <span className={obj.isBackedUp ? 'text-gray-500' : 'text-gray-700'}>{obj.estimatedSize}</span>,
    },
  ];

  return (
    <div className='h-full bg-gray-50 flex flex-col overflow-hidden'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between p-8 pb-4 flex-shrink-0'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Data Scope</h1>
          <p className='text-gray-600 mt-2'>Select object that you want to backup in scheduled backup</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 5 of {maxSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className='bg-white rounded-lg border border-gray-200 mx-8 flex flex-col flex-grow min-h-0'>
        {/* Search and Filter */}
        <div className='p-6 pb-4 flex items-center gap-4 justify-between flex-shrink-0'>
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
          <div className='text-center py-12 text-red-600 flex-shrink-0'>
            <p>Failed to load objects. Please try again.</p>
          </div>
        )}

        {/* Table Container - Scrollable */}
        {!isLoading && !error && (
          <>
            <div className='h-[40vh] overflow-y-auto px-6 py-4'>
              <Table<BackupObject>
                columns={columns}
                rows={filteredObjects}
                getRowKey={(obj) => obj.id}
                getRowId={(obj) => obj.id}
                showCheckbox={true}
                selectedIds={selectedObjects}
                onSelectionChange={setSelectedObjects}
                isRowSelectable={(obj) => !obj.isBackedUp}
                getRowClassName={(obj) => `border-b border-gray-200 ${
                  obj.isBackedUp
                    ? 'bg-gray-100 opacity-60'
                    : 'hover:bg-blue-50'
                }`}
                emptyState='No objects found matching your search.'
                showPagination={false}
                height='500px'
                showSerialNumber={true}
              />
            </div>

            {/* Pagination Info and Controls */}
            <div className='p-6 pt-4 flex-shrink-0 border-t border-gray-200'>
              <div className='flex items-center justify-between'>
                <div className='text-sm text-gray-600'>
                  Showing {objects.length > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalRecords)} of {totalRecords} Objects
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className='px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
                  >
                    ← Previous
                  </button>
                  <span className='text-sm text-gray-600 px-2'>
                    Page {currentPage + 1} of {Math.ceil(totalRecords / ITEMS_PER_PAGE) || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= Math.ceil(totalRecords / ITEMS_PER_PAGE) - 1}
                    className='px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex justify-between flex-shrink-0 p-8 pt-6'>
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
            onClick={() => onNext(Array.from(selectedObjects))}
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
