import { useState } from 'react';
import dayjs from 'dayjs';

type ChangesDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  job?: any;
};

interface ObjectDetail {
  id: string;
  name: string;
  type: 'Standard' | 'Custom';
  status: string;
  newRecords: number;
  updatedRecords: number;
  deletedRecords: number;
  errorMessage?: string;
}

export default function ChangesDetailModal({ isOpen, onClose, job }: ChangesDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredErrorId, setHoveredErrorId] = useState<string | null>(null);

  const itemsPerPage = 50;

  if (!isOpen || !job) return null;

  const transformedData: ObjectDetail[] = (job.object || []).map((obj: any, idx: number) => ({
    id: obj.bulkJobId || `${idx}`,
    name: obj.name || 'Unknown',
    type: obj.name?.includes('__c') ? 'Custom' : 'Standard',
    status: obj.status || 'UNKNOWN',
    newRecords: obj.insertCount || 0,
    updatedRecords: obj.completedRecordCount || 0,
    deletedRecords: 0,
    errorMessage: obj.errorMessage,
  }));

  const uniqueStatuses = Array.from(new Set(transformedData.map(item => item.status))).sort();

  const filteredData = transformedData.filter((item: ObjectDetail) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'All') return matchesSearch;
    return matchesSearch && item.status === activeFilter;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedData = filteredData.slice(startIdx, endIdx);

  const stats = {
    newObjectsAdded: transformedData.filter((obj: ObjectDetail) => obj.newRecords > 0).length,
    newRecords: transformedData.reduce((sum: number, obj: ObjectDetail) => sum + obj.newRecords, 0),
    updatedRecords: transformedData.reduce((sum: number, obj: ObjectDetail) => sum + obj.updatedRecords, 0),
    deletedRecords: 0,
    objectsSynced: transformedData.length,
  };

  const getStatusColor = (status: string) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'COMPLETED':
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const startedAt = job.startedAt ? new Date(job.startedAt) : null;

  return (
    <div className='fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-start justify-between p-6 border-b border-gray-200 sticky top-0 bg-white'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900'>
              Object Details - {startedAt ? dayjs(startedAt).format('MMM D, YYYY | h:mm A') : 'N/A'}
            </h2>
            <p className='text-sm text-gray-600 mt-1'>Object updates details in backups →</p>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 p-1'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* Stats Cards */}
          <div className='grid grid-cols-5 gap-3'>
            <div className='text-center p-3 bg-green-50 rounded-lg border border-green-200'>
              <div className='text-2xl font-bold text-green-600'>{stats.newObjectsAdded}</div>
              <p className='text-xs text-gray-600 mt-1'>New Object Added</p>
            </div>
            <div className='text-center p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <div className='text-2xl font-bold text-blue-600'>{stats.newRecords}</div>
              <p className='text-xs text-gray-600 mt-1'>New Records</p>
            </div>
            <div className='text-center p-3 bg-orange-50 rounded-lg border border-orange-200'>
              <div className='text-2xl font-bold text-orange-600'>{stats.updatedRecords}</div>
              <p className='text-xs text-gray-600 mt-1'>Updated Records</p>
            </div>
            <div className='text-center p-3 bg-red-50 rounded-lg border border-red-200'>
              <div className='text-2xl font-bold text-red-600'>{stats.deletedRecords}</div>
              <p className='text-xs text-gray-600 mt-1'>Deleted Records</p>
            </div>
            <div className='text-center p-3 bg-purple-50 rounded-lg border border-purple-200'>
              <div className='text-2xl font-bold text-purple-600'>{stats.objectsSynced}</div>
              <p className='text-xs text-gray-600 mt-1'>Objects Synced</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className='flex items-center gap-4'>
            <div className='flex-1'>
              <input
                type='text'
                placeholder='Search Object'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className='w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
            <div className='flex gap-2'>
              {['All', ...uniqueStatuses].map(filter => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    activeFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className='border border-gray-200 rounded-lg overflow-hidden'>
            <table className='w-full'>
              <thead className='bg-gray-50 border-b border-gray-200'>
                <tr>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-900 w-12'>#</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-900'>Object</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-900'>Type</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-900'>Status</th>
                  <th className='px-6 py-3 text-center text-sm font-semibold text-gray-900'>New Records</th>
                  <th className='px-6 py-3 text-center text-sm font-semibold text-gray-900'>Updated Records</th>
                  <th className='px-6 py-3 text-center text-sm font-semibold text-gray-900'>Deleted Records</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-900'>Error Message</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item: ObjectDetail, idx: number) => (
                  <tr key={item.id} className='border-b border-gray-200 hover:bg-gray-50'>
                    <td className='px-6 py-4 text-sm text-gray-600 w-12'>{startIdx + idx + 1}</td>
                    <td className='px-6 py-4 text-sm text-gray-900'>{item.name}</td>
                    <td className='px-6 py-4 text-sm text-gray-600'>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        item.type === 'Standard' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-center text-gray-900'>{item.newRecords}</td>
                    <td className='px-6 py-4 text-sm text-center text-gray-900'>{item.updatedRecords}</td>
                    <td className='px-6 py-4 text-sm text-center text-gray-900'>{item.deletedRecords}</td>
                    <td className='px-6 py-4 text-sm text-gray-600'>
                      {item.errorMessage ? (
                        <div className='relative inline-block'>
                          <span
                            className='text-red-600 text-xs cursor-help'
                            onMouseEnter={() => setHoveredErrorId(item.id)}
                            onMouseLeave={() => setHoveredErrorId(null)}
                          >
                            {item.errorMessage.length > 50
                              ? item.errorMessage.substring(0, 50) + '...'
                              : item.errorMessage}
                          </span>

                          {hoveredErrorId === item.id && (
                            <div className='absolute bottom-full left-0 mb-2 z-50 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-normal max-w-xs break-words'>
                              {item.errorMessage}
                              <div className='absolute top-full left-2 w-2 h-2 bg-gray-900 transform rotate-45'></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className='text-gray-400 text-xs'>--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className='flex items-center justify-between'>
            <p className='text-sm text-gray-600'>
              Showing {filteredData.length > 0 ? startIdx + 1 : 0} of {filteredData.length} Object
            </p>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className='px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                ← Prev
              </button>

              <div className='flex gap-1'>
                {currentPage > 2 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className='px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50'
                    >
                      1
                    </button>
                    {currentPage > 3 && <span className='text-gray-400 px-1'>...</span>}
                  </>
                )}

                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const pageNum = currentPage - 1 + i;
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {currentPage < totalPages - 1 && (
                  <>
                    {currentPage < totalPages - 2 && <span className='text-gray-400 px-1'>...</span>}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className='px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50'
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className='px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
