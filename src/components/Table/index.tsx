import type { ReactNode } from 'react';
import { useState } from 'react';

export type TableColumn<TRow> = {
  key: string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  render: (row: TRow, index: number) => ReactNode;
  width?: string;
};

type TablePaginationConfig = {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (nextPage: number) => void;
};

type TableProps<TRow> = {
  columns: TableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;
  rowClassName?: string;
  emptyState?: ReactNode;
  minWidthClassName?: string;
  maxHeightClassName?: string;
  /** Legacy pagination prop for backward compatibility */
  pagination?: TablePaginationConfig;
  /** New pagination control: true to show pagination, false for inner scroll */
  showPagination?: boolean;
  /** Height of the table container (e.g., 'h-96', '600px'). Only used when showPagination is false */
  height?: string;
  /** Items per page for internal pagination. Default: 10 */
  itemsPerPage?: number;
  /** Show numbered pagination buttons. Default: true */
  showPageNumbers?: boolean;
  /** Custom styling for pagination container */
  paginationClassName?: string;
};

export default function Table<TRow>({
  columns,
  rows,
  getRowKey,
  rowClassName = 'border-b border-gray-200 hover:bg-gray-50',
  emptyState,
  minWidthClassName = 'min-w-full',
  maxHeightClassName,
  pagination,
  showPagination = false,
  height = 'h-96',
  itemsPerPage = 10,
  showPageNumbers = true,
  paginationClassName,
}: TableProps<TRow>) {
  const [internalPage, setInternalPage] = useState(1);

  // Handle both old and new pagination APIs
  const isLegacyPagination = !!pagination && !showPagination;
  const usePagination = !!pagination || showPagination;

  // Calculate pagination
  const totalRecords = pagination?.totalRecords || rows.length;
  const pageSize = pagination?.pageSize || itemsPerPage;
  const safePageSize = pageSize && pageSize > 0 ? pageSize : 1;
  const totalPages = Math.max(1, Math.ceil(totalRecords / safePageSize));
  const activePage = pagination?.currentPage || internalPage;

  // Get paginated rows
  const startIndex = (activePage - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;
  const paginatedRows = usePagination ? rows.slice(startIndex, endIndex) : rows;

  const handlePageChange = (nextPage: number) => {
    const newPage = Math.max(1, Math.min(totalPages, nextPage));
    if (pagination?.onPageChange) {
      pagination.onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const scrollContainerHeight = height === 'h-96' ? 'max-h-96' : height.startsWith('h-') ? `max-${height}` : height;

  return (
    <div className='bg-white rounded border border-gray-200'>
      {/* Horizontal scroll wrapper */}
      <div className='overflow-x-auto'>
        {/* Vertical scroll wrapper - only when not using legacy pagination */}
        <div
          className={
            !isLegacyPagination && !pagination?.onPageChange
              ? `overflow-y-auto ${scrollContainerHeight}`
              : maxHeightClassName
                ? `overflow-y-auto ${maxHeightClassName}`
                : ''
          }
        >
          <table className={`w-full ${minWidthClassName}`}>
            <thead className='sticky top-0 z-10 bg-white'>
              <tr className='border-b border-gray-200'>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={[
                      'px-4 py-3 text-left text-sm font-medium text-gray-600 whitespace-nowrap',
                      column.headerClassName ?? '',
                    ].join(' ')}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => (
                  <tr key={getRowKey(row, index)} className={rowClassName}>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={['px-4 py-3', column.className ?? ''].join(' ')}
                        style={column.width ? { width: column.width } : undefined}
                      >
                        {column.render(row, index)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className='px-4 py-10 text-center text-sm text-gray-500'>
                    {emptyState ?? 'No records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {usePagination && (
        <div className={`flex items-center justify-between border-t border-gray-200 px-4 py-3 ${paginationClassName || ''}`}>
          <p className='text-sm text-gray-600'>
            Showing {Math.min(safePageSize, paginatedRows.length)} of {totalRecords}
          </p>
          <div className='flex gap-1'>
            {/* Previous Button */}
            <button
              type='button'
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage <= 1}
              className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              ← Prev
            </button>

            {/* Page Numbers */}
            {showPageNumbers &&
              Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type='button'
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    activePage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

            {/* Next Button */}
            <button
              type='button'
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage >= totalPages}
              className='px-2 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
