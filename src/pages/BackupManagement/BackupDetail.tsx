import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useBackupConfigService,
  type BackupJobItem,
} from '../../services/backup-config/backup-config.service';
import Typography from '../../components/Typography';
import Table, { type TableColumn } from '../../components/Table';
import type { PlatformType } from './AddBackupModal';

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

const JOB_COLUMNS: TableColumn<BackupJobItem>[] = [
  {
    key: 'backupJobId',
    header: 'Job ID',
    render: (row) => (
      <Typography variant='bodySm' color='muted' className='font-mono'>
        {row.backupJobId}
      </Typography>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <JobStatusBadge status={row.status} />,
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
    key: 'object',
    header: 'Objects',
    className: 'text-xs text-gray-500',
    render: (row) => (row.object?.length ? `${row.object.length} object(s)` : '--'),
  },
];

export default function BackupDetail() {
  const { id } = useParams<{ id: string }>();
  const backupConfigService = useBackupConfigService();

  const [jobPage, setJobPage] = useState(1);
  const [jobCursorMap, setJobCursorMap] = useState<Record<number, string | null>>({ 1: null });
  const currentJobCursor = jobCursorMap[jobPage] ?? null;

  const detailQuery = useQuery({
    queryKey: ['backup-config-detail', id],
    queryFn: () => backupConfigService.getBackupConfig(id!),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const jobsQuery = useQuery({
    queryKey: ['backup-jobs', id, currentJobCursor],
    queryFn: () => backupConfigService.listBackupJobs(id!, true, currentJobCursor ?? undefined),
    enabled: !!id,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    onSuccess: (res: any) => {
      const nextCursor = res?.data?.meta?.nextCursor ?? null;
      if (nextCursor && !Object.values(jobCursorMap).includes(nextCursor)) {
        setJobCursorMap((prev) => ({ ...prev, [jobPage + 1]: nextCursor }));
      }
    },
  } as any);

  const detail = (detailQuery.data as any)?.data as any;

  const platform: PlatformType | string = detail?.platform ?? '';
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
  const crmId: string = detail?.crmId ?? '--';
  const backupConfigId: string = detail?.backupConfigId ?? id ?? '--';

  const jobsData = (jobsQuery.data as any)?.data;
  const jobRows: BackupJobItem[] = Array.isArray(jobsData)
    ? jobsData
    : (jobsData?.data ?? []);
  const jobsMeta = jobsData?.meta ?? { limit: 20, totalRecords: jobRows.length, totalPages: 1 };

  return (
    <div className='flex w-full min-w-0 flex-col gap-5'>
      {/* Header */}
      <section className='rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm'>
        <Link
          to='/backup-management'
          className='mb-3 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700'
        >
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3.5 w-3.5'>
            <polyline points='15 18 9 12 15 6' />
          </svg>
          Back to Backups
        </Link>

        <div className='flex items-center gap-3'>
          {detailQuery.isLoading ? (
            <SkeletonBlock className='h-10 w-10 rounded-lg' />
          ) : (
            platform && <PlatformBadge platform={platform} />
          )}

          <div className='flex min-w-0 flex-col gap-1'>
            {detailQuery.isLoading ? (
              <>
                <SkeletonBlock className='h-5 w-48' />
                <SkeletonBlock className='h-3 w-32' />
              </>
            ) : (
              <>
                <Typography as='h2' variant='pageTitle'>
                  {name || 'Backup Detail'}
                </Typography>
                <Typography variant='bodySm' color='muted'>
                  ID: {backupConfigId}
                </Typography>
              </>
            )}
          </div>

          {!detailQuery.isLoading && configStatus && (
            <div className='ml-auto'>
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
              <Typography variant='bodySm'>{platform || '--'}</Typography>
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
          <InfoRow label='CRM ID'>
            {detailQuery.isLoading ? (
              <SkeletonBlock className='h-4 w-40' />
            ) : (
              <Typography variant='bodySm' color='muted'>{crmId}</Typography>
            )}
          </InfoRow>
        </div>
      </section>

      {/* Job History */}
      <section className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-100 px-5 py-4'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>
            Job History
          </Typography>
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
            columns={JOB_COLUMNS}
            rows={jobRows}
            getRowKey={(row) => row.backupJobId}
            rowClassName='border-t border-gray-100'
            minWidthClassName='min-w-[800px]'
            pagination={{
              currentPage: jobPage,
              pageSize: jobsMeta.limit ?? 20,
              totalRecords: jobsMeta.totalRecords ?? jobRows.length,
              onPageChange: (nextPage) => {
                if (nextPage <= 0 || nextPage === jobPage) return;
                const nextCursor = jobCursorMap[nextPage];
                if (nextCursor !== undefined) {
                  setJobPage(nextPage);
                  return;
                }
                const foundNext = jobsMeta.nextCursor;
                if (foundNext && nextPage === jobPage + 1) {
                  setJobCursorMap((prev) => ({ ...prev, [nextPage]: foundNext }));
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
