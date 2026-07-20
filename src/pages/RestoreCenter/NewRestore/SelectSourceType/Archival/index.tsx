import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from '../../../../../components/Table';
import type { TableColumn } from '../../../../../components/Table';
import Typography from '../../../../../components/Typography';
import { useRestoreService } from '../../../../../services/restore/restore.service';
import { formatBytes, formatDateTime } from '../../../../../utils';
import type { Destination } from '../../../../../services/destination/destination.service';

export interface ArchivalSelection {
  backupConfigId: string;
}

interface Props {
  selectedConnection: Destination | null;
  onSelectionChange: (selection: ArchivalSelection | null) => void;
}

export default function ArchivalPicker({ selectedConnection, onSelectionChange }: Props) {
  const restoreService = useRestoreService();

  const [filterName, setFilterName] = useState('');
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageLogs, setPageLogs] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [selectedKey, setSelectedKey] = useState<string>('');

  const currentCursor = cursorStack[pageIndex];

  const { isLoading, isFetching } = useQuery<unknown>({
    queryKey: ['snapshot-logs-archive', selectedConnection?.destinationId, currentCursor],
    queryFn: async () => {
      const res = await restoreService.getSnapshotLogs({
        snapshotType: 'ARCHIVAL',
        destinationId: selectedConnection!.destinationId,
        limit: 10,
        cursor: currentCursor,
      });
      setPageLogs((res as any)?.data ?? []);
      setNextCursor((res as any)?.meta?.nextCursor);
      return res;
    },
    enabled: !!selectedConnection,
  });

  const goNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => {
      const next = [...prev];
      if (next[pageIndex + 1] !== nextCursor) next[pageIndex + 1] = nextCursor;
      return next;
    });
    setPageIndex((p) => p + 1);
  };

  const goPrev = () => {
    if (pageIndex === 0) return;
    setPageIndex((p) => p - 1);
  };

  const filteredLogs = pageLogs.filter((log: any) => {
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase();
      if (!(log.configName ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const columns: TableColumn<any>[] = [
    {
      key: 'radio',
      header: '',
      width: '40px',
      render: (log) => (
        <input
          type='radio'
          name='archive-row'
          checked={selectedKey === (log.backupConfigId ?? '')}
          onChange={() => {
            setSelectedKey(log.backupConfigId ?? '');
            onSelectionChange({ backupConfigId: log.backupConfigId ?? '' });
          }}
          onClick={(e) => e.stopPropagation()}
          className='w-4 h-4 accent-blue-600 cursor-pointer'
        />
      ),
    },
    {
      key: 'configName',
      header: 'Config Name',
      render: (log) => (
        <div className='flex items-center gap-2'>
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 border border-gray-100'>
            <span className='text-[10px] font-bold text-purple-500'>A</span>
          </div>
          <span className='text-sm font-semibold text-gray-900'>{log.configName ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'sourceName',
      header: 'Source',
      render: (log) => <span className='text-xs text-gray-600'>{log.sourceName ?? '—'}</span>,
    },
    {
      key: 'lastJobRunTime',
      header: 'Last Job Run',
      render: (log) => <span className='text-xs text-gray-600 whitespace-nowrap'>{log.lastJobRunTime ? formatDateTime(log.lastJobRunTime) : '—'}</span>,
    },
    {
      key: 'selectedObjectCount',
      header: 'Objects',
      render: (log) => <span className='text-xs text-gray-600 tabular-nums'>{log.selectedObjectCount != null ? log.selectedObjectCount : '—'}</span>,
    },
    {
      key: 'dataSize',
      header: 'Data Size',
      render: (log) => <span className='text-xs text-gray-600 tabular-nums'>{log.dataSize != null ? formatBytes(log.dataSize) : '—'}</span>,
    },
  ];

  return (
    <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm' style={{ minHeight: '500px' }}>
      <div className='flex-shrink-0 flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>Choose an Archive Vault Entry</Typography>
      </div>
      <div className='flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex-wrap'>
        <span className='text-xs font-bold text-gray-600'>Filter:</span>
        <input
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder='Config name'
          className='h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 outline-none focus:border-blue-400 min-w-0 w-44'
        />
      </div>
      <Table
        columns={columns}
        rows={filteredLogs}
        getRowKey={(log: any, i: number) => log.backupConfigId ?? `${i}`}
        loading={isLoading || isFetching}
        skeletonConfig={{ rows: 5, colWidths: ['w-8', 'w-40', 'w-28', 'w-28', 'w-16', 'w-20'] }}
        headerVariant='uppercase'
        borderless
        showSerialNumber
        serialNumberStart={pageIndex * 10 + 1}
        onRowClick={(log: any) => {
          setSelectedKey(log.backupConfigId ?? '');
          onSelectionChange({ backupConfigId: log.backupConfigId ?? '' });
        }}
        getRowClassName={(log: any) => {
          const isSelected = selectedKey === (log.backupConfigId ?? '');
          return `border-b border-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`;
        }}
        emptyState='No archive entries found.'
        paginationConfig={{
          type: 'cursor',
          hasPrev: pageIndex > 0,
          hasNext: !!nextCursor,
          onPrev: goPrev,
          onNext: goNext,
          label: `Page ${pageIndex + 1} · ${filteredLogs.length} entries`,
        }}
      />
    </div>
  );
}
