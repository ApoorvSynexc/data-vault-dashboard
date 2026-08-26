import { useHttpRequest } from '../../hooks/useHttpRequest';

export type CreateBackupPayload = Record<string, unknown>;

export const BACKUP_CONFIG_ENDPOINTS = {
  create: '/v1/backup-config',
  list: '/v1/backup-config/list',
  detail: '/v1/backup-config',
  update: '/v1/backup-config',
  delete: '/v1/backup-config',
  objectCountList: '/v1/backup-config/objects-count',
  jobs: '/v1/backup-job/list',
  resume: '/v1/backup-job/resume',
  stats: '/v1/backup-config/stats',
  processBackup: '/v1/backup-config/initalize-payload-transform',
  syncSchema: '/v1/backup-config/sync-metadata',
  recoverTrigger: '/v1/backup-config/trigger/recover',
  runNow: '/v1/backup-config/run-now',
} as const;

// Informational marker the backend attaches when a manual Run Now causes the
// next automatically-scheduled run to be skipped (so it isn't run twice).
export type IUpcomingJob = {
  skip: boolean;
  skipReason?: string;
  skipDateTime?: string;
};

type BackupConfigItem = {
  backupConfigId: string;
  slug: string;
  crmId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | string;
  schedule?: 'SCHEDULE' | 'REALTIME' | string;
  backupStatus?: 'SUCCESS' | 'FAILED' | 'RUNNING' | string;
  lastBackupAt?: string;
  sizeInBytes?: number;
  platform?: string;
  destinationId?: string;
  crm?: { name: string; crmName: string };
  destination?: { name: string; type: string };
  upcomingJob?: IUpcomingJob;
  [key: string]: unknown;
};

export type BackupConfigDetail = BackupConfigItem;

type BackupConfigDetailApiResponse = {
  success: boolean;
  message: string;
  data: BackupConfigDetail;
};

type BackupConfigListApiResponse = {
  success: boolean;
  message: string;
  data: BackupConfigItem[];
  meta: {
    limit: number;
    nextCursor: string | null;
    totalRecords: number;
    totalPages: number;
  };
};

type ObjectListApiResponse = {
  success: boolean;
  objects: Record<string, unknown>[];
  message: string | null;
};

export type BackupJobObject = {
  bulkJobId: string;
  name: string;
  status: string;
  totalRecordCount: number;
  completedRecordCount?: number;
  insertCount?: number;
  deletedSuccessRecordCount?: number;
  deletedfailedRecordCount?: number;
  sizeInBytes?: number;
  condition?: { type: string };
  field?: unknown[]; 
};

export type BackupJobItem = {
  backupJobId: string;
  backupConfigId: string;
  userId: string;
  jobType: 'BULK' | 'REALTIME' | string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | string;
  startedAt?: string;
  completedAt?: string;
  lastUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  destination?: { type: string };
  errorMessage?: string;
  // BULK-specific
  object?: BackupJobObject[];
  // REALTIME-specific
  objectApiName?: string;
  operation?: string;
  recordCount?: number;
  sizeInBytes?: number;
  schemaChanged?: boolean;
  s3Path?: string;
};

export type BackupJobListApiResponse = {
  success: boolean;
  message: string;
  data: BackupJobItem[];
  meta: {
    limit: number;
    nextCursor: string | null;
    totalRecords: number;
    totalPages: number;
  };
};

export type BackupJobStat = {
  count?: number;
  total?: number;
  value?: number;
  [key: string]: unknown;
};

export type BackupStatsApiResponse = {
  success: boolean;
  message?: string;
  data: {
    completedJobs: number | BackupJobStat;
    runningJobs: number | BackupJobStat;
    failedJobs: number | BackupJobStat;
    dataProcessed: {
      bytes: number;
      weeklyChangePercent: number;
    };
  };
};

export function useBackupConfigService() {
  const api = useHttpRequest();

  return {
    createBackupConfig: (payload: CreateBackupPayload) =>
      api.post<void>(BACKUP_CONFIG_ENDPOINTS.create, payload),
    listBackupConfigs: async (pagination = true, cursor?: string, search?: string, status?: string, schedule?: string, backupStatus?: string) => {
      const response = await api.get<BackupConfigListApiResponse>(BACKUP_CONFIG_ENDPOINTS.list, {
        query: {
          pagination,
          cursor,
          limit: 25,
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(schedule ? { schedule } : {}),
          ...(backupStatus ? { backupStatus } : {}),
        },
      });

      return response;
    },
    getObjectCountList: async (crmId: string, objectApiNames: string[]) => {
      const response = await api.post<ObjectListApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectCountList, {
        crmId,
        items: objectApiNames.map((apiName) => ({ apiName })),
      });

      return response;
    },

    getBackupConfig: async (slug: string) => {
      const response = await api.get<BackupConfigDetailApiResponse>(BACKUP_CONFIG_ENDPOINTS.detail, {
        query: { slug },
      });
      return response;
    },
    updateBackupConfig: (backupConfigId: string, payload: Record<string, unknown>) =>
      api.put<void>(BACKUP_CONFIG_ENDPOINTS.update, payload, { query: { backupConfigId } }),
    listBackupJobs: async (slug: string, pagination = true, cursor?: string, limit = 20, status?: string, startDate?: string, endDate?: string) => {
      const query: any = { slug, pagination, cursor, limit };
      if (status) query.status = status.toUpperCase();
      if (startDate) query.startDate = startDate;
      if (endDate) query.endDate = endDate;
      const response = await api.get<BackupJobListApiResponse>(BACKUP_CONFIG_ENDPOINTS.jobs, {
        query,
      });

      return response;
    },
    resumeBackupJob: (backupJobId: string) =>
      api.get<void>(BACKUP_CONFIG_ENDPOINTS.resume, { query: { backupJobId } }),
    deleteBackupConfig: (backupConfigId: string) =>
      api.delete<void>(BACKUP_CONFIG_ENDPOINTS.delete, { query: { backupConfigId } }),
    getStats: (slug?: string) => {
      const query = slug ? { slug } : {};
      return api.get<BackupStatsApiResponse>(BACKUP_CONFIG_ENDPOINTS.stats, { query });
    },
    getDashboardOverview: () =>
      api.get<any>('/v1/dashboard/overview'),
    getLastJobs: () =>
      api.get<any>('/v1/dashboard/last-jobs'),
    processBackup: (slug: string) =>
      api.get<void>(BACKUP_CONFIG_ENDPOINTS.processBackup, { query: { slug } }),
    runNow: (backupConfigId: string) =>
      api.get<void>(BACKUP_CONFIG_ENDPOINTS.runNow, { query: { backupConfigId } }),
    syncSchema: (slug: string) =>
      api.get<void>(BACKUP_CONFIG_ENDPOINTS.syncSchema, { query: { slug } }),
    getObjectRecords: (payload: { id: string; name: string; fieldNames: string[]; soql: string }) =>
      api.post<any>('/v1/archival-config/object-records', payload),
    recoverTrigger: (payload: { backupConfigId: string; objectApiName: string; recordId: string }) =>
      api.post<{ triggerName: string; status: string }>(BACKUP_CONFIG_ENDPOINTS.recoverTrigger, payload),
  };
}
