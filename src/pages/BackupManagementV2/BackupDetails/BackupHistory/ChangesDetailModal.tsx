import React, { useState } from 'react';
import dayjs from 'dayjs';

type ChangesDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  job?: any;
  onRefresh?: () => Promise<void>;
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

type FilterType = 'All' | 'New' | 'Updated' | 'Deleted';

export default function ChangesDetailModal({ isOpen, onClose, onBack, job, onRefresh }: ChangesDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'type' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const itemsPerPage = 10;

  if (!isOpen || !job) return null;

  const transformedData: ObjectDetail[] = (job.object || []).map((obj: any, idx: number) => {
    const nr = obj.insertCount || 0;
    const ur = obj.updateCount || 0;
    const dr = obj.deleteCount || 0;
    return {
      id: obj.bulkJobId ? obj.bulkJobId : `obj-${idx}`,
      name: obj.name || 'Unknown',
      type: obj.name?.includes('__c') ? 'Custom' : 'Standard',
      status: obj.status || 'UNKNOWN',
      newRecords: nr,
      updatedRecords: ur,
      deletedRecords: dr,
      errorMessage: obj.errorMessage,
    };
  });

  // Stats
  const newObjectsAdded = transformedData.filter(o => o.newRecords > 0).length;
  const newRecordsTotal = transformedData.reduce((s, o) => s + o.newRecords, 0);
  const updatedRecordsTotal = transformedData.reduce((s, o) => s + o.updatedRecords, 0);
  const deletedRecordsTotal = transformedData.reduce((s, o) => s + o.deletedRecords, 0);
  const objectsSynced = transformedData.length;

  const statCards = [
    { value: newObjectsAdded,     label: 'New Object Added',  color: '#008020', icon: <IconBox color='#008020' /> },
    { value: newRecordsTotal,     label: 'New Records',       color: '#008020', icon: <IconFile color='#008020' /> },
    { value: updatedRecordsTotal, label: 'Updated Records',   color: '#155DFC', icon: <IconEdit color='#155DFC' /> },
    { value: deletedRecordsTotal, label: 'Deleted Records',   color: '#F24400', icon: <IconTrash color='#F24400' /> },
    { value: objectsSynced,       label: 'Objects Synced',    color: '#155DFC', icon: <IconSync color='#155DFC' /> },
  ];

  // Filter
  let filtered = transformedData.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (activeFilter === 'New')     filtered = filtered.filter(o => o.newRecords > 0);
  if (activeFilter === 'Updated') filtered = filtered.filter(o => o.updatedRecords > 0);
  if (activeFilter === 'Deleted') filtered = filtered.filter(o => o.deletedRecords > 0);

  // Sort
  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortField].toLowerCase();
      const vb = b[sortField].toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIdx, startIdx + itemsPerPage);

  const toggleSort = (field: 'name' | 'type') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const startedAt = job.startedAt ? new Date(job.startedAt) : null;

  // Pagination numbers
  const pageNums: number[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else if (currentPage <= 3) {
    pageNums.push(1, 2, 3, 4, 5);
  } else if (currentPage >= totalPages - 2) {
    for (let i = totalPages - 4; i <= totalPages; i++) pageNums.push(i);
  } else {
    for (let i = currentPage - 2; i <= currentPage + 2; i++) pageNums.push(i);
  }

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center p-4'
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className='bg-white rounded-2xl w-full flex flex-col'
        style={{ maxWidth: '1024px', height: '86vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* ── Header ── */}
        <div className='flex items-start justify-between px-7 pt-6 pb-4 flex-shrink-0'>
          <div className='flex items-center gap-3'>
            {onBack && (
              <button
                onClick={onBack}
                className='p-1.5 rounded-lg hover:bg-gray-100 transition flex-shrink-0'
                style={{ color: '#6B7280' }}
                title='Back'
              >
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M19 12H5M12 5l-7 7 7 7' />
                </svg>
              </button>
            )}
            <div>
              <h2 className='font-bold' style={{ fontSize: '20px', color: '#111827' }}>
                Object Details{startedAt ? ` - ${dayjs(startedAt).format('MMMM D, YYYY | hh:mm A')}` : ''}
              </h2>
              <p className='text-sm mt-1' style={{ color: '#64748B' }}>Object updates details in backup →</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-lg hover:bg-gray-100 transition mt-0.5'
            style={{ color: '#6B7280' }}
          >
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className='px-7 pb-4 flex-shrink-0'>
          <div className='grid grid-cols-5 gap-3'>
            {statCards.map(({ value, label, color, icon }) => (
              <div
                key={label}
                className='rounded-xl px-4 pt-3 pb-3 flex flex-col gap-0.5'
                style={{ border: '1.5px solid #E8EDF5', background: '#fff' }}
              >
                <div className='flex items-start justify-between'>
                  <div>
                    <span className='text-2xl font-bold leading-tight block' style={{ color }}>{value}</span>
                    <span className='text-xs mt-0.5 block' style={{ color: '#64748B' }}>{label}</span>
                  </div>
                  <div className='mt-0.5'>{icon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search + Filter ── */}
        <div className='px-7 pb-3 flex items-center gap-2 flex-shrink-0'>
          <div className='relative'>
            <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#9CA3AF' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='11' cy='11' r='8' /><path d='M21 21l-4.35-4.35' />
              </svg>
            </div>
            <input
              type='text'
              placeholder='Search Object'
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className='pl-8 pr-4 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              style={{ border: '1.5px solid #E5E7EB', color: '#33363F', width: '200px' }}
            />
          </div>

          {(['All', 'New', 'Updated', 'Deleted'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => { setActiveFilter(f); setCurrentPage(1); }}
              className='px-4 py-1.5 rounded-full text-sm font-medium transition'
              style={activeFilter === f
                ? { background: '#155DFC', color: '#fff' }
                : { background: '#F3F4F6', color: '#374151' }
              }
            >
              {f}
            </button>
          ))}

          <button
            onClick={async () => {
              setIsRefreshing(true);
              try { if (onRefresh) await onRefresh(); }
              finally { setIsRefreshing(false); }
            }}
            disabled={isRefreshing}
            className='p-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 ml-1'
            style={{ color: '#64748B' }}
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
            </svg>
          </button>
        </div>

        {/* ── Table ── */}
        <div className='flex-1 overflow-auto mx-7 rounded-xl relative' style={{ border: '1.5px solid #E8EDF5', minHeight: 0 }}>
          {isRefreshing && (
            <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm'>
              <svg className='w-8 h-8 animate-spin text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
              </svg>
              <p className='text-sm font-medium text-gray-500'>Refreshing data...</p>
            </div>
          )}
          <table className='w-full' style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #E8EDF5', background: '#fff' }}>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151', width: '48px' }}>
                  SL No.
                </th>
                <th
                  className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none'
                  style={{ color: '#374151', width: '22%' }}
                  onClick={() => toggleSort('name')}
                >
                  <span className='flex items-center gap-1'>
                    Object
                    <SortIcon active={sortField === 'name'} dir={sortDir} />
                  </span>
                </th>
                <th
                  className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none'
                  style={{ color: '#374151', width: '13%' }}
                  onClick={() => toggleSort('type')}
                >
                  <span className='flex items-center gap-1'>
                    Type
                    <SortIcon active={sortField === 'type'} dir={sortDir} />
                  </span>
                </th>
                <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151', width: '12%' }}>
                  Status
                </th>
                {['New Records', 'Updated Records', 'Deleted Records'].map(h => (
                  <th key={h} className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide' style={{ color: '#374151' }}>
                    {h}
                  </th>
                ))}
                <th style={{ width: '40px' }} />
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className='px-5 py-12 text-center text-sm' style={{ color: '#64748B' }}>
                    No objects found.
                  </td>
                </tr>
              ) : paginatedData.map((item, idx) => (
                <React.Fragment key={item.id}>
                <tr
                  style={{ borderBottom: !expandedRows.has(item.id) && idx < paginatedData.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  className='hover:bg-gray-50 transition-colors'
                >
                  {/* SL No. */}
                  <td className='px-5 py-3.5'>
                    <span className='text-sm' style={{ color: '#6B7280' }}>{startIdx + idx + 1}</span>
                  </td>
                  {/* Object Name */}
                  <td className='px-5 py-3.5'>
                    <span className='text-sm font-medium' style={{ color: '#111827' }}>{item.name}</span>
                  </td>
                  {/* Type */}
                  <td className='px-5 py-3.5'>
                    <span className='text-sm' style={{ color: '#374151' }}>{item.type}</span>
                  </td>
                  {/* Status */}
                  <td className='px-5 py-3.5'>
                    <StatusBadge status={item.status} />
                  </td>
                  {/* New Records */}
                  <td className='px-5 py-3.5'>
                    <span className='text-sm' style={{ color: '#374151' }}>{item.newRecords}</span>
                  </td>
                  {/* Updated Records */}
                  <td className='px-5 py-3.5'>
                    <span className='text-sm' style={{ color: '#374151' }}>{item.updatedRecords}</span>
                  </td>
                  {/* Deleted Records */}
                  <td className='px-5 py-3.5'>
                    <span className='text-sm' style={{ color: '#374151' }}>{item.deletedRecords}</span>
                  </td>
                  {/* Chevron */}
                  <td className='pr-4 py-3.5 text-center'>
                    <button
                      onClick={() => toggleRow(item.id)}
                      className='p-0.5 rounded hover:bg-gray-100 transition'
                    >
                      <svg
                        width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#94A3B8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
                        className={`transition-transform ${expandedRows.has(item.id) ? 'rotate-180' : ''}`}
                      >
                        <polyline points='6 9 12 15 18 9' />
                      </svg>
                    </button>
                  </td>
                </tr>
                {/* Expanded detail row */}
                {expandedRows.has(item.id) && (
                  <tr style={{ borderBottom: idx < paginatedData.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <td colSpan={8} className='px-5 pb-3.5 pt-0'>
                      {item.errorMessage ? (
                        <div className='flex items-start gap-2 rounded-lg px-4 py-3' style={{ background: 'rgba(242,68,0,0.06)', border: '1px solid rgba(242,68,0,0.2)' }}>
                          <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='mt-0.5 shrink-0'>
                            <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                          </svg>
                          <span className='text-xs font-medium' style={{ color: '#F24400' }}>{parseErrorMessage(item.errorMessage!)}</span>
                        </div>
                      ) : (
                        <div className='flex items-center gap-2 rounded-lg px-4 py-3' style={{ background: 'rgba(0,128,32,0.06)', border: '1px solid rgba(0,128,32,0.2)' }}>
                          <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#008020' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='shrink-0'>
                            <path d='M20 6L9 17l-5-5' />
                          </svg>
                          <span className='text-xs font-medium' style={{ color: '#008020' }}>{item.name} is backed up successfully</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className='flex items-center justify-between px-7 py-4 flex-shrink-0'>
          <p className='text-sm font-medium' style={{ color: '#155DFC' }}>
            Showing {Math.min(startIdx + itemsPerPage, filtered.length)} of {filtered.length} Object
          </p>
          <div className='flex items-center gap-1'>
            {pageNums.map(n => (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                className='w-7 h-7 rounded-md text-xs font-medium transition flex items-center justify-center'
                style={currentPage === n
                  ? { background: '#155DFC', color: '#fff' }
                  : { background: '#F3F4F6', color: '#374151' }
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Parse raw error string into a readable message ── */
function parseErrorMessage(raw: string): string {
  try {
    // Strip leading prefix like "[create-bulk-job] HTTP Error 400: "
    const jsonStart = raw.indexOf('[{');
    if (jsonStart !== -1) {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (Array.isArray(parsed) && parsed[0]?.message) {
        // Extract just the core message, strip leading whitespace/newlines
        return parsed[0].message.trim().split('\n').pop()?.trim() || parsed[0].message.trim();
      }
    }
  } catch {
    // fall through to raw
  }
  return raw;
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  let bg = '#F3F4F6', color = '#374151';
  if (s === 'SUCCESS' || s === 'COMPLETED') { bg = 'rgba(0,128,32,0.1)'; color = '#008020'; }
  else if (s === 'FAILED') { bg = 'rgba(242,68,0,0.1)'; color = '#F24400'; }
  else if (s === 'RUNNING' || s === 'IN_PROGRESS') { bg = 'rgba(21,93,252,0.1)'; color = '#155DFC'; }
  else if (s === 'PENDING') { bg = 'rgba(234,179,8,0.1)'; color = '#A16207'; }
  const label = s === 'SUCCESS' || s === 'COMPLETED' ? 'Completed'
    : s === 'FAILED' ? 'Failed'
    : s === 'RUNNING' || s === 'IN_PROGRESS' ? 'Running'
    : s === 'PENDING' ? 'Pending'
    : status || 'Unknown';
  return (
    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap' style={{ background: bg, color }}>
      {label}
    </span>
  );
}

/* ── Icons ── */
function IconBox({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
    </svg>
  );
}
function IconFile({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' />
    </svg>
  );
}
function IconEdit({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
      <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
    </svg>
  );
}
function IconSync({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='23 4 23 10 17 10' /><polyline points='1 20 1 14 7 14' />
      <path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' />
    </svg>
  );
}
function IconTrash({ color }: { color: string }) {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
      <path d='M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
    </svg>
  );
}
function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke={active ? '#155DFC' : '#9CA3AF'} strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
      {active && dir === 'asc'
        ? <polyline points='18 15 12 9 6 15' />
        : active && dir === 'desc'
        ? <polyline points='6 9 12 15 18 9' />
        : <><polyline points='8 9 12 5 16 9' /><polyline points='8 15 12 19 16 15' /></>
      }
    </svg>
  );
}
