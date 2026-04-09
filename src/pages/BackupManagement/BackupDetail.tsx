import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackupConfigService,
  type BackupJobItem,
} from '../../services/backup-config/backup-config.service';
import Typography from '../../components/Typography';
import Table, { type TableColumn } from '../../components/Table';
import type { PlatformType } from './AddBackupModal';
import { capitalize } from '../../utils';

type ConfigStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | string;
type BackupStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | string;
type ScheduleType = 'SCHEDULE' | 'REALTIME' | string;

function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<string, { letter: string; bg: string; fill: string }> = {
    Salesforce: { letter: 'S', bg: 'bg-sky-50', fill: '#0ea5e9' },
    HubSpot: { letter: 'H', bg: 'bg-orange-50', fill: '#f97316' },
    Zoho: { letter: 'Z', bg: 'bg-emerald-50', fill: '#10b981' },
  };
  const current = config[platform] ?? { letter: platform?.[0] ?? '?', bg: 'bg-gray-50', fill: '#6b7280' };

  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center rounded-lg border border-gray-100',
        current.bg,
        'h-10 w-10',
      ].join(' ')}
    >
      <svg viewBox='0 0 40 40' className='h-10 w-10' aria-hidden='true'>
        <rect x='5' y='5' width='30' height='30' rx='9' fill={current.fill} fillOpacity='0.16' />
        <text x='20' y='24' textAnchor='middle' fontSize='14' fontWeight='700' fill={current.fill}>
          {current.letter}
        </text>
      </svg>
    </div>
  );
}

function ConfigStatusBadge({ status }: { status: ConfigStatus }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-slate-100 text-slate-600',
    ERROR: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    ERROR: 'Error',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: 'bg-emerald-100 text-emerald-700',
    RUNNING: 'bg-amber-100 text-amber-700',
    FAILED: 'bg-red-100 text-red-700',
    PENDING: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = {
    SUCCESS: 'Completed',
    RUNNING: 'Running',
    FAILED: 'Failed',
    PENDING: 'Pending',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function BackupStatusBadge({ status }: { status: BackupStatus }) {
  return <JobStatusBadge status={status} />;
}

function ScheduleBadge({ schedule }: { schedule: ScheduleType }) {
  const isRealtime = schedule === 'REALTIME';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        isRealtime ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
      }`}
    >
      {isRealtime ? (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
          <circle cx='12' cy='12' r='10' />
          <circle cx='12' cy='12' r='3' fill='currentColor' stroke='none' />
        </svg>
      ) : (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
          <circle cx='12' cy='12' r='10' />
          <polyline points='12 6 12 12 16 14' />
        </svg>
      )}
      {isRealtime ? 'Realtime' : 'Schedule'}
    </span>
  );
}

function JobTypeBadge({ jobType }: { jobType: string }) {
  const isRealtime = jobType === 'REALTIME';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        isRealtime ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
      }`}
    >
      {isRealtime ? (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
          <circle cx='12' cy='12' r='10' />
          <circle cx='12' cy='12' r='3' fill='currentColor' stroke='none' />
        </svg>
      ) : (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
          <rect x='3' y='3' width='18' height='18' rx='3' />
          <polyline points='8 12 11 15 16 9' />
        </svg>
      )}
      {isRealtime ? 'Realtime' : 'Bulk'}
    </span>
  );
}

function OperationBadge({ operation }: { operation: string }) {
  const styles: Record<string, string> = {
    UPDATE: 'bg-amber-100 text-amber-700',
    INSERT: 'bg-emerald-100 text-emerald-700',
    DELETE: 'bg-red-100 text-red-700',
    UPSERT: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[operation] ?? 'bg-gray-100 text-gray-600'}`}>
      {capitalize(operation)}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between border-b border-gray-100 py-3 last:border-0'>
      <Typography variant='bodySm' color='muted'>
        {label}
      </Typography>
      <div className='text-right'>{children}</div>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? 'h-4 w-32'}`} />;
}

