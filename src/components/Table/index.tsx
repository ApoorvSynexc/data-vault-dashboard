import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';

// ── Column definition ─────────────────────────────────────────────────────────

export type TableColumn<TRow> = {
  key: string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  render: (row: TRow, index: number) => ReactNode;
  width?: string;
};

// ── Selection props ───────────────────────────────────────────────────────────

export type SelectableTableProps<TRow> = {
  showCheckbox?: boolean;
  hideSelectAll?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: TRow) => string;
  isRowSelectable?: (row: TRow) => boolean;
  getRowClassName?: (row: TRow, isSelected: boolean) => string;
};

// ── Pagination configs ────────────────────────────────────────────────────────

/** Standard page-number pagination (legacy + new) */
type PagePaginationConfig = {
  type?: 'page';
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (nextPage: number) => void;
  /** When set, this page number is used for footer display/highlight while currentPage controls internal slicing. */
  displayPage?: number;
};

/** Cursor-based pagination (prev / next only) */
export type CursorPaginationConfig = {
  type: 'cursor';
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** e.g. "Showing 1–20 of 143" — computed by caller */
  label?: string;
  /** ReactNode override for label — use when you need inline spinner etc. */
  labelNode?: React.ReactNode;
};

type PaginationConfig = PagePaginationConfig | CursorPaginationConfig;

// ── Loading skeleton ──────────────────────────────────────────────────────────

type SkeletonConfig = {
  /** Number of skeleton rows to show. Default: 5 */
  rows?: number;
  /** Column widths for skeleton cells, e.g. ['w-32','w-20','w-24']. Cycles if fewer than columns. */
  colWidths?: string[];
};

// ── Header variants ───────────────────────────────────────────────────────────

type HeaderVariant = 'default' | 'uppercase';

// ── Main props ────────────────────────────────────────────────────────────────

