import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';

type Step5Props = {
  onNext: (selectedObjectIds: string[]) => void;
  onBack: () => void;
  entireDatasetSelected?: boolean;
  crmId?: string | null;
  selectedObjectIds?: string[];
};

interface BackupObject {
  id: string;
  name: string;
  type: 'Standard' | 'Custom';
  records: number;
  estimatedSize: string;
}

export default function Step5({ onNext, onBack, entireDatasetSelected = false, crmId, selectedObjectIds: initialSelectedObjectIds = [] }: Step5Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');

  // Fetch objects from API
  const { data: objectsData, isLoading, error } = useQuery({
    queryKey: ['backup-objects', crmId],
    queryFn: async () => backupConfigService.getObjectList(crmId ?? ''),
    enabled: !!crmId,
  });

  const objects: BackupObject[] = (objectsData as any)?.data ?? objectsData ?? [];
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set(initialSelectedObjectIds));

  // Auto-select all objects when entireDatasetSelected is true and objects are loaded
  useEffect(() => {
    if (entireDatasetSelected && objects.length > 0) {
      setSelectedObjects(new Set(objects.map((obj) => obj.id)));
    }
  }, [entireDatasetSelected, objects]);

  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'All' || obj.type === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, selectedFilter, objects]);

  const handleToggleObject = (id: string) => {
    const newSelected = new Set(selectedObjects);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedObjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedObjects.size === filteredObjects.length) {
      setSelectedObjects(new Set());
    } else {
      setSelectedObjects(new Set(filteredObjects.map((obj) => obj.id)));
    }
  };

  return (
    <div className='h-screen bg-gray-50 p-8 flex flex-col overflow-hidden'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-8 flex-shrink-0'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Data Scope</h1>
          <p className='text-gray-600 mt-2'>Select object that you want to backup in scheduled backup</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 5 of 5
        </span>
      </div>

      {/* Main Content */}
      <div className='bg-white rounded-lg border border-gray-200 p-6 mb-8 flex flex-col flex-grow min-h-0'>
        {/* Search and Filter */}
        <div className='mb-6 flex items-center gap-4 justify-between flex-shrink-0'>
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

        {/* Table */}
        {!isLoading && !error && (
          <>
            <div className='overflow-x-auto overflow-y-auto flex-1 min-h-0'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='px-4 py-3 text-left'>
                      <input
                        type='checkbox'
                        checked={selectedObjects.size === filteredObjects.length && filteredObjects.length > 0}
                        onChange={handleSelectAll}
                        className='w-5 h-5 accent-blue-600 rounded cursor-pointer'
                      />
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-900'>Object</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-900'>Type</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-900'>Records</th>
                    <th className='px-4 py-3 text-left text-sm font-semibold text-gray-900'>Estimated Data Size</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObjects.map((obj, index) => (
                    <tr
                      key={obj.id}
                      className={`border-b border-gray-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50`}
                    >
                      <td className='px-4 py-3'>
                        <input
                          type='checkbox'
                          checked={selectedObjects.has(obj.id)}
                          onChange={() => handleToggleObject(obj.id)}
                          className='w-5 h-5 accent-blue-600 rounded cursor-pointer'
                        />
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-900 font-medium'>{obj.name}</td>
                      <td className='px-4 py-3 text-sm text-gray-700'>{obj.type}</td>
                      <td className='px-4 py-3 text-sm text-gray-700'>{(obj.records as any)?.toLocaleString?.() || obj.records}</td>
                      <td className='px-4 py-3 text-sm text-gray-700'>{obj.estimatedSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredObjects.length === 0 && !isLoading && (
              <div className='text-center py-12 text-gray-500'>
                <p>No objects found matching your search.</p>
              </div>
            )}
          </>
        )}

        {/* Pagination Info */}
        {!isLoading && !error && (
          <div className='mt-6 text-sm text-gray-600 flex-shrink-0'>
            Showing {filteredObjects.length} of {objects.length} Objects
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex justify-between flex-shrink-0'>
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
            className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700'
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