function buildJobColumns(
  onResume: (jobId: string) => void,
  resumingJobId: string | null,
  page: number,
  pageSize: number,
): TableColumn<BackupJobItem>[] {
  return [
    {
      key: 'serial',
      header: '#',
      headerClassName: 'w-10',
      render: (_row, index) => (
        <Typography variant='bodySm' color='muted'>
          {(page - 1) * pageSize + index + 1}
        </Typography>
      ),
    },
    {
      key: 'jobType',
      header: 'Job Type',
      render: (row) => <JobTypeBadge jobType={row.jobType} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <JobStatusBadge status={row.status} />,
    },
    {
      key: 'object',
      header: 'Object(s)',
      className: 'text-xs text-gray-500',
      render: (row) => {
        if (row.jobType === 'REALTIME') return row.objectApiName ?? '--';
        return row.object?.length ? `${row.object.length} object${row.object.length !== 1 ? 's' : ''}` : '--';
      },
    },
    {
      key: 'operation',
      header: 'Operation',
      render: (row) => {
        if (row.jobType === 'REALTIME') return row.operation ? <OperationBadge operation={row.operation} /> : '--';
        return <span className='text-xs text-gray-400'>--</span>;
      },
    },
    {
      key: 'records',
      header: 'Records',
      className: 'text-xs text-gray-500',
      render: (row) => {
        if (row.jobType === 'REALTIME') return row.recordCount != null ? row.recordCount.toLocaleString() : '--';
        if (!row.object?.length) return '--';
        const completed = row.object.reduce((s, o) => s + (o.completedRecordCount ?? 0), 0);
        const total = row.object.reduce((s, o) => s + (o.totalRecordCount ?? 0), 0);
        return `${completed.toLocaleString()} / ${total.toLocaleString()}`;
      },
    },
    {
      key: 'size',
      header: 'Size',
      className: 'text-xs text-gray-500',
      render: (row) => {
        const bytes =
          row.jobType === 'REALTIME'
            ? (row.sizeInBytes ?? 0)
            : (row.object?.reduce((s, o) => s + (o.sizeInBytes ?? 0), 0) ?? 0);
        return bytes ? formatBytes(bytes) : '--';
      },
    },
    {
      key: 'schemaChanged',
      header: 'Schema Changed',
      render: (row) => {
        if (row.jobType !== 'REALTIME') return <span className='text-xs text-gray-400'>--</span>;
        return row.schemaChanged ? (
          <span className='inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700'>Yes</span>
        ) : (
          <span className='inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500'>No</span>
        );
      },
    },
    {
      key: 'startedAt',
      header: 'Started At',
      className: 'text-xs text-gray-500',
      render: (row) => (row.startedAt ? new Date(row.startedAt).toLocaleString() : '--'),
    },
    {
      key: 'completedAt',
      header: 'Completed At',
      className: 'text-xs text-gray-500',
      render: (row) => (row.completedAt ? new Date(row.completedAt).toLocaleString() : '--'),
    },
    {
      key: 'destination',
      header: 'Destination',
      className: 'text-xs text-gray-500',
      render: (row) => row.destination?.type ?? '--',
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => {
        if (row.status !== 'FAILED') return null;
        const isResuming = resumingJobId === row.backupJobId;
        return (
          <button
            type='button'
            disabled={isResuming}
            onClick={() => onResume(row.backupJobId)}
            className='inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60'
          >
            {isResuming ? (
              <span className='h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent' />
            ) : (
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-2.5 w-2.5'>
                <polygon points='5 3 19 12 5 21 5 3' fill='currentColor' stroke='none' />
              </svg>
            )}
            {isResuming ? 'Resuming…' : 'Resume'}
          </button>
        );
      },
    },
  ];
}

