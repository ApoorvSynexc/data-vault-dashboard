import { useState } from 'react';

type ObjectsNDataProps = {
  backup: any;
};

export default function ObjectsNData({ backup }: ObjectsNDataProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Custom' | 'Standard'>('All');

  const objects = [
    { id: 1, name: 'Account', type: 'Standard', records: 5423, size: '765 MB' },
    { id: 2, name: 'Opportunity', type: 'Standard', records: 3421, size: '565 MB' },
    { id: 3, name: 'Contact', type: 'Standard', records: 8234, size: '465 MB' },
    { id: 4, name: 'Case', type: 'Standard', records: 2145, size: '365 MB' },
    { id: 5, name: 'Lead', type: 'Standard', records: 6234, size: '340 MB' },
    { id: 6, name: 'Custom_Object__c', type: 'Custom', records: 1234, size: '120 MB' },
    { id: 7, name: 'Invoice__c', type: 'Custom', records: 4567, size: '210 MB' },
  ];

  const filteredObjects = objects.filter((obj) => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'All' || obj.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className='space-y-4'>
      {/* Filter Section */}
      <div className='bg-white rounded-lg border border-gray-200 p-4'>
        <div className='flex items-center gap-4 justify-between'>
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  selectedFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className='text-sm font-semibold text-blue-600'>
            {filteredObjects.length} Objects
          </div>
        </div>
      </div>

      {/* Objects Table */}
      <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50'>
                <th className='text-left px-4 py-3 font-medium text-gray-600 text-sm'>Object</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600 text-sm'>Type</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600 text-sm'>Records</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600 text-sm'>Data Size</th>
                <th className='text-left px-4 py-3 font-medium text-gray-600 text-sm'>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredObjects.map((obj, index) => (
                <tr
                  key={obj.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className='px-4 py-3 text-sm font-medium text-gray-900'>{obj.name}</td>
                  <td className='px-4 py-3 text-sm'>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        obj.type === 'Standard'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {obj.type}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-900'>{(obj.records as any).toLocaleString()}</td>
                  <td className='px-4 py-3 text-sm text-gray-900'>{obj.size}</td>
                  <td className='px-4 py-3 text-sm'>
                    <button className='text-blue-600 hover:underline font-medium'>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredObjects.length === 0 && (
          <div className='text-center py-8 text-gray-500'>
            <p>No objects found matching your search.</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className='grid grid-cols-4 gap-4'>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-xs text-gray-600 mb-2'>Total Objects</p>
          <p className='text-2xl font-bold text-gray-900'>{objects.length}</p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-xs text-gray-600 mb-2'>Total Records</p>
          <p className='text-2xl font-bold text-gray-900'>{objects.reduce((sum, obj) => sum + obj.records, 0).toLocaleString()}</p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-xs text-gray-600 mb-2'>Standard Objects</p>
          <p className='text-2xl font-bold text-gray-900'>{objects.filter((o) => o.type === 'Standard').length}</p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-xs text-gray-600 mb-2'>Custom Objects</p>
          <p className='text-2xl font-bold text-gray-900'>{objects.filter((o) => o.type === 'Custom').length}</p>
        </div>
      </div>
    </div>
  );
}
