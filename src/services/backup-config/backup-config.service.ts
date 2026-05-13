import { useHttpRequest } from '../../hooks/useHttpRequest';
import type {
  CreateBackupPayload,
  DataScopeRow,
  FieldDataType,
  ObjectField,
} from '../../pages/BackupManagement/AddBackupModal/types';

export const BACKUP_CONFIG_ENDPOINTS = {
  create: '/v1/backup-config',
  list: '/v1/backup-config/list',
  detail: '/v1/backup-config',
  update: '/v1/backup-config',
  delete: '/v1/backup-config',
  objectList: '/v1/backup-config/objects',
  objectCountList: '/v1/backup-config/objects-count',
  objectFields: '/v1/backup-config/fields',
  jobs: '/v1/backup-job/list',
  resume: '/v1/backup-job/resume',
  stats: '/v1/backup-config/stats',
} as const;

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

type ObjectListApiItem = {
  label: string;
  apiName: string;
  isCustom?: boolean;
  isBackedUp?: boolean;
  schedule?: 'schedule' | 'realtime';
};

type ObjectListApiResponse = {
  success: boolean;
  objects: ObjectListApiItem[];
  message: string | null;
};

type ObjectFieldApiItem = {
  label: string;
  dataType: string;
  apiName: string;
};

type ObjectFieldApiResponse = {
  success: boolean;
  objectLabel: string;
  objectApiName: string;
  fields: ObjectFieldApiItem[];
  count: number;
};

export type BackupJobObject = {
  bulkJobId: string;
  name: string;
  status: string;
  totalRecordCount: number;
  completedRecordCount?: number;
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

const FIELD_DATA_TYPE_MAP: Record<string, FieldDataType> = {
  STRING: 'string',
  TEXTAREA: 'string',
  EMAIL: 'string',
  PHONE: 'string',
  URL: 'string',
  PICKLIST: 'string',
  MULTIPICKLIST: 'string',
  NUMBER: 'number',
  DOUBLE: 'number',
  CURRENCY: 'number',
  PERCENT: 'number',
  INT: 'number',
  INTEGER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATETIME: 'datetime',
  ID: 'id',
  REFERENCE: 'id',
};

export function useBackupConfigService() {
  const api = useHttpRequest();

  return {
    createBackupConfig: (payload: CreateBackupPayload) =>
      api.post<void>(BACKUP_CONFIG_ENDPOINTS.create, payload),
    listBackupConfigs: async (pagination = true, cursor?: string) => {
      const response = await api.get<BackupConfigListApiResponse>(BACKUP_CONFIG_ENDPOINTS.list, {
        query: { pagination, cursor, limit: 25 },
      });

      return response;
    },
    getObjectList: async (crmId: string) => {
      const response = await api.get<ObjectListApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectList, {
        query: { crmId },
      });

      if (!response.data) {
        throw new Error('Invalid response from objectList API');
      }

      return response.data.objects.map(
        (item): DataScopeRow => ({
          id: item.apiName,
          name: item.label,
          type: 'Object',
          estimatedSize: '--',
          backupMode: 'both',
          isCustom: item.isCustom ?? false,
          isBackedUp: item.isBackedUp,
          schedule: item.schedule,
        }),
      );
    },
    getObjectListPaginated: async (crmId: string, offset: number = 0, limit: number = 20) => {
      const response = await api.get<ObjectListApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectList, {
        query: { crmId },
      });

      if (!response.data) {
        throw new Error('Invalid response from objectList API');
      }

      const allObjects = response.data.objects.map(
        (item): DataScopeRow => ({
          id: item.apiName,
          name: item.label,
          type: 'Object',
          estimatedSize: '--',
          backupMode: 'both',
          isCustom: item.isCustom ?? false,
          isBackedUp: item.isBackedUp,
          schedule: item.schedule,
        }),
      );

      // Client-side pagination
      const paginatedObjects = allObjects.slice(offset, offset + limit);

      return {
        objects: paginatedObjects,
        totalRecords: allObjects.length,
      };
    },
    getObjectCountList: async (crmId: string, objectApiNames: string[]) => {
      const response = await api.post<ObjectListApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectCountList, {
        crmId,
        apiNames: objectApiNames,
      });

      return response;
    },
    getObjectFields: async (crmId: string, objectName: string) => {
      const response = await api.get<ObjectFieldApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectFields, {
        query: { crmId, objectName },
      });

      if (!response.data) {
        throw new Error('Invalid response from objectFields API');
      }

      return response.data.fields.map(
        (field): ObjectField => ({
          name: field.apiName,
          label: field.label,
          dataType: FIELD_DATA_TYPE_MAP[field.dataType.toUpperCase()] ?? 'string',
        }),
      );
    },
    getBackupConfig: async (slug: string) => {
      const response = await api.get<BackupConfigDetailApiResponse>(BACKUP_CONFIG_ENDPOINTS.detail, {
        query: { slug },
      });
      return response;
    },
    updateBackupConfig: (backupConfigId: string, payload: Record<string, unknown>) =>
      api.put<void>(BACKUP_CONFIG_ENDPOINTS.update, payload, { query: { backupConfigId } }),
    listBackupJobs: async (slug: string, pagination = true, cursor?: string, limit = 20, status?: string) => {
      const query: any = { slug, pagination, cursor, limit };
      if (status) {
        query.status = status.toUpperCase();
      }
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
  };
}