export default function BackupDetail() {
  const { slug } = useParams<{ slug: string }>();
  const backupConfigService = useBackupConfigService();
  const queryClient = useQueryClient();

  const [jobPage, setJobPage] = useState(1);
  const [jobCursorMap, setJobCursorMap] = useState<Record<number, string | null>>({ 1: null });
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const currentJobCursor = jobCursorMap[jobPage] ?? null;

  const resumeMutation = useMutation({
    mutationFn: (backupJobId: string) => backupConfigService.resumeBackupJob(backupJobId),
    onMutate: (backupJobId) => setResumingJobId(backupJobId),
    onSettled: () => {
      setResumingJobId(null);
      queryClient.invalidateQueries({ queryKey: ['backup-jobs', slug] });
    },
  });

  const detailQuery = useQuery({
    queryKey: ['backup-config-detail', slug],
    queryFn: () => backupConfigService.getBackupConfig(slug!),
    enabled: !!slug,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const jobsQuery = useQuery({
    queryKey: ['backup-jobs', slug, currentJobCursor],
    queryFn: () => backupConfigService.listBackupJobs(slug!, true, currentJobCursor ?? undefined),
    enabled: !!slug,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const res = jobsQuery.data as any;
    const payload = res?.data;
    const meta = Array.isArray(payload) ? res?.meta : payload?.meta;
    const nextCursor = meta?.nextCursor ?? null;
    if (nextCursor && jobCursorMap[jobPage + 1] === undefined) {
      setJobCursorMap((prev) => ({ ...prev, [jobPage + 1]: nextCursor }));
    }
  }, [jobsQuery.data]);

  const detail = (detailQuery.data as any)?.data as any;

  const platform: PlatformType | string = detail?.crmDetail?.crmName ?? '';
  const name: string = detail?.name ?? '';
  const configStatus: ConfigStatus = detail?.status ?? '';
  const backupStatus: BackupStatus = detail?.backupStatus ?? '';
  const schedule: ScheduleType = detail?.schedule ?? '';
  const lastBackupAt = detail?.lastBackupAt
    ? new Date(detail.lastBackupAt).toLocaleString()
    : '--';
  const dataSize = detail?.sizeInBytes
    ? `${(detail.sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
    : '--';
  const description: string = detail?.description ?? '';

  const jobsResponse = jobsQuery.data as any;
  const jobsPayload = jobsResponse?.data;
  const jobRows: BackupJobItem[] = Array.isArray(jobsPayload)
    ? jobsPayload
    : (jobsPayload?.data ?? []);
  const jobsMeta = (Array.isArray(jobsPayload) ? jobsResponse?.meta : jobsPayload?.meta)
    ?? { limit: 20, totalRecords: jobRows.length, totalPages: 1 };

  return (
    <div className='flex w-full min-w-0 flex-col gap-5'>
      {/* Header */}
      <section className='rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm'>
        <Link
          to='/backup-management'
          className='mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 -ml-2'
        >
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3.5 w-3.5'>
            <polyline points='15 18 9 12 15 6' />
          </svg>
          Back to Backups
        </Link>

        <div className='flex min-w-0 items-center gap-4'>
          {detailQuery.isLoading ? (
            <SkeletonBlock className='h-11 w-11 shrink-0 rounded-xl' />
          ) : (
            platform && <PlatformBadge platform={platform} />
          )}

          <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
            {detailQuery.isLoading ? (
              <>
                <SkeletonBlock className='h-5 w-48' />
                <SkeletonBlock className='h-3 w-64 mt-1' />
              </>
            ) : (
              <>
                <Typography as='h2' variant='pageTitle'>
                  {name || 'Backup Detail'}
                </Typography>
                {description && (
                  <p
                    title={description}
                    className='mt-0.5 truncate text-xs text-gray-400 max-w-prose cursor-default'
                  >
                    {description}
                  </p>
                )}
              </>
            )}
          </div>

          {!detailQuery.isLoading && configStatus && (
            <div className='ml-auto shrink-0'>
              <ConfigStatusBadge status={configStatus} />
            </div>
          )}
        </div>
      </section>

      {detailQuery.isError && (
        <div className='rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600'>
          Failed to load backup details. Please try again.
        </div>
      )}

      {/* Configuration Details */}
      <section className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-100 px-5 py-4'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>
            Configuration Details
          </Typography>
        </div>
        <div className='px-5'>
          <InfoRow label='Platform'>
            {detailQuery.isLoading ? (
              <SkeletonBlock className='h-4 w-24' />
            ) : (
              <Typography variant='bodySm'>{capitalize(platform) || '--'}</Typography>
            )}
          </InfoRow>
          <InfoRow label='Backup Type'>
            {detailQuery.isLoading ? (
              <SkeletonBlock className='h-5 w-20' />
            ) : schedule ? (
              <ScheduleBadge schedule={schedule} />
            ) : (
              <Typography variant='bodySm' color='muted'>--</Typography>
            )}
          </InfoRow>
          <InfoRow label='Config Status'>
            {detailQuery.isLoading ? (
              <SkeletonBlock className='h-5 w-16' />
            ) : configStatus ? (
              <ConfigStatusBadge status={configStatus} />
            ) : (
              <Typography variant='bodySm' color='muted'>--</Typography>
            )}
          </InfoRow>
          <InfoRow label='Last Backup Status'>
            {detailQuery.isLoading ? (
              <SkeletonBlock className='h-5 w-20' />
            ) : backupStatus ? (
              <BackupStatusBadge status={backupStatus} />
            ) : (
              <Typography variant='bodySm' color='muted'>--</Typography>
            )}
          </InfoRow>
          <InfoRow label='Last Run'>
            {detailQuery.isLoading ? (
              <SkeletonBlock className='h-4 w-36' />
            ) : (
              <Typography variant='bodySm'>{lastBackupAt}</Typography>
            )}
          </InfoRow>
          <InfoRow label='Data Size'>
            {detailQuery.isLoading ? (
              <SkeletonBlock className='h-4 w-20' />
            ) : (
              <Typography variant='bodySm'>{dataSize}</Typography>
            )}
          </InfoRow>
        </div>
      </section>

      {/* Job History */}
      <section className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='flex items-center justify-between border-b border-gray-100 px-5 py-4'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>
            Job History
          </Typography>
          <button
            type='button'
            onClick={() => jobsQuery.refetch()}
            disabled={jobsQuery.isFetching}
            className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50'
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              className={['h-3.5 w-3.5', jobsQuery.isFetching ? 'animate-spin' : ''].join(' ')}
            >
              <polyline points='23 4 23 10 17 10' />
              <path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10' />
            </svg>
            {jobsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {jobsQuery.isLoading ? (
          <div className='p-8 text-center text-sm text-gray-400'>Loading jobs...</div>
        ) : jobsQuery.isError ? (
          <div className='p-8 text-center text-sm text-red-500'>Failed to load job history.</div>
        ) : jobRows.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 py-16 text-center'>
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              className='h-8 w-8 text-gray-300'
            >
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
            <Typography variant='body' color='muted'>
              No jobs found
            </Typography>
          </div>
        ) : (
          <Table
            columns={buildJobColumns((jobId) => resumeMutation.mutate(jobId), resumingJobId, jobPage, jobsMeta.limit ?? 20)}
            rows={jobRows}
            getRowKey={(row) => row.backupJobId}
            rowClassName='border-t border-gray-100'
            minWidthClassName='min-w-[1100px]'
            pagination={{
              currentPage: jobPage,
              pageSize: jobsMeta.limit ?? 20,
              totalRecords: jobsMeta.totalRecords ?? jobRows.length,
              onPageChange: (nextPage) => {
                if (nextPage <= 0 || nextPage === jobPage) return;
                // Going back: cursor already stored
                if (nextPage < jobPage) {
                  setJobPage(nextPage);
                  return;
                }
                // Going forward: only if cursor for next page is known
                if (jobCursorMap[nextPage] !== undefined) {
                  setJobPage(nextPage);
                }
              },
            }}
          />
        )}
      </section>
    </div>
  );
}
