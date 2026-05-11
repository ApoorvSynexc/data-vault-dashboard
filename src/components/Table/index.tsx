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

export type SelectableTableProps<TRow> = {
  showCheckbox?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: TRow) => string;
  isRowSelectable?: (row: TRow) => boolean;
  getRowClassName?: (row: TRow, isSelected: boolean) => string;
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
  rowClassName?: string | ((row: TRow, isSelected?: boolean) => string);
  emptyState?: ReactNode;
  minWidthClassName?: string;
  maxHeightClassName?: string;
  /** Minimum height of the table container (e.g., 'min-h-96', 'min-h-[500px]') */
  minHeightClassName?: string;
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
  /** Show serial number column. Default: false */
  showSerialNumber?: boolean;
  /** Starting number for serial number column. Default: 1. Useful for external pagination */
  serialNumberStart?: number;
} & SelectableTableProps<TRow>;

export default function Table<TRow>({
  columns,
  rows,
  getRowKey,
  rowClassName = 'border-b border-gray-200 hover:bg-gray-50',
  emptyState,
  minWidthClassName = 'min-w-full',
  maxHeightClassName,
  minHeightClassName,
  pagination,
  showPagination = false,
  height = 'h-96',
  itemsPerPage = 10,
  showPageNumbers = true,
  paginationClassName,
  showCheckbox = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  isRowSelectable,
  getRowClassName,
  showSerialNumber = false,
  serialNumberStart = 1,
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
    <div className={`bg-white rounded border border-gray-200 flex flex-col ${minHeightClassName || ''}`}>
      {/* Horizontal scroll wrapper */}
      <div className='overflow-x-auto flex-1'>
        {/* Vertical scroll wrapper - only when not using legacy pagination */}
        <div
          className={
            !isLegacyPagination && !pagination?.onPageChange
              ? `overflow-y-auto ${scrollContainerHeight} h-full relative`
              : maxHeightClassName
                ? `overflow-y-auto ${maxHeightClassName} h-full relative`
                : 'h-full relative'
          }
        >
          <table className={`w-full ${minWidthClassName}`}>
            <thead className='sticky top-0 z-20 bg-white'>
              <tr className='border-b border-gray-200 shadow-sm'>
                {showSerialNumber && (
                  <th className='px-4 py-3 text-left text-sm font-medium text-gray-600 whitespace-nowrap'>
                    #
                  </th>
                )}
                {showCheckbox && (
                  <th className='px-4 py-3 text-left'>
                    <input
                      type='checkbox'
                      checked={(() => {
                        const selectableRows = paginatedRows.filter((row) => isRowSelectable?.(row) !== false);
                        return (
                          selectableRows.length > 0 &&
                          selectableRows.every((row) => {
                            const id = getRowId?.(row) || getRowKey(row, 0);
                            return selectedIds?.has(id);
                          })
                        );
                      })()}
                      ref={(input) => {
                        if (input) {
                          const selectableRows = paginatedRows.filter((row) => isRowSelectable?.(row) !== false);
                          const selectedCount = selectableRows.filter((row) => {
                            const id = getRowId?.(row) || getRowKey(row, 0);
                            return selectedIds?.has(id);
                          }).length;
                          input.indeterminate = selectedCount > 0 && selectedCount < selectableRows.length;
                        }
                      }}
                      onChange={() => {
                        const selectableRows = paginatedRows.filter((row) => isRowSelectable?.(row) !== false);
                        const allSelected = selectableRows.every((row) => {
                          const id = getRowId?.(row) || getRowKey(row, 0);
                          return selectedIds?.has(id);
                        });

                        const newSelected = new Set(selectedIds || []);
                        if (allSelected) {
                          selectableRows.forEach((row) => {
                            const id = getRowId?.(row) || getRowKey(row, 0);
                            newSelected.delete(id);
                          });
                        } else {
                          selectableRows.forEach((row) => {
                            const id = getRowId?.(row) || getRowKey(row, 0);
                            newSelected.add(id);
                          });
                        }
                        onSelectionChange?.(newSelected);
                      }}
                      className='w-5 h-5 rounded accent-blue-600 cursor-pointer'
                    />
                  </th>
                )}
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
                paginatedRows.map((row, index) => {
                  const isSelected = selectedIds?.has(getRowId?.(row) || getRowKey(row, index));
                  const computedRowClassName = getRowClassName?.(row, isSelected || false) || (typeof rowClassName === 'function' ? rowClassName(row, isSelected) : rowClassName);
                  const serialNumber = serialNumberStart + index;
                  return (
                    <tr key={getRowKey(row, index)} className={computedRowClassName}>
                      {showSerialNumber && (
                        <td className='px-4 py-3 text-sm text-gray-600'>{serialNumber}</td>
                      )}
                      {showCheckbox && (
                        <td className='px-4 py-3'>
                          <input
                            type='checkbox'
                            checked={isSelected || false}
                            onChange={() => {
                              const id = getRowId?.(row) || getRowKey(row, index);
                              const newSelected = new Set(selectedIds || []);
                              if (newSelected.has(id)) {
                                newSelected.delete(id);
                              } else {
                                newSelected.add(id);
                              }
                              onSelectionChange?.(newSelected);
                            }}
                            disabled={!isRowSelectable?.(row)}
                            className='w-5 h-5 rounded accent-blue-600 cursor-pointer disabled:cursor-not-allowed'
                          />
                        </td>
                      )}
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length + (showSerialNumber ? 1 : 0) + (showCheckbox ? 1 : 0)} className='px-4 py-10 text-center text-sm text-gray-500'>
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
            Showing {(activePage - 1) * safePageSize + 1} to {Math.min(activePage * safePageSize, totalRecords)} of {totalRecords}
          </p>

          <div className='flex items-center gap-4'>
            {/* Pagination Controls */}
            <div className='flex items-center gap-2'>
              {/* Previous Button */}
              <button
                type='button'
                onClick={() => handlePageChange(activePage - 1)}
                disabled={activePage <= 1}
                className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'
              >
                &lt;
              </button>

              {/* Page Numbers */}
              {showPageNumbers && (
                <div className='flex items-center gap-1'>
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisiblePages = 5;
                    const halfVisible = Math.floor(maxVisiblePages / 2);

                    if (totalPages <= maxVisiblePages) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      pages.push(1);
                      if (activePage > halfVisible + 1) pages.push('...');

                      const start = Math.max(2, activePage - halfVisible);
                      const end = Math.min(totalPages - 1, activePage + halfVisible);

                      for (let i = start; i <= end; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }

                      if (activePage < totalPages - halfVisible - 1) pages.push('...');
                      if (!pages.includes(totalPages)) pages.push(totalPages);
                    }

                    return pages.map((page, idx) => {
                      if (page === '...') {
                        return (
                          <span key={`dots-${idx}`} className='px-2 text-gray-400'>
                            ...
                          </span>
                        );
                      }
                      const pageNum = page as number;
                      return (
                        <button
                          key={pageNum}
                          type='button'
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                            activePage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Next Button */}
              <button
                type='button'
                onClick={() => handlePageChange(activePage + 1)}
                disabled={activePage >= totalPages}
                className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