type TableProps<TRow> = {
  columns: TableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;

  /** Static class applied to every body row */
  rowClassName?: string | ((row: TRow, isSelected?: boolean) => string);
  /** Inline style per body row */
  getRowStyle?: (row: TRow, isSelected: boolean) => CSSProperties;
  /** Click handler for a body row */
  onRowClick?: (row: TRow) => void;

  emptyState?: ReactNode;
  minWidthClassName?: string;
  maxHeightClassName?: string;
  minHeightClassName?: string;

  /** Remove outer border/bg so table blends into a parent Panel */
  borderless?: boolean;

  /** Extra className applied to the <table> element */
  tableClassName?: string;

  /** Header style variant. 'default' = medium gray, 'uppercase' = semibold uppercase tracking */
  headerVariant?: HeaderVariant;

  // ── Loading ────────────────────────────────────────────────────────────────
  /** Show loading skeleton instead of rows */
  loading?: boolean;
  skeletonConfig?: SkeletonConfig;

  // ── Pagination ─────────────────────────────────────────────────────────────
  /** Legacy page pagination — kept for backwards compatibility */
  pagination?: PagePaginationConfig;
  /** New unified pagination (page or cursor) */
  paginationConfig?: PaginationConfig;
  /** true = show internal page pagination, false = inner scroll */
  showPagination?: boolean;
  /** Height of scroll container when showPagination is false */
  height?: string;
  /** Items per page for internal pagination. Default: 10 */
  itemsPerPage?: number;

  paginationClassName?: string;
  hidePaginationSummary?: boolean;
  /** Overrides the default "Showing X to Y of Z" summary text */
  paginationSummary?: string;
  /** When true, hides page number buttons and shows only Prev / Page X of Y / Next — for cursor-based pagination */
  cursorMode?: boolean;
  /** Called when the user clicks the fixed page-1 circle in cursor mode — should reset cursor and go to page 1 */
  cursorFirstPageFn?: () => void;
  /** Called when ← Prev is clicked in cursor mode — parent pops the cursor stack */
  cursorOnPrev?: () => void;

  // ── Serial number ──────────────────────────────────────────────────────────
  showSerialNumber?: boolean;
  serialNumberStart?: number;

  // ── Cell padding ───────────────────────────────────────────────────────────
  cellPaddingClassName?: string;
} & SelectableTableProps<TRow>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Table<TRow>({
  columns,
  rows,
  getRowKey,
  rowClassName = 'border-b border-gray-200 hover:bg-gray-50',
  getRowStyle,
  onRowClick,
  emptyState,
  minWidthClassName = 'min-w-full',
  maxHeightClassName,
  minHeightClassName,
  borderless = false,
  tableClassName = '',
  headerVariant = 'default',
  loading = false,
  skeletonConfig,
  pagination,
  paginationConfig,
  showPagination = false,
  itemsPerPage = 10,

  paginationClassName,
  hidePaginationSummary = false,
  paginationSummary,
  cursorMode = false,
  cursorFirstPageFn,
  cursorOnPrev,
  showCheckbox = false,
  hideSelectAll = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  isRowSelectable,
  getRowClassName,
  showSerialNumber = false,
  serialNumberStart = 1,
  cellPaddingClassName = 'px-4 py-3',
}: TableProps<TRow>) {
  const [internalPage, setInternalPage] = useState(1);

  // ── Pagination logic ───────────────────────────────────────────────────────

  const isCursorPagination = paginationConfig?.type === 'cursor';
  const isLegacyPagination = !!pagination && !showPagination;
  const usePagination = !!pagination || showPagination || (paginationConfig && !isCursorPagination);
  const showFooter = usePagination || isCursorPagination;

  const totalRecords = pagination?.totalRecords ?? rows.length;
  const pageSize     = pagination?.pageSize ?? itemsPerPage;
  const safePageSize = pageSize > 0 ? pageSize : 1;
  const totalPages   = Math.max(1, Math.ceil(totalRecords / safePageSize));
  const activePage   = pagination?.currentPage ?? internalPage;
  const displayPage  = (pagination as PagePaginationConfig)?.displayPage ?? activePage;

  const startIndex   = (activePage - 1) * safePageSize;
  const endIndex     = startIndex + safePageSize;
  const paginatedRows = (usePagination && !isCursorPagination) ? rows.slice(startIndex, endIndex) : rows;

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (pagination?.onPageChange) pagination.onPageChange(clamped);
    else setInternalPage(clamped);
  };


  // ── Column count (for colSpan) ─────────────────────────────────────────────

  const colCount =
    columns.length +
    (showSerialNumber ? 1 : 0) +
    (showCheckbox ? 1 : 0);

  // ── Skeleton rows ──────────────────────────────────────────────────────────

  const skeletonRows  = skeletonConfig?.rows ?? 5;
  const skeletonWidths = skeletonConfig?.colWidths ?? ['w-32', 'w-20', 'w-24', 'w-16', 'w-28'];

  // ── Header cell class ──────────────────────────────────────────────────────

  const headerCellClass =
    headerVariant === 'uppercase'
      ? `${cellPaddingClassName} text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap`
      : `${cellPaddingClassName} text-left text-sm font-medium text-gray-600 whitespace-nowrap`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={[
        'flex flex-col flex-1 min-h-0',
        borderless ? '' : 'bg-white rounded border border-gray-200',
        minHeightClassName ?? '',
      ].join(' ')}
    >
      {/* Horizontal scroll wrapper */}
      <div className='overflow-x-auto flex-1 min-h-0'>
        {/* Vertical scroll wrapper */}
        <div
          className={
            maxHeightClassName
              ? `overflow-y-auto ${maxHeightClassName} h-full relative`
              : isCursorPagination || (!isLegacyPagination && !pagination?.onPageChange)
                ? 'overflow-y-auto h-full relative'
                : 'h-full relative'
          }
        >
          <table className={`w-full ${minWidthClassName} ${tableClassName}`}>

            {/* ── Head ── */}
            <thead className='sticky top-0 z-20 bg-white'>
              <tr className='border-b border-gray-200 shadow-sm'>
                {showCheckbox && hideSelectAll && <th className={cellPaddingClassName} />}
                {showCheckbox && !hideSelectAll && (
                  <th className={`${cellPaddingClassName} text-left`}>
                    <input
                      type='checkbox'
                      checked={(() => {
                        const selectable = paginatedRows.filter((r) => isRowSelectable?.(r) !== false);
                        return (
                          selectable.length > 0 &&
                          selectable.every((r) => selectedIds?.has(getRowId?.(r) ?? getRowKey(r, 0)))
                        );
                      })()}
                      ref={(el) => {
                        if (!el) return;
                        const selectable = paginatedRows.filter((r) => isRowSelectable?.(r) !== false);
                        const n = selectable.filter((r) => selectedIds?.has(getRowId?.(r) ?? getRowKey(r, 0))).length;
                        el.indeterminate = n > 0 && n < selectable.length;
                      }}
                      onChange={() => {
                        const selectable = paginatedRows.filter((r) => isRowSelectable?.(r) !== false);
                        const allSelected = selectable.every((r) => selectedIds?.has(getRowId?.(r) ?? getRowKey(r, 0)));
                        const next = new Set(selectedIds ?? []);
                        selectable.forEach((r) => {
                          const id = getRowId?.(r) ?? getRowKey(r, 0);
                          allSelected ? next.delete(id) : next.add(id);
                        });
                        onSelectionChange?.(next);
                      }}
                      className='w-5 h-5 rounded accent-blue-600 cursor-pointer'
                    />
                  </th>
                )}
                {showSerialNumber && (
                  <th className={headerCellClass}>SL No.</th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={[headerCellClass, col.headerClassName ?? ''].join(' ')}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {loading ? (
                /* Skeleton */
                Array.from({ length: skeletonRows }).map((_, ri) => (
                  <tr key={`skel-${ri}`} className='border-b border-gray-100'>
                    {showCheckbox && (
                      <td className={cellPaddingClassName}>
                        <div className='h-4 w-4 rounded bg-gray-100 animate-pulse' />
                      </td>
                    )}
                    {showSerialNumber && (
                      <td className={cellPaddingClassName}>
                        <div className='h-3 w-6 rounded bg-gray-100 animate-pulse' />
                      </td>
                    )}
                    {columns.map((col, ci) => (
                      <td key={col.key} className={cellPaddingClassName}>
                        <div
                          className={`h-3 rounded bg-gray-100 animate-pulse ${
                            skeletonWidths[ci % skeletonWidths.length]
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => {
                  const rowId   = getRowId?.(row) ?? getRowKey(row, index);
                  const isSel   = selectedIds?.has(rowId) ?? false;
                  const rowCls  = getRowClassName?.(row, isSel) ??
                    (typeof rowClassName === 'function' ? rowClassName(row, isSel) : rowClassName);
                  const rowStyle = getRowStyle?.(row, isSel);
                  const serial  = serialNumberStart + index;
                  return (
                    <tr
                      key={getRowKey(row, index)}
                      className={[rowCls, onRowClick ? 'cursor-pointer' : ''].join(' ')}
                      style={rowStyle}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {showCheckbox && (
                        <td
                          className={cellPaddingClassName}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type='checkbox'
                            checked={isSel}
                            onChange={() => {
                              const next = new Set(selectedIds ?? []);
                              next.has(rowId) ? next.delete(rowId) : next.add(rowId);
                              onSelectionChange?.(next);
                            }}
                            disabled={isRowSelectable ? !isRowSelectable(row) : false}
                            className='w-5 h-5 rounded accent-blue-600 cursor-pointer disabled:cursor-not-allowed'
                          />
                        </td>
                      )}
                      {showSerialNumber && (
                        <td className={`${cellPaddingClassName} text-sm text-gray-600`}>{serial}</td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={[cellPaddingClassName, col.className ?? ''].join(' ')}
                          style={col.width ? { width: col.width } : undefined}
                          onClick={col.key === 'action' ? (e) => e.stopPropagation() : undefined}
                        >
                          {col.render(row, index)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={colCount} className='px-4 py-10 text-center text-sm text-gray-500'>
                    {emptyState ?? 'No records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination Footer ── */}
      {showFooter && (
        <div
          className={[
            'flex flex-shrink-0 items-center justify-between border-t border-gray-200 mt-auto',
            paginationClassName ?? 'px-4 py-3',
          ].join(' ')}
        >
          {/* ── Cursor pagination ── */}
          {isCursorPagination && (() => {
            const cp = paginationConfig as CursorPaginationConfig;
            return (
              <>
                <p className='text-sm text-gray-600'>{cp.labelNode ?? cp.label ?? ''}</p>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={cp.onPrev}
                    disabled={!cp.hasPrev}
                    className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900 transition'
                  >
                    ← Prev
                  </button>
                  <button
                    type='button'
                    onClick={cp.onNext}
                    disabled={!cp.hasNext}
                    className='px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900 transition'
                  >
                    Next →
                  </button>
                </div>
              </>
            );
          })()}

          {/* ── Page pagination ── */}
          {!isCursorPagination && usePagination && (
            <>
              {hidePaginationSummary ? <span /> : (
                <p className='text-sm text-gray-600'>
                  {paginationSummary ?? `Showing ${(displayPage - 1) * safePageSize + 1} to ${Math.min(displayPage * safePageSize, totalRecords)} of ${totalRecords}`}
                </p>
              )}
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => cursorMode ? cursorOnPrev?.() : handlePageChange(displayPage - 1)}
                    disabled={displayPage <= 1}
                    className={cursorMode
                      ? 'px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                      : 'px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'}
                  >
                    {cursorMode ? '← Prev' : '<'}
                  </button>

                  {cursorMode ? (
                    <div className='flex items-center gap-1.5'>
                      {/* Fixed page-1 circle — always visible, clicking resets to page 1 */}
                      <button
                        type='button'
                        onClick={() => cursorFirstPageFn?.()}
                        className={`w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center transition-colors ${
                          displayPage === 1
                            ? 'bg-blue-600 text-white cursor-default'
                            : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                        disabled={displayPage === 1}
                      >
                        1
                      </button>
                      {/* Current page circle — only shown when user is beyond page 1 */}
                      {displayPage > 1 && (
                        <span className='w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium flex items-center justify-center'>
                          {displayPage}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className='flex items-center gap-1'>
                      {(() => {
                        const pages: (number | string)[] = [];
                        const maxVis  = 5;
                        const halfVis = Math.floor(maxVis / 2);
                        if (totalPages <= maxVis) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (displayPage > halfVis + 1) pages.push('...');
                          const start = Math.max(2, displayPage - halfVis);
                          const end   = Math.min(totalPages - 1, displayPage + halfVis);
                          for (let i = start; i <= end; i++) {
                            if (!pages.includes(i)) pages.push(i);
                          }
                          if (displayPage < totalPages - halfVis - 1) pages.push('...');
                          if (!pages.includes(totalPages)) pages.push(totalPages);
                        }
                        return pages.map((p, idx) =>
                          p === '...' ? (
                            <span key={`dots-${idx}`} className='px-2 text-gray-400'>...</span>
                          ) : (
                            <button
                              key={p as number}
                              type='button'
                              onClick={() => handlePageChange(p as number)}
                              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                                displayPage === p
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {p}
                            </button>
                          )
                        );
                      })()}
                    </div>
                  )}

                  <button
                    type='button'
                    onClick={() => handlePageChange(displayPage + 1)}
                    disabled={displayPage >= totalPages}
                    className={cursorMode
                      ? 'px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                      : 'px-3 py-1 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-900'}
                  >
                    {cursorMode ? 'Next →' : '>'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
