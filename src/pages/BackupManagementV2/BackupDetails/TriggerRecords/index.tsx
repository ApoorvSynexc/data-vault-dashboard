import { useState } from 'react';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';

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
  const failed  = triggers.filter((t) => t.status === 'FAILED').length;

  const filtered = triggers.filter((t) => {
    const matchesFilter = filter === 'all' || t.status.toLowerCase() === filter;
    const matchesSearch = t.triggerName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const parseErrorMessage = (error: string): string => {
    try {
      const match = error.match(/\[(.+)\]/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed[0]?.message ?? error;
      }
    } catch { /* fall through */ }
    return error;
  };

  const columns: TableColumn<TriggerRecord>[] = [
    {
      key: 'triggerName',
      header: 'Trigger Name',
      render: (t) => <span className='font-mono text-gray-800'>{t.triggerName}</span>,
    },
    {
      key: 'triggerStatus',
      header: 'Trigger Status',
      render: (t) => {
        const isFailed = t.status === 'FAILED';
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${isFailed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isFailed ? 'bg-red-500' : 'bg-green-500'}`} />
            {t.status}
          </span>
        );
      },
    },
    {
      key: 'permissionSetStatus',
      header: 'Permission Set Status',
      render: (t) => t.permissionSetStatus ? (
        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700'>
          <span className='w-1.5 h-1.5 rounded-full bg-green-500' />
          {t.permissionSetStatus}
        </span>
      ) : <span className='text-gray-400'>—</span>,
    },
    {
      key: 'error',
      header: 'Error',
      className: 'max-w-xs',
      render: (t) => {
        const errorMsg = t.error ? parseErrorMessage(t.error) : null;
        if (!errorMsg) return <span className='text-gray-400'>—</span>;
        const isExpanded = expandedError === t.triggerName;
        return (
          <div>
            <p className={`text-red-600 ${!isExpanded ? 'truncate' : ''}`}>{errorMsg}</p>
            {errorMsg.length > 60 && (
              <button
                onClick={() => setExpandedError(isExpanded ? null : t.triggerName)}
                className='text-blue-500 hover:underline mt-0.5 text-xs'
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

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
      <Table<TriggerRecord>
        columns={columns}
        rows={filtered}
        getRowKey={(t) => t.triggerName}
        showSerialNumber
        headerVariant='uppercase'
        cellPaddingClassName='px-4 py-3'
        getRowClassName={(t) => t.status === 'FAILED' ? 'bg-red-50' : 'hover:bg-gray-50'}
        emptyState='No triggers match your filter.'
        tableClassName='min-w-full text-xs'
      />
    </div>
  );
}
