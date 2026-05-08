import { useState } from 'react';

type ObjectsNDataProps = {
  backup: any;
};

const mockObjectsData = {
  stats: {
    totalObjects: 152,
    totalRecords: 12424545,
    totalDataSize: '148.3 GB',
    lastBackup: 'Apr 24, 2026, 02:00 AM',
  },
  objects: [
    { id: 1, name: 'Accounts', type: 'Standard', records: 12323, dataSize: '5.2 GB', lastModified: 'Apr 24, 2026, 02:00 AM', changes: 243 },
    { id: 2, name: 'Contact', type: 'Standard', records: 12323, dataSize: '8.2 GB', lastModified: 'Apr 24, 2026, 02:00 AM', changes: 223 },
    { id: 3, name: 'Leads', type: 'Standard', records: 34323, dataSize: '5.7 GB', lastModified: 'Apr 24, 2026, 02:00 AM', changes: 345 },
    { id: 4, name: 'Loads', type: 'Custom', records: 45323, dataSize: '8.7 GB', lastModified: 'Apr 24, 2026, 02:00 AM', changes: 335 },
    { id: 5, name: 'Opportunity', type: 'Standard', records: 4333, dataSize: '1.7 GB', lastModified: 'Apr 24, 2026, 02:00 AM', changes: 45 },
    { id: 6, name: 'Opportunity Product', type: 'Custom', records: 43233, dataSize: '1.3 GB', lastModified: 'Apr 24, 2026, 02:00 AM', changes: 85 },
  ],
};

export default function ObjectsNData(_: ObjectsNDataProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredObjects = mockObjectsData.objects.filter((obj) => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'All' || obj.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const totalItems = 152;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className='space-y-4'>
      {/* Stats Cards */}
      <div className='bg-white rounded border border-gray-200 p-4'>
        <div className='grid grid-cols-4 gap-3'>
          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Total Objects</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>{mockObjectsData.stats.totalObjects}</p>
            <p className='text-xs text-gray-500'>+1 vs last backup</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Total Records</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>{mockObjectsData.stats.totalRecords.toLocaleString()}</p>
            <p className='text-xs text-gray-500'>+123 vs last backup</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v-1h8v1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3h2v3h-2z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Total Data Size</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>{mockObjectsData.stats.totalDataSize}</p>
            <p className='text-xs text-gray-500'>+2.4 % vs last backup</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Last Backup</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>{mockObjectsData.stats.lastBackup}</p>
            <p className='text-xs text-gray-500'>Agg 10h duration</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className='bg-white rounded border border-gray-200 p-4'>
        <div className='flex items-center gap-3'>
          <div className='flex-1 relative'>
            <svg className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
            <input
              type='text'
              placeholder='Search Object'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
            />
          </div>

          <div className='flex gap-2'>
            {(['All', 'Custom', 'Standard'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded font-medium transition-colors text-sm ${
                  selectedFilter === filter
                    ? 'bg-blue-600 text-white border border-blue-600'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Objects Table */}
      <div className='bg-white rounded border border-gray-200'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Object</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Type</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Records</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Data Size</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Last Modified</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600'>Changes</th>
              </tr>
            </thead>
            <tbody>
              {filteredObjects.length > 0 ? (
                filteredObjects.map((obj) => (
                  <tr key={obj.id} className='border-b border-gray-200 hover:bg-gray-50'>
                    <td className='px-4 py-3 text-gray-900 font-medium'>{obj.name}</td>
                    <td className='px-4 py-3'>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                          obj.type === 'Standard'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {obj.type}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-gray-900'>{obj.records.toLocaleString()}</td>
                    <td className='px-4 py-3 text-gray-900'>{obj.dataSize}</td>
                    <td className='px-4 py-3 text-gray-900'>{obj.lastModified}</td>
                    <td className='px-4 py-3 text-green-600 font-medium'>+{obj.changes}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-gray-500'>
                    No objects found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200'>
          <p className='text-sm text-gray-600'>Showing {Math.min(itemsPerPage, filteredObjects.length)} of {totalItems} Objects</p>
          <div className='flex gap-1'>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'
              disabled={currentPage === 1}
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'
              disabled={currentPage === totalPages}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
