import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import type { SelectedArchiveObject } from '../Step3';
import ProgressBar from '../ProgressBar';

// ─── helpers ────────────────────────────────────────────────────────────────

function calcDataSize(records: number): string {
  const kb = records * 2;
  if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`;
  return `${kb} KB`;
}

function fmtNumber(n: number | undefined): string {
  if (n === undefined) return '--';
  return n.toLocaleString();
}

// ─── dummy filtered-record rows ──────────────────────────────────────────────

const DUMMY_FIELDS = ['Id', 'Name', 'CreatedDate', 'LastModifiedDate', 'Status', 'OwnerId', 'Email', 'Phone', 'Amount', 'Stage'];

function generateDummyRows(objectName: string, count: number, filters: SelectedArchiveObject['archivalPayload']) {
  const fieldNames = filters?.field?.length
    ? ['Id', 'Name', ...filters.field.map((f) => f.name)].slice(0, 6)
    : DUMMY_FIELDS.slice(0, 6);

  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, string> = {};
    fieldNames.forEach((field) => {
      if (field === 'Id') row[field] = `00${objectName.slice(0, 3).toUpperCase()}${String(i + 1001).padStart(6, '0')}`;
      else if (field === 'Name') row[field] = `${objectName} Record ${i + 1}`;
      else if (field.toLowerCase().includes('date')) row[field] = new Date(Date.now() - i * 86400000 * 7).toISOString().slice(0, 10);
      else if (field.toLowerCase().includes('email')) row[field] = `user${i + 1}@example.com`;
      else if (field.toLowerCase().includes('phone')) row[field] = `+1-555-${String(i + 1000).slice(1)}`;
      else if (field.toLowerCase().includes('amount')) row[field] = `$${((i + 1) * 1234.56).toFixed(2)}`;
      else if (field.toLowerCase().includes('stage')) row[field] = ['Prospecting', 'Qualification', 'Closed Won', 'Closed Lost'][i % 4];
      else if (field.toLowerCase().includes('status')) row[field] = ['Active', 'Inactive', 'Pending'][i % 3];
      else row[field] = `Value ${i + 1}`;
    });
    return { fields: fieldNames, row };
  });
}

// ─── Record Detail Popup ──────────────────────────────────────────────────────

interface RecordPopupProps {
  object: SelectedArchiveObject;
  recordCount: number | undefined;
  onClose: () => void;
}

function RecordPopup({ object, recordCount, onClose }: RecordPopupProps) {
  const [page, setPage] = useState(0);
  const ROWS_PER_PAGE = 10;

  const allRows = useMemo(
    () => generateDummyRows(object.name, Math.min(recordCount ?? 50, 100), object.archivalPayload),
    [object.name, recordCount, object.archivalPayload]
  );

  const totalPages = Math.ceil(allRows.length / ROWS_PER_PAGE);
  const pageRows = allRows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const fieldNames = allRows[0]?.fields ?? [];

  const activeFilters = object.archivalPayload?.field?.filter((f) => f.name) ?? [];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div className='bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh]'
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}>

        {/* Header */}
        <div className='flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0'
                style={{ background: 'rgba(21,93,252,0.08)' }}>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' /><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' />
                </svg>
              </div>
              <h2 className='text-lg font-bold text-gray-900'>{object.name}</h2>
              <span className='text-xs font-medium px-2 py-0.5 rounded-full'
                style={{ background: object.type === 'CUSTOM' ? 'rgba(124,58,237,0.08)' : 'rgba(21,93,252,0.08)', color: object.type === 'CUSTOM' ? '#7C3AED' : '#155DFC' }}>
                {object.type === 'CUSTOM' ? 'Custom' : 'Standard'}
              </span>
            </div>
            <p className='text-sm text-gray-500'>
              Dry run preview — showing filtered records that will be archived
              {recordCount !== undefined && <span className='ml-1 font-semibold text-gray-700'>({fmtNumber(recordCount)} total)</span>}
            </p>
          </div>
          <button onClick={onClose}
            className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0'>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* Applied Filters */}
        {activeFilters.length > 0 && (
          <div className='px-6 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-2 flex-wrap'>
            <span className='text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1'>Filters Applied:</span>
            {activeFilters.map((f, i) => (
              <span key={i} className='inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg'
                style={{ background: 'rgba(21,93,252,0.06)', color: '#155DFC', border: '1px solid rgba(21,93,252,0.15)' }}>
                <span className='font-bold'>{f.name}</span>
                <span className='opacity-60'>{f.filter.operator}</span>
                <span>"{f.filter.value}"</span>
              </span>
            ))}
            <span className='ml-auto text-xs text-gray-400 italic'>* Showing dummy preview data</span>
          </div>
        )}

        {/* Table */}
        <div className='flex-1 min-h-0 overflow-auto'>
          <table className='w-full border-collapse text-sm'>
            <thead className='sticky top-0 z-10 bg-white'>
              <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                <th className='px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12'>#</th>
                {fieldNames.map((f) => (
                  <th key={f} className='px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap'>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((item, idx) => (
                <tr key={idx} className='hover:bg-gray-50 transition-colors' style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td className='px-4 py-3 text-xs text-gray-400 tabular-nums'>{page * ROWS_PER_PAGE + idx + 1}</td>
                  {fieldNames.map((f) => (
                    <td key={f} className='px-4 py-3 text-sm text-gray-700 max-w-xs truncate'>{item.row[f] ?? '--'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className='px-6 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between'>
          <span className='text-xs text-gray-400'>
            Showing {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, allRows.length)} of {allRows.length} preview rows
          </span>
          <div className='flex items-center gap-1'>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className='px-2 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gray-800'>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i).slice(Math.max(0, page - 2), page + 3).map((i) => (
              <button key={i} onClick={() => setPage(i)}
                className='w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-colors'
                style={{ background: page === i ? '#155DFC' : 'transparent', color: page === i ? 'white' : '#64748B' }}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className='px-2 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gray-800'>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Step3DryRunProps {
  crmId?: string | null;
  selectedObjects: SelectedArchiveObject[];
  onNext: () => void;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 10;

export default function Step3DryRun({ crmId, selectedObjects, onNext, onBack }: Step3DryRunProps) {
  const backupConfigService = useBackupConfigService();
  const [activePopup, setActivePopup] = useState<SelectedArchiveObject | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const objectIds = useMemo(() => selectedObjects.map((o) => o.id), [selectedObjects]);

  const { data: countResponse, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['dry-run-counts', crmId, objectIds],
    queryFn: async () => {
      if (objectIds.length === 0) return { objectCounts: {} };
      try {
        const response = await backupConfigService.getObjectCountList(crmId ?? '', objectIds);
        const objectCounts: Record<string, number> = {};
        const results = (response?.data as any)?.results;
        if (Array.isArray(results)) {
          results.forEach((obj: any) => {
            const key = obj.apiName ?? obj.objectApiName;
            if (key && obj.recordCount !== undefined) objectCounts[key] = obj.recordCount;
          });
        }
        return { objectCounts };
      } catch {
        return { objectCounts: {} };
      }
    },
    enabled: !!crmId && objectIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const objectCountMap: Record<string, number> = countResponse?.objectCounts ?? {};

  // Stat card totals
  const totalRecords = useMemo(
    () => Object.values(objectCountMap).reduce((s, n) => s + n, 0),
    [objectCountMap]
  );
  const totalDataSize = useMemo(() => calcDataSize(totalRecords), [totalRecords]);

  // Pagination
  const totalPages = Math.ceil(selectedObjects.length / ITEMS_PER_PAGE) || 1;
  const offset = currentPage * ITEMS_PER_PAGE;
  const pageObjects = selectedObjects.slice(offset, offset + ITEMS_PER_PAGE);

  return (
    <>
      {activePopup && (
        <RecordPopup
          object={activePopup}
          recordCount={objectCountMap[activePopup.id]}
          onClose={() => setActivePopup(null)}
        />
      )}

      <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
        <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 min-h-0 gap-4'>

          {/* Breadcrumb */}
          <div className='flex items-center gap-2 flex-shrink-0'>
            <Link to='/archive-vault' className='font-semibold text-sm text-gray-700 hover:text-blue-600 transition-colors'>
              Archive Vault
            </Link>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='9 18 15 12 9 6' />
            </svg>
            <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Archive</span>
          </div>

          {/* Progress bar — step 3 still active (dry run is part of "Data" step) */}
          <ProgressBar activeStep={3} />

          {/* Header */}
          <div className='flex items-start justify-between flex-shrink-0 gap-4'>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Dry Run</h1>
                <span className='inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full'
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                  </svg>
                  Preview Only
                </span>
              </div>
              <p className='text-gray-600 mt-1 text-sm sm:text-base'>
                Review the filtered records per object before proceeding. Click any row to inspect records.
              </p>
            </div>
            <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0'>
              Step <span className='text-blue-600'>4</span> of 6
            </span>
          </div>

          {/* Stat Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 flex-shrink-0'>
            {/* Total Records */}
            <div className='bg-white rounded-xl px-5 py-4 flex items-center gap-4'
              style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className='w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0'
                style={{ background: 'rgba(21,93,252,0.08)' }}>
                <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                  <ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' /><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' />
                </svg>
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5'>Total Records</p>
                {isLoadingCounts ? (
                  <div className='h-7 w-24 rounded bg-gray-100 animate-pulse' />
                ) : (
                  <p className='text-2xl font-bold text-gray-900'>{fmtNumber(totalRecords)}</p>
                )}
                <p className='text-xs text-gray-400 mt-0.5'>across {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Estimated Data Size */}
            <div className='bg-white rounded-xl px-5 py-4 flex items-center gap-4'
              style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className='w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0'
                style={{ background: 'rgba(5,150,105,0.08)' }}>
                <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#059669' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                  <rect x='2' y='3' width='20' height='14' rx='2' /><path d='M8 21h8m-4-4v4' />
                </svg>
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5'>Estimated Data Size</p>
                {isLoadingCounts ? (
                  <div className='h-7 w-20 rounded bg-gray-100 animate-pulse' />
                ) : (
                  <p className='text-2xl font-bold text-gray-900'>{totalDataSize}</p>
                )}
                <p className='text-xs text-gray-400 mt-0.5'>estimated at 2 KB per record</p>
              </div>
            </div>
          </div>

          {/* Objects Table */}
          <div className='bg-white rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden'
            style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Table header bar */}
            <div className='px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0'>
              <div>
                <h2 className='text-sm font-semibold text-gray-800'>Selected Objects</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Click a row to preview filtered records for that object</p>
              </div>
              <span className='text-xs font-semibold px-2.5 py-1 rounded-full'
                style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC' }}>
                {selectedObjects.length} Object{selectedObjects.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className='flex-1 min-h-0 overflow-y-auto'>
              <table className='w-full border-collapse'>
                <thead className='sticky top-0 z-10 bg-white'>
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    <th className='px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12'>S.No</th>
                    <th className='px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Object Name</th>
                    <th className='px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell'>Type</th>
                    <th className='px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider'>Records</th>
                    <th className='px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell'>Est. Data Size</th>
                    <th className='px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell'>Filters Applied</th>
                    <th className='px-4 sm:px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider'>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {pageObjects.map((obj, idx) => {
                    const count = objectCountMap[obj.id];
                    const dataSize = count !== undefined ? calcDataSize(count) : '--';
                    const filterCount = obj.archivalPayload?.field?.filter((f) => f.name).length ?? 0;

                    return (
                      <tr key={obj.uuid}
                        className='cursor-pointer transition-colors group'
                        style={{ borderBottom: '1px solid #F8FAFC' }}
                        onClick={() => setActivePopup(obj)}>
                        <td className='px-4 sm:px-5 py-3.5 text-sm text-gray-400 tabular-nums'>{offset + idx + 1}</td>
                        <td className='px-4 sm:px-5 py-3.5'>
                          <div className='flex items-center gap-2.5'>
                            <div className='w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform'
                              style={{ background: 'rgba(21,93,252,0.08)' }}>
                              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' /><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' />
                              </svg>
                            </div>
                            <div>
                              <p className='text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors'>{obj.name}</p>
                              <p className='text-xs text-gray-400 sm:hidden'>{obj.type === 'CUSTOM' ? 'Custom' : 'Standard'}</p>
                            </div>
                          </div>
                        </td>
                        <td className='px-4 sm:px-5 py-3.5 hidden sm:table-cell'>
                          <span className='text-xs font-medium px-2 py-0.5 rounded-md'
                            style={{ background: obj.type === 'CUSTOM' ? 'rgba(124,58,237,0.08)' : 'rgba(21,93,252,0.06)', color: obj.type === 'CUSTOM' ? '#7C3AED' : '#155DFC' }}>
                            {obj.type === 'CUSTOM' ? 'Custom' : 'Standard'}
                          </span>
                        </td>
                        <td className='px-4 sm:px-5 py-3.5'>
                          {isLoadingCounts ? (
                            <div className='h-4 w-16 rounded bg-gray-100 animate-pulse' />
                          ) : (
                            <span className='text-sm font-semibold text-gray-800 tabular-nums'>{fmtNumber(count)}</span>
                          )}
                        </td>
                        <td className='px-4 sm:px-5 py-3.5 hidden md:table-cell'>
                          {isLoadingCounts ? (
                            <div className='h-4 w-14 rounded bg-gray-100 animate-pulse' />
                          ) : (
                            <span className='text-sm text-gray-600'>{dataSize}</span>
                          )}
                        </td>
                        <td className='px-4 sm:px-5 py-3.5 hidden lg:table-cell'>
                          {filterCount > 0 ? (
                            <div className='flex items-center gap-1.5'>
                              <div className='w-4 h-4 rounded-full flex items-center justify-center'
                                style={{ background: '#155DFC' }}>
                                <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
                                  <polyline points='20 6 9 17 4 12' />
                                </svg>
                              </div>
                              <span className='text-xs font-medium text-gray-700'>{filterCount} filter{filterCount !== 1 ? 's' : ''}</span>
                            </div>
                          ) : (
                            <span className='text-xs text-gray-400'>—</span>
                          )}
                        </td>
                        <td className='px-4 sm:px-5 py-3.5 text-center'>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActivePopup(obj); }}
                            className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all group-hover:scale-105'
                            style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC', border: '1px solid rgba(21,93,252,0.15)' }}>
                            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                              <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' /><circle cx='12' cy='12' r='3' />
                            </svg>
                            <span className='hidden sm:inline'>View Records</span>
                            <span className='sm:hidden'>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedObjects.length === 0 && (
                    <tr>
                      <td colSpan={7} className='px-5 py-16 text-center text-sm text-gray-400'>
                        No objects were selected in the previous step.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='px-5 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between'>
                <span className='text-sm text-gray-500'>
                  Showing {offset + 1}–{Math.min(offset + ITEMS_PER_PAGE, selectedObjects.length)} of {selectedObjects.length} Objects
                </span>
                <div className='flex items-center gap-1'>
                  <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}
                    className='px-2 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gray-800'>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                    <button key={i} onClick={() => setCurrentPage(i)}
                      className='w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-colors'
                      style={{ background: currentPage === i ? '#155DFC' : 'white', color: currentPage === i ? 'white' : '#64748B', border: currentPage === i ? 'none' : '1px solid #E2E8F0' }}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
                    className='px-2 py-1 text-sm text-gray-500 disabled:opacity-30 hover:text-gray-800'>›</button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Sticky Footer */}
        <div className='flex-shrink-0 flex justify-between px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200'>
          <button
            onClick={() => window.location.href = '/archive-vault'}
            className='px-5 sm:px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm'>
            Cancel
          </button>
          <div className='flex gap-3'>
            <button
              onClick={onBack}
              className='px-5 sm:px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm'>
              ← Back
            </button>
            <button
              onClick={onNext}
              className='px-5 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm bg-blue-600 text-white hover:bg-blue-700'>
              Next →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
