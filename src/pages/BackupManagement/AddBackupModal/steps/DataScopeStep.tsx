import { memo } from 'react';
import Typography from '../../../../components/Typography';
import type { BackupFieldErrors } from '../../../../validation/backup.validation';
import { SearchIcon } from '../components';
import type { DataScopeRow } from '../types';

type DataScopeStepProps = {
  filteredRows: DataScopeRow[];
  isLoading: boolean;
  search: string;
  selectedObjectIdSet: Set<string>;
  totalObjects: number;
  stepErrors: BackupFieldErrors;
  allVisibleSelected: boolean;
  isBulkSelectionPending: boolean;
  onSearchChange: (value: string) => void;
  onToggleAllVisible: () => void;
  onToggleRow: (id: string) => void;
};

export function DataScopeStep({
  filteredRows,
  isLoading,
  search,
  selectedObjectIdSet,
  totalObjects,
  stepErrors,
  allVisibleSelected,
  isBulkSelectionPending,
  onSearchChange,
  onToggleAllVisible,
  onToggleRow,
}: DataScopeStepProps) {
  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex items-center justify-between gap-3'>
        <Typography as='h2' variant='pageTitle' className='font-semibold'>
          Select Data Scope
        </Typography>
        {!isLoading && totalObjects > 0 && (
          <Typography variant='bodySm' color='muted'>
            Total objects: {totalObjects}
          </Typography>
        )}
      </div>
      <Typography className='mt-1' variant='bodySm' color='muted'>
        Choose the data and metadata that should be included in this backup policy.
      </Typography>

      <div className='mt-6 flex min-h-0 flex-1 flex-col'>
        {stepErrors.objects && (
          <div className='mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5'>
            <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4 shrink-0 text-red-500'>
              <circle cx='10' cy='10' r='8' />
              <path d='M10 6v4' strokeLinecap='round' />
              <circle cx='10' cy='13.5' r='0.5' fill='currentColor' />
            </svg>
            <Typography variant='bodySm' className='text-red-600'>{stepErrors.objects}</Typography>
          </div>
        )}

        <div className='relative max-w-[350px]'>
          <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2'>
            <SearchIcon />
          </span>
          <input
            type='text'
            value={search}
            disabled={isLoading}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder='Search Object'
            className='h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'
          />
        </div>
        <div className='mt-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-100'>
          {isLoading ? (
            <div className='flex h-full min-h-[320px] items-center justify-center bg-gray-50/50 px-6'>
              <div className='flex flex-col items-center gap-3 text-center'>
                <span className='h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent' />
                <div>
                  <Typography variant='bodySm' color='secondary'>
                    Loading objects...
                  </Typography>
                  <Typography variant='bodySm' color='muted' className='mt-1'>
                    Fetching available objects for this platform.
                  </Typography>
                </div>
              </div>
            </div>
          ) : (
            <div className='h-full overflow-y-auto'>
              <table className='w-full table-fixed'>
                <colgroup>
                  <col className='w-14' />
                  <col />
                  <col className='w-44' />
                  <col className='w-36' />
                </colgroup>
                <thead className='sticky top-0 z-10 bg-white'>
                  <tr className='border-b border-gray-100 bg-white'>
                    <th className='w-14 px-3 py-3 text-left'>
                      <input type='checkbox' checked={allVisibleSelected} disabled={isBulkSelectionPending} onChange={onToggleAllVisible} className='h-4 w-4 rounded border-gray-300 accent-blue-600' />
                    </th>
                    <th className='px-3 py-3 text-left'><Typography as='span' variant='label' color='secondary'>Object</Typography></th>
                    <th className='px-3 py-3 text-left'><Typography as='span' variant='label' color='secondary'>Type</Typography></th>
                    <th className='px-3 py-3 text-left'><Typography as='span' variant='label' color='secondary'>Total Records</Typography></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const checked = selectedObjectIdSet.has(row.id);
                    return <DataScopeTableRow key={row.id} row={row} checked={checked} onToggleRow={onToggleRow} />;
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && isBulkSelectionPending && (
            <div className='border-t border-gray-100 px-4 py-3'>
              <Typography variant='bodySm' color='muted'>Updating selection...</Typography>
            </div>
          )}
          {!isLoading && filteredRows.length === 0 && (
            <div className='border-t border-gray-100 px-4 py-3'>
              <Typography variant='bodySm' color='muted'>No objects available for this platform.</Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type DataScopeTableRowProps = {
  row: DataScopeRow;
  checked: boolean;
  onToggleRow: (id: string) => void;
};

const DataScopeTableRow = memo(function DataScopeTableRow({
  row,
  checked,
  onToggleRow,
}: DataScopeTableRowProps) {
  return (
    <tr className='border-b border-gray-100 last:border-b-0'>
      <td className='w-14 px-3 py-3 align-middle'>
        <input type='checkbox' checked={checked} onChange={() => onToggleRow(row.id)} className='h-4 w-4 rounded border-gray-300 accent-blue-600' />
      </td>
      <td className='px-3 py-3 align-middle'><Typography variant='bodySm' color='secondary'>{row.name}</Typography></td>
      <td className='px-3 py-3 align-middle'><Typography variant='bodySm' color='muted'>{row.type}</Typography></td>
      <td className='px-3 py-3 align-middle'><Typography variant='bodySm' color='muted'>{row.estimatedSize}</Typography></td>
    </tr>
  );
});
