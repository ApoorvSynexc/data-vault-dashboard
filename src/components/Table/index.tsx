import type { ReactNode } from 'react';

export type TableColumn<TRow> = {
  key: string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  render: (row: TRow) => ReactNode;
};

type TableProps<TRow> = {
  columns: TableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;
  rowClassName?: string;
  emptyState?: ReactNode;
  minWidthClassName?: string;
  maxHeightClassName?: string;
};

export default function Table<TRow>({
  columns,
  rows,
  getRowKey,
  rowClassName = 'border-t border-gray-100 hover:bg-gray-50',
  emptyState,
  minWidthClassName = 'min-w-full',
  maxHeightClassName,
}: TableProps<TRow>) {
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
    </div>
  );
}
