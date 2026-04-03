import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Table, { type TableColumn } from '../../components/Table';
import Typography from '../../components/Typography';
import Button from '../../components/Button';
import { useBackupConfigService, type BackupJobItem, type BackupJobListApiResponse } from '../../services/backup-config/backup-config.service';
import type { ApiResponse } from '../../services/api';

type BackupJobRow = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string;
  dataSize: string;
  message: string;
};

export default function BackupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();

  const jobQuery = useQuery<ApiResponse<BackupJobListApiResponse>>({
    queryKey: ['backup-config-jobs', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing backup config id');
      }
      return backupConfigService.listBackupJobs(id);
    },
    enabled: Boolean(id),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const jobs = useMemo(() => {
    const jobList = jobQuery.data?.data?.data;
    if (!jobList || !Array.isArray(jobList)) {
      return [] as BackupJobRow[];
    }

    return jobList.map((job: BackupJobItem) => ({
      id: job.jobId,
      status: job.status,
      startedAt: job.startedAt ? new Date(job.startedAt).toLocaleString() : '--',
      completedAt: job.completedAt ? new Date(job.completedAt).toLocaleString() : '--',
      dataSize: job.sizeInBytes ? `${(job.sizeInBytes / (1024 * 1024)).toFixed(2)} MB` : '--',
      message: job.message ?? '--',
    }));
  }, [jobQuery.data]);

  const columns: TableColumn<BackupJobRow>[] = [
    { key: 'id', header: 'Job ID', render: (row) => <span className='font-medium'>{row.id}</span> },
    { key: 'status', header: 'Status', render: (row) => <span>{row.status}</span> },
    { key: 'startedAt', header: 'Started At', render: (row) => <span>{row.startedAt}</span> },
    { key: 'completedAt', header: 'Completed At', render: (row) => <span>{row.completedAt}</span> },
    { key: 'dataSize', header: 'Data Size', render: (row) => <span>{row.dataSize}</span> },
    { key: 'message', header: 'Message', render: (row) => <span>{row.message}</span> },
  ];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <Typography as='h2' variant='pageTitle'>Backup Detail</Typography>
          <Typography className='mt-1' variant='body' color='muted'>
            {id ? `Config ID: ${id}` : 'No backup config specified'}
          </Typography>
        </div>

        <div className='flex gap-2'>
          <Button variant='ghost' onClick={() => navigate(-1)}>
            Back
          </Button>
          <Link to='/backup-management'>
            <Button variant='outline'>All Backups</Button>
          </Link>
        </div>
      </div>

      {jobQuery.isLoading ? (
        <div className='p-8 text-center text-gray-500'>Loading backup jobs...</div>
      ) : jobQuery.isError ? (
        <div className='p-8 text-center text-red-500'>Failed to load backup jobs.</div>
      ) : (
        <Table
          columns={columns}
          rows={jobs}
          getRowKey={(row) => row.id}
          rowClassName='border-t border-gray-100'
          minWidthClassName='min-w-[920px]'
          emptyState='No jobs found for this backup config.'
        />
      )}
    </div>
  );
}
