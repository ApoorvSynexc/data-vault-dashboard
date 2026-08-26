import { useState } from 'react';
import RecoveryModal from './RecoveryModal';

type TriggerResult = {
  objectApiName: string;
  triggerName?: string;
  status: string;
  permissionSetStatus?: string;
  permissionSetError?: string;
  error?: string;
  needsRecoveryRecordId?: boolean;
};

type TriggerRecordsProps = {
  backup: any;
};

type FilterType = 'all' | 'created' | 'failed';

export default function TriggerRecords({ backup }: TriggerRecordsProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<string | null>(null);

  const triggers: TriggerResult[] = backup?.triggerResults ?? [];

  const created = triggers.filter((t) => t.status === 'CREATED' || t.status === 'EXIST').length;
  const failed  = triggers.filter((t) => t.status === 'FAILED').length;

  const filtered = triggers.filter((t) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'created' && (t.status === 'CREATED' || t.status === 'EXIST')) ||
      (filter === 'failed' && t.status === 'FAILED');
    const matchesSearch = (t.objectApiName ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!triggers.length) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
        <svg className='w-12 h-12 mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M13 10V3L4 14h7v7l9-11h-7z' />
        </svg>
        <p className='text-sm font-medium'>No trigger records found</p>
        <p className='text-xs mt-1'>This backup does not have any real-time trigger records.</p>
      </div>
    );
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const isFailed = status === 'FAILED';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isFailed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isFailed ? 'bg-red-500' : 'bg-green-500'}`} />
        {status}
      </span>
    );
  };

  return (
    <div className='space-y-4'>
      {/* Summary Cards */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-xs text-gray-500 mb-1'>Total Objects</p>
          <p className='text-2xl font-bold text-gray-900'>{triggers.length}</p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-xs text-gray-500 mb-1'>Triggers Created</p>
          <p className='text-2xl font-bold text-green-600'>{created}</p>
        </div>
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
          <p className='text-xs text-gray-500 mb-1'>Failed</p>
          <p className='text-2xl font-bold text-red-500'>{failed}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className='bg-white rounded-lg border border-gray-200 p-4'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <div className='flex gap-2'>
            {(['all', 'created', 'failed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filter === f
                    ? f === 'failed' ? 'bg-red-100 text-red-700'
                    : f === 'created' ? 'bg-green-100 text-green-700'
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
            placeholder='Search object name...'
            className='px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64'
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-white rounded-lg border border-gray-200 overflow-x-auto'>
        <table className='table-fixed text-xs w-full' style={{ minWidth: '900px' }}>
          <thead>
            <tr className='bg-gray-50 border-b border-gray-200'>
              <th className='px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide' style={{ width: '44px' }}>SL</th>
              <th className='px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide' style={{ width: '150px' }}>Object</th>
              <th className='px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide' style={{ width: '220px' }}>Apex Trigger</th>
              <th className='px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide' style={{ width: '110px' }}>Trigger Status</th>
              <th className='px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide' style={{ width: '130px' }}>Permission Set</th>
              <th className='px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide' style={{ width: '220px' }}>Error</th>
              <th className='px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide' style={{ width: '90px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className='px-4 py-10 text-center text-gray-400'>No triggers match your filter.</td>
              </tr>
            ) : (
              filtered.map((t, idx) => {
                const errorMsg = t.error ?? t.permissionSetError ?? null;
                const isExpanded = expandedError === t.objectApiName;
                return (
                  <tr key={t.objectApiName} className={`border-b border-gray-100 ${t.status === 'FAILED' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className='px-3 py-3 text-gray-500'>{idx + 1}</td>
                    <td className='px-3 py-3 font-semibold text-gray-800 truncate'>{t.objectApiName}</td>
                    <td className='px-3 py-3'>
                      <span className='font-mono text-gray-600 block truncate' title={t.triggerName}>{t.triggerName ?? '—'}</span>
                    </td>
                    <td className='px-3 py-3'><StatusBadge status={t.status} /></td>
                    <td className='px-3 py-3'>
                      {t.permissionSetStatus
                        ? <StatusBadge status={t.permissionSetStatus} />
                        : <span className='text-gray-400'>—</span>}
                    </td>
                    <td className='px-3 py-3'>
                      {errorMsg ? (
                        <div>
                          <p className={`text-red-600 break-words ${!isExpanded ? 'line-clamp-2' : ''}`}>{errorMsg}</p>
                          {errorMsg.length > 80 && (
                            <button
                              onClick={() => setExpandedError(isExpanded ? null : t.objectApiName)}
                              className='text-blue-500 hover:underline mt-0.5 text-xs'
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className='text-gray-400'>—</span>
                      )}
                    </td>
                    <td className='px-3 py-3'>
                      {t.status === 'FAILED' && t.needsRecoveryRecordId ? (
                        <button
                          onClick={() => setRecoveryTarget(t.objectApiName)}
                          className='px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                        >
                          Recover
                        </button>
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

      {recoveryTarget && (
        <RecoveryModal
          backupConfigId={backup?.backupConfigId}
          slug={backup?.slug}
          objectApiName={recoveryTarget}
          onClose={() => setRecoveryTarget(null)}
        />
      )}
    </div>
  );
}
