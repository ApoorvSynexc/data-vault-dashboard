import type { ReactNode } from 'react';

export type TableColumn<TRow> = {
  key: string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  render: (row: TRow) => ReactNode;
};

type TablePagination = {
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
  pagination?: TablePagination;
};

export default function Table<TRow>({
  columns,
  rows,
  getRowKey,
  rowClassName = 'border-t border-gray-100 hover:bg-gray-50',
  emptyState,
  minWidthClassName = 'min-w-full',
  maxHeightClassName,
  pagination,
}: TableProps<TRow>) {
  const safePageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : 1;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.totalRecords / safePageSize)) : 1;

  return (
    <div className='overflow-x-auto'>
      <div className={maxHeightClassName ? `overflow-y-auto ${maxHeightClassName}` : ''}>
        <table className={`w-full ${minWidthClassName}`}>
          <thead className='sticky top-0 z-10'>
            <tr className='bg-gray-50'>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={[
                    'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap',
                    column.headerClassName ?? '',
                  ].join(' ')}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={getRowKey(row, index)} className={rowClassName}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        'px-4 py-3 whitespace-nowrap',
                        column.className ?? '',
                      ].join(' ')}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className='px-4 py-10 text-center text-sm text-gray-500'
                >
                  {emptyState ?? 'No records found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className='mt-3 flex items-center justify-between px-3 py-2 text-xs text-gray-700'>
          <span>
            Showing page {pagination.currentPage} of {totalPages} ({pagination.totalRecords} records)
          </span>
          <div className='flex items-center gap-1'>
            <button
              type='button'
              onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage <= 1}
              className='rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 disabled:opacity-50'
            >
              Prev
            </button>
            <button
              type='button'
              onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.currentPage + 1))}
              disabled={pagination.currentPage >= totalPages}
              className='rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 disabled:opacity-50'
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
