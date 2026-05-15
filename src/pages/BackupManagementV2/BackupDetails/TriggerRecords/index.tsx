import { useState } from 'react';

type TriggerRecord = {
  triggerName: string;
  status: string;
  permissionSetStatus?: string;
  error?: string;
};

type TriggerRecordsProps = {
  backup: any;
};

type FilterType = 'all' | 'created' | 'failed';

export default function TriggerRecords({ backup }: TriggerRecordsProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const triggers: TriggerRecord[] = backup?.triggerResults ?? [];

  const created = triggers.filter((t) => t.status === 'CREATED').length;
  const failed = triggers.filter((t) => t.status === 'FAILED').length;

  const filtered = triggers.filter((t) => {
    const matchesFilter =
      filter === 'all' || t.status.toLowerCase() === filter;
    const matchesSearch = t.triggerName
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const parseErrorMessage = (error: string): string => {
    try {
      const match = error.match(/\[(.+)\]/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed[0]?.message ?? error;
      }
    } catch {
      // fall through
    }
    return error;
  };

  if (!triggers.length) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
        <svg className='w-12 h-12 mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M13 10V3L4 14h7v7l9-11h-7z' />
        </svg>
        <p className='text-sm font-medium'>No trigger records found</p>
        <p className='text-xs mt-1'>This backup does not have any trigger records.</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Summary Cards */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='bg-white rounded border border-gray-200 p-4'>
          <p className='text-xs text-gray-500 mb-1'>Total Triggers</p>
          <p className='text-2xl font-bold text-gray-900'>{triggers.length}</p>
        </div>
        <div className='bg-white rounded border border-gray-200 p-4'>
          <p className='text-xs text-gray-500 mb-1'>Created</p>
          <p className='text-2xl font-bold text-green-600'>{created}</p>
        </div>
        <div className='bg-white rounded border border-gray-200 p-4'>
          <p className='text-xs text-gray-500 mb-1'>Failed</p>
          <p className='text-2xl font-bold text-red-500'>{failed}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className='bg-white rounded border border-gray-200 p-4'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <div className='flex gap-2'>
            {(['all', 'created', 'failed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filter === f
                    ? f === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : f === 'created'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className='ml-1.5 font-semibold'>
                  {f === 'all' ? triggers.length : f === 'created' ? created : failed}
                </span>
              </button>
            ))}
          </div>
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search trigger name...'
            className='px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64'
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-white rounded border border-gray-200 overflow-x-auto'>
        <table className='min-w-full text-xs'>
          <thead>
            <tr className='bg-gray-50 border-b border-gray-200'>
              <th className='text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap'>#</th>
              <th className='text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap'>Trigger Name</th>
              <th className='text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap'>Trigger Status</th>
              <th className='text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap'>Permission Set Status</th>
              <th className='text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap'>Error</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className='px-4 py-8 text-center text-gray-400'>
                  No triggers match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((trigger, idx) => {
                const isFailed = trigger.status === 'FAILED';
                const errorMsg = trigger.error ? parseErrorMessage(trigger.error) : null;
                const isExpanded = expandedError === trigger.triggerName;

                return (
                  <tr key={trigger.triggerName} className={isFailed ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className='px-4 py-3 text-gray-400'>{idx + 1}</td>
                    <td className='px-4 py-3 font-mono text-gray-800'>{trigger.triggerName}</td>
                    <td className='px-4 py-3'>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                          isFailed
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isFailed ? 'bg-red-500' : 'bg-green-500'}`} />
                        {trigger.status}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      {trigger.permissionSetStatus ? (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700'>
                          <span className='w-1.5 h-1.5 rounded-full bg-green-500' />
                          {trigger.permissionSetStatus}
                        </span>
                      ) : (
                        <span className='text-gray-400'>—</span>
                      )}
                    </td>
                    <td className='px-4 py-3 max-w-xs'>
                      {errorMsg ? (
                        <div>
                          <p className={`text-red-600 ${!isExpanded ? 'truncate' : ''}`}>
                            {isExpanded ? errorMsg : errorMsg}
                          </p>
                          {errorMsg.length > 60 && (
                            <button
                              onClick={() => setExpandedError(isExpanded ? null : trigger.triggerName)}
                              className='text-blue-500 hover:underline mt-0.5'
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className='text-gray-400'>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
